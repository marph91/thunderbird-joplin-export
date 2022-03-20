const http = require("http");

const browserWrapper = require("../scripts/browser_wrapper");

const { processMail } = require("../scripts/process_mail");

// Mock all browser access, since we aren't in the frontend.
jest.mock("../scripts/browser_wrapper");

// Simple test server. Will receive the request that should go to Joplin.
let server = null;

beforeAll(() => {
  // https://nodejs.org/api/http.html#httpcreateserveroptions-requestlistener
  server = http.createServer().listen(41142);
});

afterAll((done) => {
  server.close(() => {
    done();
  });
});

describe("server", () => {
  test("is working", (done) => {
    const requestListener = function (req, res) {
      expect(req.method).toBe("GET");
      expect(req.url).toBe("/");

      res.setHeader("Content-Type", "application/json");
      res.writeHead(200);
      res.end(`{"message": "Server working"}`);
    };

    server.on("request", requestListener);

    http.get({ host: "127.0.0.1", port: 41142 }, function (res) {
      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toBe("application/json");
      // Parsing the message body is too complex for the simple test.

      // https://stackoverflow.com/a/71247416/7410886
      done();
    });
  });
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
    // TODO: test this and other permutations
  });
});

describe("process tag", () => {
  // TODO
});

describe("process attachment", () => {
  // TODO
});
