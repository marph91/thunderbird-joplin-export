# How to do a release

1. Increment the version at `manifest.json`.
2. Build the add-on manually via `build_xpi.sh` and test it.
3. Push the changes.
4. Submit the add-on at <https://addons.thunderbird.net/de/developers/addon/joplin-export/versions/submit/>.
5. Add the changes at the changelog in the readme.

NB: [List of valid Thunderbird versions](https://addons.thunderbird.net/en-US/thunderbird/pages/appversions/)

## How to test a release

The automated tests should be successful. Additionally, the following cases should be tested manually:

Export via:

- Menu button
- Context menu
- Hotkey

Tabs:

- Mail tab with mail body
- Mail tab without mail body
- Mail in a separate tab
