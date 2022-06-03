// TODO: Why isn't this working even when the "dom" lib is enabled in tsconfig?
declare const browser: any;

export async function generateUrl(path: string, query: Array<string> = []) {
  // Create a valid URL to access the Joplin API.
  // I. e. add base URL and token.
  const { joplinScheme, joplinHost, joplinPort, joplinToken } =
    await browser.storage.local.get([
      "joplinScheme",
      "joplinHost",
      "joplinPort",
      "joplinToken",
    ]);
  // Note: This modifies the original array, since it's passed by reference.
  query.push(`token=${joplinToken}`);
  return `${joplinScheme}://${joplinHost}:${joplinPort}/${path}?${query.join(
    "&"
  )}`;
}

export async function getSetting(name: string) {
  // Convenience wrapper to get a setting from local storage.
  // @ts-ignore
  return (await browser.storage.local.get(name))[name];
}
