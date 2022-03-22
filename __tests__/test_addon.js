const express = require("express");
const fetch = require("node-fetch");

const { browser } = require("browser");
global.browser = browser;

const { processMail } = require("../scripts/background");

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

  test("setting html, html body available", async () => {
    const subject = "test subject";
    const author = "test author";
    const body = "test body html";

    // TODO: test all permutations, i. e.:
    // - format preference: HTML/plain
    // - HTML available: y/n
    // - Plain available: y/n
    await browser.storage.local.set({ joplinNoteFormat: "text/html" });

    // TODO: How to flexibly assign and delete routes/middlewares?
    // https://stackoverflow.com/a/28369539/7410886
    app.use((req, res, next) => {
      requests.push(req);
      res.status(200).send(JSON.stringify({}));
    });

    // TODO: test this and other permutations
    browser.messages.getFull.mockResolvedValue({
      parts: [
        {
          contentType: "text/html",
          body: body,
          parts: [],
        },
        {
          contentType: "text/plain",
          body: "",
          parts: [],
        },
      ],
    });

    const result = await processMail({
      id: 0,
      subject: subject,
      author: author,
    });

    expect(result).toBe(null);
    expect(requests.length).toBe(1);
    expect(requests[0].method).toBe("POST");
    expect(requests[0].url).toBe(
      `/notes?fields=id,body&token=${browser.storage.local.data.joplinToken}`
    );
    expect(requests[0].body).toEqual({
      body_html: body,
      parent_id: "",
      title: `${subject} from ${author}`,
    });

    // Finally check the console output.
    expect(console.log.mock.calls.length).toBe(1);
    expect(console.log.mock.calls[0][0]).toBe("Sending data in HTML format.");
  });
});

describe("process tag", () => {
  // TODO
});

describe("process attachment", () => {
  // TODO
});
