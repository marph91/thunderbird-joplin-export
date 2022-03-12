async function getSetting(name) {
  // Convenience wrapper to get a setting from local storage.
  return (await browser.storage.local.get(name))[name];
}

module.exports = {
  getSetting,
};
