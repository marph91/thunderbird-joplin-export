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
    icon: <string | undefined>undefined,
    setIcon: (icon: { path: string }) => {
      browser.browserAction.icon = icon.path;
    },
  },
  mailTabs: {
    getSelectedMessages: jest.fn(
      async (_tabId) => <any>{ messages: [], id: undefined }
    ),
  },
  menus: {
    create: jest.fn(),
    onClicked: { addListener: jest.fn() },
  },
  messageDisplay: {
    getDisplayedMessage: jest.fn(),
    getDisplayedMessages: jest.fn(async (_tabId) => <Array<any>>[]),
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
    listTags: jest.fn(async () => {
      return [{ key: "$label1", tag: "Important" }];
    }),
    listAttachments: jest.fn(),
    getAttachmentFile: jest.fn(),
  },
  // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/notifications/create
  notifications: {
    icon: <string | undefined>undefined,
    title: <string | undefined>undefined,
    message: <string | undefined>undefined,
    create: (options: { iconUrl: string; title: string; message: string }) => {
      browser.notifications.icon = options.iconUrl;
      browser.notifications.title = options.title;
      browser.notifications.message = options.message;
    },
  },
  scripting: { messageDisplay: { registerScripts: jest.fn() } },
  tabs: {
    // https://webextension-api.thunderbird.net/en/stable/tabs.html#get-tabid
    get: jest.fn(async (_tabId) => <any>{ type: "mail" }),
    // https://webextension-api.thunderbird.net/en/stable/tabs.html#sendmessage-tabid-message-options
    sendMessage: jest.fn(async (_tabId, _message) => ""),
  },
};

export const messenger = {
  commands: {
    onCommand: {
      addListener: jest.fn(),
    },
  },
  messages: {
    continueList: jest.fn(async (_id) => <any>{ messages: [], id: undefined }),
  },
  scripting: { executeScript: jest.fn() },
  tabs: {
    query: jest.fn(),
  },
};
