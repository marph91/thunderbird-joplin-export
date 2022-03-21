// Mock all browser access, since we aren't in the frontend.
const browser = {
  storage: {
    local: {
      data: {},
      get: async (nameOrNames) => {
        switch (typeof nameOrNames) {
          case "string":
            return browser.storage.local.data[nameOrNames];
          case "object":
            result = {};
            for (const name of nameOrNames) {
              result[name] = browser.storage.local.data[name];
            }
            return result;
          default:
            throw Error(`Unsupported type: ${typeof nameOrNames}.`);
        }
      },
      set: async (settings) => {
        for (const [name, value] of Object.entries(settings)) {
          browser.storage.local.data[name] = value;
        }
      },
    },
  },
  browserAction: {
    onClicked: { addListener: jest.fn() },
    icon: undefined,
    setIcon: (icon) => {
      browser.browserAction.icon = icon.path;
    },
  },
  messageDisplay: {
    getDisplayedMessages: jest.fn(),
  },
  messages: {
    getFull: jest.fn(),
    listAttachments: jest.fn(),
    getAttachmentFile: jest.fn(),
  },
};

module.exports = { browser };
