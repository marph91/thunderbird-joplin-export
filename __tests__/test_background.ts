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
console.error = <jest.Mock>jest.fn();

beforeAll(() => {
  // https://nodejs.org/api/http.html#httpcreateserveroptions-requestlistener
  server = app.listen(41142);
  app.use(express.json()); // allow easy access of request.body

  // TODO: How to flexibly assign and delete routes/middlewares?
  // https://stackoverflow.com/a/28369539/7410886
  app.use((req, res, next) => {
    requests.push(req);

    if (req.query.token !== "validToken") {
      // TODO
      res.status(401).send();
    }

    let returnData: any;
    switch (req.path) {
      case "/notes":
        // console.log(req.body);
        returnData = { items: [] };
        break;
      case "/search":
        // console.log(req.query);
        returnData = { items: [] };
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
  });

  test("invalid API token", async () => {
    await browser.storage.local.set({ joplinToken: "invalidToken" });
    browser.messageDisplay.getDisplayedMessages.mockResolvedValueOnce([
      { id: 0 },
    ]);
    await handleJoplinButton({ id: 0 }, {});

    // @ts-ignore
    expect(console.error.mock.calls.length).toBe(1);
    // @ts-ignore
    expect(console.error.mock.calls[0][0]).toMatch(/^Failed to create note:/);
    expect(browser.browserAction.icon).toBe("../images/logo_96_red.png");
  });

  test("Correct icon color", async () => {
    browser.messageDisplay.getDisplayedMessages.mockImplementationOnce(
      async () => {
        // red during processing
        expect(browser.browserAction.icon).toBe("../images/logo_96_red.png");
        return [];
      }
    );
    await handleJoplinButton({ id: 0 }, {});
    // blue when finished successfully
    expect(browser.browserAction.icon).toBe("../images/logo_96_blue.png");
  });
});

describe("process mail", () => {
  test("empty header", async () => {
    const result = await processMail(undefined);
    expect(result).toBe("Mail header is empty");
  });

  test("undefined body", async () => {
    browser.messages.getFull.mockResolvedValueOnce(undefined);

    // Arbitrary id, since we mock the mail anyway.
    const result = await processMail({ id: 0 });
    expect(result).toBe("Mail body is empty");
  });

  test("empty body", async () => {
    browser.messages.getFull.mockResolvedValueOnce({});

    const result = await processMail({ id: 0 });
    expect(result).toBe("Mail body is empty");
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
      // @ts-ignore
      expect(console.log.mock.calls.length).toBe(1);
      const message =
        resultFormat === "text/html"
          ? "Sending data in HTML format."
          : "Sending data in plain format.";
      // @ts-ignore
      expect(console.log.mock.calls[0][0]).toBe(message);
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
        joplinToken: "validToken",
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
    }
  );

  test("tag already existent", async () => {
    // TODO
  });

  test("too many tags existent", async () => {
    // TODO
  });
});

describe("process attachment", () => {
  // TODO
});
