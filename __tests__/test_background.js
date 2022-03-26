const express = require("express");
const fetch = require("node-fetch");

const { browser } = require("browser");
global.browser = browser;

const { processMail, handleJoplinButton } = require("../src/background");

// Replace the javascript fetch with nodejs fetch.
global.fetch = jest.fn(fetch);

// Simple test server. Will receive the request that should go to Joplin.
let app = express();
let server;
let requests;

// Capture all console log output.
console.log = jest.fn();

beforeAll(() => {
  // https://nodejs.org/api/http.html#httpcreateserveroptions-requestlistener
  server = app.listen(41142);
  app.use(express.json()); // allow easy access of request.body
});

beforeEach(() => {
  jest.clearAllMocks();

  // Set local storage to mostly default values.
  browser.storage.local.data = {
    joplinScheme: "http",
    joplinHost: "127.0.0.1",
    joplinPort: 41142,
    joplinToken: "xyz",

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

    expect(handleJoplinButton()).rejects.toThrow(
      "API token not set. Please specify it at the settings."
    );
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
    await handleJoplinButton({ id: 0 });
    // blue when finished successfully
    expect(browser.browserAction.icon).toBe("../images/logo_96_blue.png");
  });
});

describe("process mail", () => {
  test("empty header", async () => {
    const result = await processMail();
    expect(result).toBe("Mail header is empty");
  });

  test("undefined body", async () => {
    browser.messages.getFull.mockResolvedValue(undefined);

    // Arbitrary id, since we mock the mail anyway.
    const result = await processMail({ id: 0 });
    expect(result).toBe("Mail body is empty");
  });

  test("empty body", async () => {
    browser.messages.getFull.mockResolvedValue({});

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

      // TODO: How to flexibly assign and delete routes/middlewares?
      // https://stackoverflow.com/a/28369539/7410886
      app.use((req, res, next) => {
        requests.push(req);
        res.status(200).send(JSON.stringify({}));
      });

      browser.messages.getFull.mockResolvedValue({
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
      expect(console.log.mock.calls.length).toBe(1);
      const message =
        resultFormat === "text/html"
          ? "Sending data in HTML format."
          : "Sending data in plain format.";
      expect(console.log.mock.calls[0][0]).toBe(message);
    }
  );
});

describe("process tag", () => {
  // TODO
});

describe("process attachment", () => {
  // TODO
});
