const fs = require("fs");
const path = require("path");
const html = fs.readFileSync(path.resolve(__dirname, "../dist/options.html"));

const { browser } = require("browser");

const { JSDOM } = require("jsdom");

jest.dontMock("fs");

let dom;

describe("options", function () {
  beforeAll((done) => {
    dom = new JSDOM(html.toString(), {
      runScripts: "dangerously",
      resources: "usable",
      // https://github.com/jsdom/jsdom/issues/3023#issuecomment-883585057
      url: `file://${__dirname}/../dist/options.html`,
    });
    global.browser = browser;
    dom.window.browser = browser;

    // Wait until the dom isready.
    dom.window.document.addEventListener("DOMContentLoaded", () => {
      done();
    });
  });

  afterEach(() => {
    // restore the original func after test
    jest.resetModules();
  });

  test("settings exist", () => {
    const setting_ids = [
      "joplinScheme",
      "joplinHost",
      "joplinPort",
      "joplinToken",
      "joplinNoteFormat",
      "joplinAttachments",
      "joplinNoteTags",
      "joplinNoteTagsFromEmail",
    ];
    for (const id of setting_ids) {
      expect(dom.window.document.getElementById(id)).toBeTruthy();
    }
  });

  test("local cache init", () => {
    const setting_ids = [
      "joplinScheme",
      "joplinHost",
      "joplinPort",
      "joplinToken",
      "joplinNoteFormat",
      "joplinAttachments",
      "joplinNoteTags",
      "joplinNoteTagsFromEmail",
    ];
    expect(Object.keys(browser.storage.local.data)).toEqual(setting_ids);
  });

  test("save button", async () => {
    const saveButton = dom.window.document.getElementById("btnSave");
    await saveButton.dispatchEvent(new dom.window.MouseEvent("click"));
  });
});
