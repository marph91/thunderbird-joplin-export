# Joplin Export Thunderbird Addon

Easily export your thunderbird emails to Joplin.

[![build](https://github.com/marph91/thunderbird-joplin-export/actions/workflows/build.yml/badge.svg)](https://github.com/marph91/thunderbird-joplin-export/actions/workflows/build.yml)
[![test](https://github.com/marph91/thunderbird-joplin-export/actions/workflows/test.yml/badge.svg)](https://github.com/marph91/thunderbird-joplin-export/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/marph91/thunderbird-joplin-export/branch/master/graph/badge.svg?token=YZYEW7C1VM)](https://codecov.io/gh/marph91/thunderbird-joplin-export)

## Features

- Export a text selection, a single or multiple emails to Joplin.
- Export by clicking the button or pressing the hotkey ("Ctrl+Alt+J" by default)
- Export the email as note or todo.
- Trim the subject by regex. For example remove "Re:" or "Fwd:".
- Add tags and attachments from the email.

## Installation

- Thunderbird addon store: TODO
- Manually import the addon:
  1. Download the artifacts from the github build action: <https://github.com/marph91/thunderbird-joplin-export/actions/workflows/build.yml>.
  2. Extract the archive and look for "joplin-export.xpi".
  3. Import to Thunderbird via the addon manager -> "Install Add-on From File...".

## Usage

1. Start Joplin.
2. [Enable the webclipper](https://joplinapp.org/clipper/) and copy the API token.
3. Configure the plugin. If you are using the default settings, only the API token needs to be added.
4. Select any email. The Joplin button should be at the menu.
5. Export the email by clicking the button. During the export, the icon is red. When anything is wrong, the icon stays red. After a successful export, the icon should turn blue again and the email should be in the specified Joplin notebook.

<https://user-images.githubusercontent.com/33229141/161036197-ab8c9801-8cad-400f-a114-8315f4363af3.mp4>

## Troubleshooting

What to do when the icon stays red?

1. Check that Joplin is running and the webclipper is enabled.
2. Check that the plugin is configured correctly. There is a status field. The status should be "working". Make sure the API token is set correctly.
3. Check the developer console. Usually it can be opened by pressing "Ctrl + Shift + I" or going to "Extras -> Developer Tools". There should be some error message.
4. If the previous steps didn't resolve the issue, you can open a github issue or email me.

## Related Projects

- <https://github.com/manolitto/joplin-mail-gateway>: Add all emails of an account to Joplin.
- <https://github.com/EliasVincent/joplin-email-note>: Export notes from Joplin to your email client.
