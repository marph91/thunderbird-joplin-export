import { generateUrl, getSetting } from "./common";

declare const browser: any;
declare const messenger: any;

async function handleHotkey(command: string) {
  // Called if hotkey is pressed.

  if (command === "export_to_joplin") {
    // Only the active tab is queried. So the array contains always exactly one element.
    const [activeTab] = await messenger.tabs.query({
      active: true,
      currentWindow: true,
    });
    await getAndProcessMessages(activeTab, {});
  }
}

function onlyWhitespace(str: string) {
  return str.trim().length === 0;
}

async function getAndProcessMessages(tab: { id: number }, info: any) {
  // Called after button is clicked or hotkey is pressed.

  let success = true;
  let notificationIcon = "../images/logo_96_red.png";
  let notificationTitle = "Joplin export failed";
  let notificationMessage;

  // Check for Joplin API token. If it isn't present, we can skip everything else.
  const apiToken = await getSetting("joplinToken");
  if (!apiToken) {
    notificationMessage = "API token missing.";
    success = false;
  } else {
    const mailHeaders = await browser.messageDisplay.getDisplayedMessages(
      tab.id
    );

    // Process the mails and check for success.
    const results = await Promise.all(mailHeaders.map(processMail));
    for (const error of results) {
      if (error) {
        console.error(error);
        success = false;
      }
    }

    // Prepare the notification text.
    if (success) {
      notificationIcon = "../images/logo_96_blue.png";
      notificationTitle = "Joplin export succeeded";
      notificationMessage =
        results.length == 1
          ? "Exported one email."
          : `Exported ${results.length} emails.`;
    } else {
      notificationMessage = "Please check the developer console.";
    }
  }

  // Emit the notification if configured.
  const showNotifications = await getSetting("joplinShowNotifications");
  if (
    (success && ["always", "onSuccess"].includes(showNotifications)) ||
    (!success && ["always", "onFailure"].includes(showNotifications))
  ) {
    browser.notifications.create({
      type: "basic",
      iconUrl: notificationIcon,
      title: notificationTitle,
      message: notificationMessage,
    });
  }
}

async function processMail(mailHeader: any) {
  //////////////////////////////////////////////////
  // Mail content
  //////////////////////////////////////////////////

  // https://webextension-api.thunderbird.net/en/91/messages.html#messages-messageheader
  if (!mailHeader) {
    return "Mail header is empty";
  }

  // Add a note with the email content
  // Title
  const regexString = (await getSetting("joplinSubjectTrimRegex")) || "";
  const finalSubject =
    regexString === ""
      ? mailHeader.subject
      : mailHeader.subject.replace(new RegExp(regexString), "");

  let data: {
    title: string;
    parent_id: string;
    is_todo: number;
    body?: string;
    body_html?: string;
  } = {
    title: finalSubject + " from " + mailHeader.author,
    parent_id: (await getSetting("joplinNoteParentFolder")) || "",
    is_todo: Number(await getSetting("joplinExportAsTodo")),
  };

  // Body
  type ContentType = "text/html" | "text/plain";
  type Mail = { body: string; contentType: ContentType; parts: Array<Mail> };

  function getMailContent(mail: Mail, contentType: ContentType, content = "") {
    if (!mail) {
      return content;
    }
    if (mail.body && mail.contentType === contentType) {
      content += mail.body;
    }
    if (mail.parts) {
      for (const part of mail.parts) {
        content = getMailContent(part, contentType, content);
      }
    }
    return content;
  }

  // If there is selected text, prefer it over the full email.
  const selectedText = await browser.helper.getSelectedText();
  if (onlyWhitespace(selectedText)) {
    const mailObject = await browser.messages.getFull(mailHeader.id);

    // text/html and text/plain seem to be the only used MIME types for the body.
    const mailBodyHtml = getMailContent(mailObject, "text/html");
    const mailBodyPlain = getMailContent(mailObject, "text/plain");
    if (!mailBodyHtml && !mailBodyPlain) {
      return "Mail body is empty";
    }

    // If the preferred content type doesn't contain data, fall back to the other content type.
    const contentType = await getSetting("joplinNoteFormat");
    if ((contentType === "text/html" && mailBodyHtml) || !mailBodyPlain) {
      console.log("Sending complete email in HTML format.");
      data["body_html"] = mailBodyHtml;
    }
    if ((contentType === "text/plain" && mailBodyPlain) || !mailBodyHtml) {
      console.log("Sending complete email in plain format.");
      data["body"] = mailBodyPlain;
    }
  } else {
    console.log("Sending selection in plain format.");
    data["body"] = selectedText;
  }

  // https://javascript.info/fetch
  let url = await generateUrl("notes", ["fields=id,body"]);
  let response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    return `Failed to create note: ${await response.text()}`;
  }
  let noteInfo = await response.json();

  // Add header info like it is done at Thunderbird.
  // Do it only here, because we don't need any plain/html switching.
  // Disadvantage is the extra request.
  const addHeaderInfo = await getSetting("joplinAddHeaderInfo");
  if (addHeaderInfo) {
    // Empty header seems to work in Joplin:
    // https://stackoverflow.com/a/17543474/7410886
    const headerInfo = [
      "| | |",
      "|-|-|",
      `| From | ${mailHeader.author} |`,
      `| Subject | ${finalSubject} |`,
      `| Date | ${mailHeader.date} |`,
      `| To | ${mailHeader.recipients.join(", ")} |`,
      "\n---\n\n",
    ].join("\n");

    url = await generateUrl(`notes/${noteInfo["id"]}`, ["fields=id,body"]);
    response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: headerInfo + noteInfo["body"] }),
    });
    if (!response.ok) {
      return `Failed to add header info to note: ${await response.text()}`;
    }
    noteInfo = await response.json();
  }

  //////////////////////////////////////////////////
  // Tags
  //////////////////////////////////////////////////

  // User specified tags are stored in a comma separated string.
  const userTagsString = await getSetting("joplinNoteTags");
  let tags = userTagsString ? userTagsString.split(",") : [];

  const includeMailTags = await getSetting("joplinNoteTagsFromEmail");
  if (includeMailTags) {
    tags = tags.concat(mailHeader.tags);
  }

  for (const tag of tags) {
    // Strip spaces from tags, since they get stripped inside Joplin anyway. See:
    // https://discourse.joplinapp.org/t/joplin-export-export-emails-from-thunderbird-to-joplin/24792/26
    const strippedTag = tag.trim();

    // Check whether tag exists already
    url = await generateUrl("search", [`query=${strippedTag}`, "type=tag"]);
    response = await fetch(url);
    if (!response.ok) {
      console.warn(`Search for tag failed: ${await response.text()}`);
      continue;
    }
    const searchResult = await response.json();
    const matchingTags = searchResult["items"];

    let tagId;
    if (matchingTags.length === 0) {
      // create new tag
      url = await generateUrl("tags");
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: strippedTag }),
      });
      if (!response.ok) {
        console.warn(`Failed to create tag: ${await response.text()}`);
        continue;
      }
      const tagInfo = await response.json();
      tagId = tagInfo["id"];
    } else if (matchingTags.length === 1) {
      // use id of the existing tag
      tagId = matchingTags[0]["id"];
    } else {
      const matchingTagsString = matchingTags
        .map((e: { id: string; title: string }) => e.title)
        .join(", ");
      console.warn(
        `Too many matching tags for "${strippedTag}": ${matchingTagsString}`
      );
      continue;
    }

    // attach tag to note
    url = await generateUrl(`tags/${tagId}/notes`);
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: noteInfo["id"] }),
    });
    if (!response.ok) {
      console.warn(`Failed to attach tag to note: ${await response.text()}`);
      continue; // not necessary, but added in case of a future refactoring
    }
  }

  //////////////////////////////////////////////////
  // Attachments
  //////////////////////////////////////////////////

  const howToHandleAttachments = await getSetting("joplinAttachments");
  if (howToHandleAttachments === "ignore") {
    return null;
  }

  // https://webextension-api.thunderbird.net/en/latest/messages.html#getattachmentfile-messageid-partname
  const attachments = await browser.messages.listAttachments(mailHeader.id);
  if (attachments && attachments.length != 0) {
    let attachmentString = "\n\n**Attachments**: ";
    for (const attachment of attachments) {
      const attachmentFile = await browser.messages.getAttachmentFile(
        mailHeader.id,
        attachment.partName
      );

      const formData = new FormData();
      formData.append("data", attachmentFile);
      formData.append("props", JSON.stringify({ title: attachment.name }));
      // https://joplinapp.org/api/references/rest_api/#post-resources
      url = await generateUrl("resources");
      response = await fetch(url, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        console.warn(`Failed to create resource: ${await response.text()}`);
        continue;
      }
      const resourceInfo = await response.json();
      attachmentString += `\n[${attachment.name}](:/${resourceInfo["id"]})`;
    }

    // Always operate on body, even if previously used body_html.
    url = await generateUrl(`notes/${noteInfo["id"]}`);
    response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: noteInfo["body"] + attachmentString }),
    });
    if (!response.ok) {
      console.warn(
        `Failed to attach resource to note: ${await response.text()}`
      );
    }
  }
  return null;
}

browser.browserAction.onClicked.addListener(getAndProcessMessages);
messenger.commands.onCommand.addListener(handleHotkey);

// Only needed for testing.
export { getAndProcessMessages, handleHotkey, onlyWhitespace, processMail };
