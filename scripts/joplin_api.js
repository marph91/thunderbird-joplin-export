const browserWrapper = require("./browser_wrapper");

async function generateUrl(path, query = []) {
  // Create a valid URL to access the Joplin API.
  // I. e. add base URL and token.
  const { joplinScheme, joplinHost, joplinPort, joplinToken } =
    await browserWrapper.getSettings([
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
  generateUrl,
};
