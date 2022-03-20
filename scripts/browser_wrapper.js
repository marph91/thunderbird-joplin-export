// Wraps all browser interaction. Mostly for allowing automated testing. Partially for conveniance.

async function getSetting(name) {
  // Convenience wrapper to get a setting from local storage.
  return (await browser.storage.local.get(name))[name];
}

async function getSettings(names) {
  // Convenience wrapper to get a setting from local storage.
  return await browser.storage.local.get(names);
}

async function setSetting(setting, value) {
  await browser.storage.local.set({ [setting]: value });
}

function setIcon(path) {
  // https://webextension-api.thunderbird.net/en/latest/messageDisplayAction.html#seticon-details
  browser.browserAction.setIcon({ path: path });
}

async function listMails(tabId) {
  return await browser.messageDisplay.getDisplayedMessages(tabId);
}

async function getMail(headerId) {
  return await browser.messages.getFull(headerId);
}

async function listAttachments(headerId) {
  return await browser.messages.listAttachments(headerId);
}

async function getAttachment(headerId, partName) {
  return await browser.messages.getAttachmentFile(headerId, partName);
}

module.exports = {
  getSetting,
  getSettings,
  setSetting,
  setIcon,
  getMail,
  listMails,
  listAttachments,
  getAttachment,
};
