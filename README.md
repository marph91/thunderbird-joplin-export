# Joplin Export Thunderbird Addon

Easily export your Thunderbird emails to Joplin.

[![build](https://github.com/marph91/thunderbird-joplin-export/actions/workflows/build.yml/badge.svg)](https://github.com/marph91/thunderbird-joplin-export/actions/workflows/build.yml)
[![test](https://github.com/marph91/thunderbird-joplin-export/actions/workflows/test.yml/badge.svg)](https://github.com/marph91/thunderbird-joplin-export/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/marph91/thunderbird-joplin-export/branch/master/graph/badge.svg?token=YZYEW7C1VM)](https://codecov.io/gh/marph91/thunderbird-joplin-export)

## Features

- Export a text selection, a single email or multiple emails to Joplin.
- Export by clicking the button or pressing the hotkey (by default "Ctrl+Alt+J")
- Export the email as note or todo.
- Add metadata to the title and body of the note:
    - Set a template for note title and body.
    - Trim the author or subject by regex. For example, remove "Re:" or "Fwd:".
    - Include the date in a [custom format](https://moment.github.io/luxon/#/formatting?id=table-of-tokens).
    - Take a look at [this section](#include-metadata) for details.
- Add tags and attachments from the email.

## Installation

- Via [Thunderbird addon store](https://addons.thunderbird.net/en/thunderbird/addon/joplin-export/) (preferred)
- Via manual import:
    1. Download the artifacts from the [releases page](https://github.com/marph91/thunderbird-joplin-export/releases).
    2. Import to Thunderbird via the addon manager: Tools -> Add-ons -> small gear at top right -> "Install Add-on From File...".

## Usage

1. Start Joplin.
2. [Enable the webclipper](https://joplinapp.org/clipper/) and copy the API token.
3. Configure the plugin:
    1. Paste the API token to the token field.
    2. Save
    3. Refresh the available notebooks by pressing the small update button.
    4. Select a destination notebook.
    5. Save
4. Select any email. The Joplin button should be at the menu.
5. Export the email by clicking the button. If there is any problem, a notification will pop up. After a successful export, the email should be in the specified Joplin notebook.

<https://user-images.githubusercontent.com/33229141/161036197-ab8c9801-8cad-400f-a114-8315f4363af3.mp4>

### Include metadata

In this section you will find some examples how to include email metadata into note title or body. All metadata of the [mail header object](https://webextension-api.thunderbird.net/en/latest/messages.html#messages-messageheader) can be used.

By default, the note title template is `{{subject}} from {{author}}`. I. e. the `subject` and `author` keys are searched in the mail header object and inserted into the template if found. Since the subject contains often strings like `Re:` or `Fwd:`, these can be removed by defining a regex. The setting is called "Trim subject". For me, the regex `^(((Re|Fw|Fwd):|(\[.*\])) ?)*` works best.

It is also possible to insert some metadata at the top of the note body. This can be done by defining a template in the "Note header" setting. The template should be specified in markdown syntax. Words surrounded by double curly brackets will be attempted to be replaced by the corresponding metadata, as done in the note title.

The following two code snippets show examples of what the templates might look like.

Plain text with closing separation line:

```text
From: {{author}}
Subject: {{subject}}
Date: {{date}}
To: {{recipients}}

---

```

Table with closing separation line:

```text
|         |                |
| ------- | -------------- |
| From    | {{author}}     |
| Subject | {{subject}}    |
| Date    | {{date}}       |
| To      | {{recipients}} |

---

```

## Troubleshooting

What to do when the export failed?

1. Check that Joplin is running and the webclipper is enabled.
2. Check that the plugin is configured correctly. There is a status field. The status should be "working". Make sure the API token is set correctly.
3. Check the developer console. Usually it can be opened by pressing "Ctrl + Shift + I" or going to "Extras -> Developer Tools". There should be some error message.
4. If the previous steps didn't resolve the issue, you can open a github issue or email me.

## Related Projects

- [Overview in the Joplin forum](https://discourse.joplinapp.org/t/how-to-handle-emails-with-joplin-desktop/37469)
- <https://github.com/manolitto/joplin-mail-gateway>: Add all emails of an account to Joplin.
- <https://github.com/EliasVincent/joplin-email-note>: Export notes from Joplin to your email client.
- <https://github.com/joplin/plugin-email>: Add all emails of one or more accounts to Joplin.

## Further ressources

- <https://webextension-api.thunderbird.net/en/latest/>
- <https://developer.thunderbird.net/add-ons/resources>

## Changelog

### 0.0.8

- Bugfix: Make export working again when mail body is not displayed (<https://github.com/marph91/thunderbird-joplin-export/pull/33>).

### 0.0.6

- Add `author` and `user_created_date` metadata.
- Add support for Thunderbird up to version 127.

### 0.0.5

- Add support for Thunderbird 117 (<https://github.com/marph91/thunderbird-joplin-export/pull/22>).

### 0.0.4

- Add export via context menu (<https://github.com/marph91/thunderbird-joplin-export/pull/21>).

### 0.0.3

- Add custom author and date (<https://github.com/marph91/thunderbird-joplin-export/pull/16>).
- Fix naming of the default tags (<https://github.com/marph91/thunderbird-joplin-export/pull/18>).

### 0.0.2

- Add user defined note title (<https://github.com/marph91/thunderbird-joplin-export/pull/9>).

### 0.0.1

- Initial release.
