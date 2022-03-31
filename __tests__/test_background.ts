import express from "express";
import fetch from "node-fetch";

// TODO: Navigating to __mocks__ shouldn't be needed.
import { browser } from "../__mocks__/browser";
// @ts-ignore
global.browser = browser;

import { processMail, handleJoplinButton } from "../src/background";

// Replace the javascript fetch with nodejs fetch.
// @ts-ignore
global.fetch = jest.fn(fetch);

// Simple test server. Will receive the request that should go to Joplin.
let app = express();
let server: any;
let requests: any;

// Capture all console output.
console.log = <jest.Mock>jest.fn();
console.warn = <jest.Mock>jest.fn();
console.error = <jest.Mock>jest.fn();

// https://dev.to/chrismilson/zip-iterator-in-typescript-ldm
type Iterableify<T> = { [K in keyof T]: Iterable<T[K]> };
function* zip<T extends Array<any>>(...toZip: Iterableify<T>): Generator<T> {
  // Get iterators for all of the iterables.
  const iterators = toZip.map((i) => i[Symbol.iterator]());

  while (true) {
    // Advance all of the iterators.
    const results = iterators.map((i) => i.next());

    // If any of the iterators are done, we should stop.
    if (results.some(({ done }) => done)) {
      break;
    }

    // We can assert the yield type, since we know none
    // of the iterators are done.
    yield results.map(({ value }) => value) as T;
  }
}

const expectConsole = (expected: { [Key: string]: Array<string> | number }) => {
  // Check whether the console output is as expected.

  for (const [method, lengthOrContent] of Object.entries(expected)) {
    // @ts-ignore
    const actual = <Array<Array<String>>>console[method].mock.calls;
    if (typeof lengthOrContent === "number") {
      // Only check number of calls.
      expect(actual.length).toBe(lengthOrContent);
    } else {
      // Check content of calls.
      for (const [actualOutput, expectedOutput] of zip(
        actual,
        lengthOrContent
      )) {
        expect(actualOutput[0]).toBe(expectedOutput);
      }
    }
  }
};

beforeAll(() => {
  // https://nodejs.org/api/http.html#httpcreateserveroptions-requestlistener
  server = app.listen(41142);
  app.use(express.json()); // allow easy access of request.body

  // TODO: How to flexibly assign and delete routes/middlewares?
  // https://stackoverflow.com/a/28369539/7410886
  app.use((req, res, next) => {
    requests.push(req);

    if (req.query.token !== "validToken") {
      res.status(401).send("Invalid token");
    }

    let returnData: any;
    switch (req.path) {
      case "/notes":
        // console.log(req.body);
        returnData = { items: [] };
        break;
      case "/resources":
        returnData = { items: [] };
        break;
      case "/search":
        if (req.query.type === "tag") {
          switch (req.query.query) {
            case "existentTag":
              returnData = { items: [{ id: "arbitraryId" }] };
              break;
            case "multipleTags":
              returnData = {
                items: [
                  { id: "arbitraryId1", title: "a" },
                  { id: "arbitraryId2", title: "b" },
                ],
              };
              break;
            default:
              returnData = { items: [] };
          }
        }
        break;
      case "/tags":
        // console.log(req.body);
        returnData = { items: [] };
        break;
      default:
      //console.log(req.path);
    }

    res.status(200).send(JSON.stringify(returnData));
  });
});

beforeEach(() => {
  jest.clearAllMocks();

  // Set local storage to mostly default values.
  browser.storage.local.data = {
    joplinScheme: "http",
    joplinHost: "127.0.0.1",
    joplinPort: 41142,
    joplinToken: "validToken",

    joplinNoteParentFolder: "arbitrary folder",
    joplinNoteFormat: "text/html",
    // Try to keep the tests minimal.
    joplinNoteTags: "",
    joplinNoteTagsFromEmail: false,
    joplinAttachments: "ignore",
  };
  requests = [];
});

afterAll(() => {
  server.close();
});

describe("handle button", () => {
  test("API token not set", async () => {
    await browser.storage.local.set({ joplinToken: undefined });

    expect(handleJoplinButton({ id: 0 }, {})).rejects.toThrow(
      "API token not set. Please specify it at the settings."
    );
    expect(browser.browserAction.icon).toBe("../images/logo_96_red.png");

    expectConsole({
      log: 0,
      warn: 0,
      error: 0,
    });
  });

  test("invalid API token", async () => {
    await browser.storage.local.set({ joplinToken: "invalidToken" });
    browser.messageDisplay.getDisplayedMessages.mockResolvedValueOnce([
      { id: 0 },
    ]);
    await handleJoplinButton({ id: 0 }, {});

    expect(browser.browserAction.icon).toBe("../images/logo_96_red.png");

    expectConsole({
      log: 1,
      warn: 0,
      error: ["Failed to create note: Invalid token"],
    });
  });

  test("Correct icon color", async () => {
    browser.messageDisplay.getDisplayedMessages.mockImplementationOnce(
      async () => {
        // red during processing
        expect(browser.browserAction.icon).toBe("../images/logo_96_red.png");
        return [{ id: 0 }];
      }
    );
    await handleJoplinButton({ id: 0 }, {});

    // blue when finished successfully
    expect(browser.browserAction.icon).toBe("../images/logo_96_blue.png");

    expectConsole({
      log: 1,
      warn: 0,
      error: 0,
    });
  });
});

describe("process mail", () => {
  test("empty header", async () => {
    const result = await processMail(undefined);
    expect(result).toBe("Mail header is empty");

    expectConsole({
      log: 0,
      warn: 0,
      error: 0,
    });
  });

  test("undefined body", async () => {
    browser.messages.getFull.mockResolvedValueOnce(undefined);

    // Arbitrary id, since we mock the mail anyway.
    const result = await processMail({ id: 0 });
    expect(result).toBe("Mail body is empty");

    expectConsole({
      log: 0,
      warn: 0,
      error: 0,
    });
  });

  test("empty body", async () => {
    browser.messages.getFull.mockResolvedValueOnce({});

    const result = await processMail({ id: 0 });
    expect(result).toBe("Mail body is empty");

    expectConsole({
      log: 0,
      warn: 0,
      error: 0,
    });
  });

  test.each`
    preferredFormat | htmlAvailable | plainAvailable | resultFormat
    ${"text/html"}  | ${false}      | ${false}       | ${null}
    ${"text/html"}  | ${false}      | ${true}        | ${"text/plain"}
    ${"text/html"}  | ${true}       | ${false}       | ${"text/html"}
    ${"text/html"}  | ${true}       | ${true}        | ${"text/html"}
    ${"text/plain"} | ${false}      | ${false}       | ${null}
    ${"text/plain"} | ${false}      | ${true}        | ${"text/plain"}
    ${"text/plain"} | ${true}       | ${false}       | ${"text/html"}
    ${"text/plain"} | ${true}       | ${true}        | ${"text/plain"}
  `(
    "preferred: $preferredFormat | available: html: $htmlAvailable, plain: $plainAvailable | result: $resultFormat",
    async ({
      preferredFormat,
      htmlAvailable,
      plainAvailable,
      resultFormat,
    }) => {
      const subject = "test subject";
      const author = "test author";
      const body = "test body";

      await browser.storage.local.set({ joplinNoteFormat: preferredFormat });

      browser.messages.getFull.mockResolvedValueOnce({
        parts: [
          {
            contentType: "text/html",
            body: htmlAvailable ? body : "",
            parts: [],
          },
          {
            contentType: "text/plain",
            body: plainAvailable ? body : "",
            parts: [],
          },
        ],
      });

      const result = await processMail({
        id: 0,
        subject: subject,
        author: author,
      });

      if (!resultFormat) {
        expect(result).toBe("Mail body is empty");
        return;
      }

      expect(result).toBe(null);
      expect(requests.length).toBe(1);
      expect(requests[0].method).toBe("POST");
      expect(requests[0].url).toBe(
        `/notes?fields=id,body&token=${browser.storage.local.data.joplinToken}`
      );
      const expectedKey = resultFormat === "text/html" ? "body_html" : "body";
      expect(requests[0].body).toEqual({
        [expectedKey]: body,
        parent_id: browser.storage.local.data.joplinNoteParentFolder,
        title: `${subject} from ${author}`,
      });

      // Finally check the console output.
      const message =
        resultFormat === "text/html"
          ? "Sending data in HTML format."
          : "Sending data in plain format.";
      expectConsole({
        log: [message],
        warn: 0,
        error: 0,
      });
    }
  );
});

describe("process tag", () => {
  test.each`
    emailTags       | includeEmailTags | customTags
    ${[]}           | ${false}         | ${""}
    ${[]}           | ${false}         | ${"customTag"}
    ${[]}           | ${true}          | ${""}
    ${[]}           | ${true}          | ${"customTag"}
    ${["emailTag"]} | ${false}         | ${""}
    ${["emailTag"]} | ${false}         | ${"customTag"}
    ${["emailTag"]} | ${true}          | ${""}
    ${["emailTag"]} | ${true}          | ${"customTag"}
  `(
    "emailTags: $emailTags | includeEmailTags: $includeEmailTags | customTags: $customTags",
    async ({ emailTags, includeEmailTags, customTags }) => {
      await browser.storage.local.set({
        joplinNoteTags: customTags,
        joplinNoteTagsFromEmail: includeEmailTags,
      });

      const result = await processMail({ id: 0, tags: emailTags });
      expect(result).toBe(null);

      // 1 request to create the note.
      // 3 requests per tag: get tags, create tag, attach tag to note
      expect(requests.length).toBe(
        1 +
          3 * Number(customTags != "") +
          3 * Number(includeEmailTags && emailTags.length > 0)
      );

      expectConsole({
        log: 1,
        warn: 0,
        error: 0,
      });
    }
  );

  test("tag already existent", async () => {
    await browser.storage.local.set({ joplinNoteTags: "existentTag" });

    const result = await processMail({ id: 0, tags: [] });
    expect(result).toBe(null);

    // 1 request to create the note.
    // 1 request for searching the tag.
    // 1 request for attaching the tag to the note.
    expect(requests.length).toBe(3);

    expectConsole({
      log: 1,
      warn: 0,
      error: 0,
    });
  });

  test("too many tags existent", async () => {
    await browser.storage.local.set({ joplinNoteTags: "multipleTags" });

    const result = await processMail({ id: 0, tags: [] });
    expect(result).toBe(null);

    // 1 request to create the note.
    // 1 request for searching the tag.
    expect(requests.length).toBe(2);

    expectConsole({
      log: 1,
      warn: ['Too many matching tags for "multipleTags": a, b'],
      error: 0,
    });
  });
});

describe("process attachment", () => {
  beforeAll(() => {
    // FormData is not available: https://stackoverflow.com/a/59726560/7410886
    // It works, but not sure how to resolve the typescript issues.
    function FormDataMock() {
      // @ts-ignore
      this.append = jest.fn();
    }
    // @ts-ignore
    global.FormData = FormDataMock;
  });

  test.each`
    attachments | handleAttachments
    ${[]}       | ${"attach"}
    ${[]}       | ${"ignore"}
    ${["foo"]}  | ${"attach"}
    ${["foo"]}  | ${"ignore"}
  `(
    "attachments: $attachments | handleAttachments: $handleAttachments",
    async ({ attachments, handleAttachments }) => {
      await browser.storage.local.set({ joplinAttachments: handleAttachments });

      // Don't use once, since the functions gets only called in specific circumstances.
      browser.messages.listAttachments.mockResolvedValue(
        attachments.map((a: string) => {
          return { name: a, partName: a };
        })
      );
      browser.messages.getAttachmentFile.mockResolvedValue(attachments);

      const result = await processMail({ id: 0 });
      expect(result).toBe(null);

      // 1 request to create the note.
      // 1 request for creating the attachment (= resource in joplin).
      // 1 request for attaching the resource to the note.
      expect(requests.length).toBe(
        1 + 2 * Number(handleAttachments === "attach" && attachments.length > 0)
      );

      expectConsole({
        log: 1,
        warn: 0,
        error: 0,
      });
    }
  );
});
