import fs from "fs";
import path from "path";
const html = fs.readFileSync(path.resolve(__dirname, "../dist/options.html"));

// TODO: Navigating to __mocks__ shouldn't be needed.
import { browser, messenger } from "../__mocks__/browser";

import { JSDOM } from "jsdom";

jest.dontMock("fs");

let dom: any;
const setting_ids = [
  "joplinScheme",
  "joplinHost",
  "joplinPort",
  "joplinToken",
  "joplinShowNotifications",
  "joplinSubjectTrimRegex",
  "joplinNoteTitleTemplate",
  "joplinNoteHeaderTemplate",
  "joplinAddHeaderInfo",
  "joplinNoteFormat",
  "joplinExportAsTodo",
  "joplinAttachments",
  "joplinNoteTags",
  "joplinNoteTagsFromEmail",
];

describe("options", function () {
  beforeAll((done) => {
    dom = new JSDOM(html.toString(), {
      runScripts: "dangerously",
      resources: "usable",
      // https://github.com/jsdom/jsdom/issues/3023#issuecomment-883585057
      url: `file://${__dirname}/../dist/options.html`,
    });
    // @ts-ignore
    global.browser = browser;
    dom.window.browser = browser;
    // @ts-ignore
    global.messenger = messenger;

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
    for (const id of setting_ids) {
      expect(dom.window.document.getElementById(id)).toBeTruthy();
    }
  });

  test("local cache init", () => {
    expect(Object.keys(browser.storage.local.data)).toEqual(setting_ids);
  });

  test("save settings", async () => {
    // Modify some arbitrary settings and check if they are in the local storage after saving.
    const settings = {
      joplinScheme: "https",
      joplinToken: "abc",
      joplinAttachments: "ignore",
      joplinNoteTagsFromEmail: false,
    };

    for (const [setting_name, setting_value] of Object.entries(settings)) {
      const element = dom.window.document.getElementById(setting_name);
      if (typeof setting_value === "boolean") {
        element.checked = setting_value;
      } else {
        element.value = setting_value;
      }
    }
    const saveButton = dom.window.document.getElementById("btnSave");
    await saveButton.dispatchEvent(new dom.window.MouseEvent("click"));

    expect(browser.storage.local.data).toEqual(
      expect.objectContaining(settings)
    );
  });
});
