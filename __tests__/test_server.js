const express = require("express");
const fetch = require("node-fetch");

const browserWrapper = require("../scripts/browser_wrapper");

const { processMail } = require("../scripts/process_mail");

// Replace the javascript fetch with nodejs fetch.
global.fetch = jest.fn(fetch);

// Mock all browser access, since we aren't in the frontend.
jest.mock("../scripts/browser_wrapper");

// TODO: How to put this in a class and mock only the member functions?
let localStorage;

browserWrapper.getSetting.mockImplementation(async (name) => {
  // console.log(localStorage);
  return localStorage[name];
});
browserWrapper.getSettings.mockImplementation(async (names) => {
  let settings = {};
  for (key of names) {
    settings[key] = localStorage[key];
  }
  return settings;
});
browserWrapper.setSetting.mockImplementation(async (name, value) => {
  localStorage[name] = value;
});

// Simple test server. Will receive the request that should go to Joplin.
let app = express();
let server;
let requests;

const getJsonBody = async (request) => {
  // https://nodejs.dev/learn/get-http-request-body-data-using-nodejs
  let body = "";
  request.on("data", (data) => {
    body += data;
  });
  request.on("end", () => {
    return JSON.parse(body);
  });
};

console.log = jest.fn();

beforeAll(() => {
  // https://nodejs.org/api/http.html#httpcreateserveroptions-requestlistener
  server = app.listen(41142);
  app.use(express.json()); // allow easy access of request.body
});

beforeEach(() => {
  localStorage = {};
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
    browserWrapper.getMail.mockResolvedValue(undefined);

    // Arbitrary id, since we mock the mail anyway.
    const result = await processMail({ id: 0 });
    expect(result).toBe("Mail body is empty");
  });

  test("empty body", async () => {
    browserWrapper.getMail.mockResolvedValue({});

    const result = await processMail({ id: 0 });
    expect(result).toBe("Mail body is empty");
  });

  test("setting html, html body available", async () => {
    // TODO: test all permutations, i. e.:
    // - format preference: HTML/plain
    // - HTML available: y/n
    // - Plain available: y/n

    localStorage = {
      joplinNoteParentFolder: "arbitrary folder",
      joplinScheme: "http",
      joplinHost: "127.0.0.1",
      joplinPort: 41142,
      joplinToken: "xyz",
    };
    const subject = "test subject";
    const author = "test author";
    const body = "test body html";

    // TODO: How to flexibly assign and delete routes/middlewares?
    // https://stackoverflow.com/a/28369539/7410886
    app.use((req, res, next) => {
      requests.push(req);
      res.status(200).send(JSON.stringify({}));
    });

    // TODO: test this and other permutations
    browserWrapper.getMail.mockResolvedValue({
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
      `/notes?fields=id,body&token=${localStorage.joplinToken}`
    );
    expect(requests[0].body).toEqual({
      body_html: body,
      parent_id: localStorage.joplinNoteParentFolder,
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
