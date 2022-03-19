# Joplin Export Thunderbird Addon

Easily export your thunderbird emails to Joplin.

## Features

- Export a single or multiple emails to Joplin.
- Add tags and attachments from the email.

## Installation

- Thunderbird addon store: TODO
- Manually import the addon:
  1. Download "joplin-export.xpi" from the github build action.
  2. Import to Thunderbird via the addon manager -> "Install Add-on From File...".

## Usage

1. Start Joplin.
2. [Enable the webclipper](https://joplinapp.org/clipper/) and copy the API token.
3. Configure the plugin. If you are using the default settings, only the API token needs to be added.
4. Select any email. The Joplin button should be at the menu.
5. Export the email by clicking the button. During the export, the icon is red. When anything is wrong, the icon stays red. After a successful export, the icon should turn blue again and the email should be in the specified Joplin notebook.

## Troubleshooting

What to do when the icon stays red?

1. Check that Joplin is running and the webclipper is enabled.
2. Check that the plugin is configured correctly. There is a status field. The status should be "working". Make sure the API token is set correctly.
3. Check the developer console. Usually it can be opened by pressing "Ctrl + Shift + I" or going to "Extras -> Developer Tools". There should be some error message.
4. If the previous steps didn't resolve the issue, you can open a github issue or email me.
