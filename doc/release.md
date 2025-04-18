# How to do a release

1. Increment the version at [`manifest.json`](../manifest.json).
2. Build the add-on manually via [`build_xpi.sh`](../build_xpi.sh)
3. Test it (see section below).
4. Push the changes.
5. Add the changes at the changelog in the readme.
6. Create and push the tag: `git tag vX.Y.Z && git push origin vX.Y.Z`
7. Submit the add-on at <https://addons.thunderbird.net/de/developers/addon/joplin-export/versions/submit/>.

NB: [List of valid Thunderbird versions](https://addons.thunderbird.net/en-US/thunderbird/pages/appversions/)

## How to test a release

The automated tests should be successful. Additionally, the following cases should be tested manually:

Export via:

- Menu button
- Context menu
- Hotkey

Tabs/windows:

- Mail tab with mail body
- Mail tab without mail body
- Mail in a separate tab
- Mail in a separate window
