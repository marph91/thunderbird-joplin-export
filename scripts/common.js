async function getSetting(name) {
  // Convenience wrapper to get a setting from local storage.
  return (await browser.storage.local.get(name))[name];
}

async function generateUrl(path, query = []) {
  // Create a valid URL to access the joplin API.
  // I. e. add base URL and token.
  const scheme = await getSetting("joplinScheme");
  const host = await getSetting("joplinHost");
  const port = await getSetting("joplinPort");
  const token = await getSetting("joplinToken");
  // TODO: Does this modify the original array, like in python?
  query.push(`token=${token}`);
  return `${scheme}://${host}:${port}/${path}?${query.join("&")}`;
}

module.exports = {
  getSetting,
  generateUrl,
};
