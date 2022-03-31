// Mock all browser access, since we aren't in the frontend.

type StorageEntry = Record<string, any>;

export const browser = {
  storage: {
    local: {
      data: <StorageEntry>{},
      get: async (nameOrNames: string | Array<string>) => {
        switch (typeof nameOrNames) {
          case "string":
            return { [nameOrNames]: browser.storage.local.data[nameOrNames] };
          case "object":
            const result = <StorageEntry>{};
            for (const name of nameOrNames) {
              result[name] = browser.storage.local.data[name];
            }
            return result;
          default:
            throw Error(`Unsupported type: ${typeof nameOrNames}.`);
        }
      },
      set: async (settings: StorageEntry) => {
        for (const [name, value] of Object.entries(settings)) {
          browser.storage.local.data[name] = value;
        }
      },
    },
  },
  browserAction: {
    onClicked: { addListener: jest.fn() },
    icon: <any>undefined,
    setIcon: (icon: { path: string }) => {
      browser.browserAction.icon = icon.path;
    },
  },
  messageDisplay: {
    getDisplayedMessages: jest.fn(),
  },
  messages: {
    getFull: jest.fn(async () => {
      return <any>{
        parts: [
          {
            contentType: "text/html",
            body: "test content",
            parts: [],
          },
        ],
      };
    }),
    listAttachments: jest.fn(),
    getAttachmentFile: jest.fn(),
  },
  // Added by experiments:
  // https://webextension-api.thunderbird.net/en/91/how-to/experiments.html
  helper: { getSelectedText: jest.fn(async () => "") },
};
