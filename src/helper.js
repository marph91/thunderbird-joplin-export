// Use "var" on purpose. See:
// https://webextension-api.thunderbird.net/en/91/how-to/experiments.html?highlight=services#implementing-functions
var helper = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      helper: {
        async getSelectedText() {
          const selection = Services.wm
            .getMostRecentWindow(null)
            .document.commandDispatcher.focusedWindow.getSelection();
          // Trying to export the selected HTML yields almost always the full email:
          // const range = selection.getRangeAt(0);
          // const container = range.commonAncestorContainer;
          // return container.innerHTML;
          return selection.toString();
        },
      },
    };
  }
};
