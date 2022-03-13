async function getSetting(name) {
  // Convenience wrapper to get a setting from local storage.
  return (await browser.storage.local.get(name))[name];
}

async function generateUrl(path, query = []) {
  // Create a valid URL to access the joplin API.
  // I. e. add base URL and token.
  const { joplinScheme, joplinHost, joplinPort, joplinToken } =
    await browser.storage.local.get([
      "joplinScheme",
      "joplinHost",
      "joplinPort",
      "joplinToken",
    ]);
  // TODO: Does this modify the original array, like in python?
  query.push(`token=${joplinToken}`);
  return `${joplinScheme}://${joplinHost}:${joplinPort}/${path}?${query.join(
    "&"
  )}`;
}

module.exports = {
  getSetting,
  generateUrl,
};
