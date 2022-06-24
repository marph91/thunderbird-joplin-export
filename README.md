# Joplin Export Thunderbird Addon

Easily export your thunderbird emails to Joplin.

[![build](https://github.com/marph91/thunderbird-joplin-export/actions/workflows/build.yml/badge.svg)](https://github.com/marph91/thunderbird-joplin-export/actions/workflows/build.yml)
[![test](https://github.com/marph91/thunderbird-joplin-export/actions/workflows/test.yml/badge.svg)](https://github.com/marph91/thunderbird-joplin-export/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/marph91/thunderbird-joplin-export/branch/master/graph/badge.svg?token=YZYEW7C1VM)](https://codecov.io/gh/marph91/thunderbird-joplin-export)

## Features

- Export a text selection, a single or multiple emails to Joplin.
- Export by clicking the button or pressing the hotkey ("Ctrl+Alt+J" by default)
- Export the email as note or todo.
- Include meta information in the note title and body:
  - Specify a template for note title and body.
  - Trim the subject by regex. For example remove "Re:" or "Fwd:".
  - For details, see [the following section](#include-metadata)
- Add tags and attachments from the email.

### Include metadata

In this section are some examples how to configure the metadata. All of the metadata of the [mail header object](https://webextension-api.thunderbird.net/en/latest/messages.html#messages-messageheader) can be included.

By default, the note title template is `{{subject}} from {{author}}`. I. e. the keys `subject` and `author` are searched in the mail header object and inserted into the template if found. Since the subject contains often strings like `Re:` or `Fwd:`, they can be removed by defining a regex. For me, the regex `^(((Re|Fw|Fwd):|(\[.*\])) ?)*` works best.

It is also possible to insert some metadata at the top of the note body. This can be done by defining a template in the "Note header" setting. The template should be specified in markdown syntax. Words surrounded by double curly brackets are tried to replace by the corresponding metadata, as done in the note title.

The following two code snippets show examples how the templates could look.

Plain text with final separation line:

```text
From: {{author}}
Subject: {{subject}}
Date: {{date}}
To: {{recipients}}

---

```

Table with final separation line:

```text
| | |
|-|-|
| From | {{author}} |
| Subject | {{subject}} |
| Date | {{date}} |
| To | {{recipients}} |

---

```

## Installation

- Via [Thunderbird addon store](https://addons.thunderbird.net/en/thunderbird/addon/joplin-export/) (preferred)
- Via manual import:
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
