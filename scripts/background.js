const common = require("./common");

// Add a prefix to all log messages of this module.
const originalConsoleLog = console.log;
console.log = function () {
  const new_args = ["Joplin Export:"].concat(Array.from(arguments));
  originalConsoleLog.apply(console, new_args);
};

async function handleJoplinButton(tab, info) {
  // The icon will be red during transmission and if anything failed.
  // webextension-api.thunderbird.net/en/latest/messageDisplayAction.html#seticon-details
  browser.browserAction.setIcon({ path: "../images/logo_96_red.png" });

  // Check for joplin api token. If it isn't present, we can skip everything else.
  const apiToken = await common.getSetting("joplinToken");
  if (!apiToken) {
    throw new Error("API token not set. Please specify it at the settings.");
  }

  const mailHeaders = await browser.messageDisplay.getDisplayedMessages(tab.id);
  const results = await Promise.all(mailHeaders.map(processMail));
  for (error of results) {
    if (error) {
      console.error(error);
    }
  }

  if (results.every((error) => error == null)) {
    // Only change back to blue if everything succeeded.
    browser.browserAction.setIcon({ path: "../images/logo_96_blue.png" });
  }
}

async function processMail(mailHeader) {
  //////////////////////////////////////////////////
  // Mail content
  //////////////////////////////////////////////////

  // https://webextension-api.thunderbird.net/en/91/messages.html#messages-messageheader
  if (!mailHeader) {
    return "Mail header is empty";
  }

  // Body
  function getMailContent(mail, contentType, content = "") {
    if (mail.body && mail.contentType === contentType) {
      content += mail.body;
    }
    if (mail.parts) {
      for (let part of mail.parts) {
        content = getMailContent(part, contentType, content);
      }
    }
    return content;
  }

  const mailObject = await browser.messages.getFull(mailHeader.id);
  const contentType = await common.getSetting("joplinNoteFormat");

  // text/html and text/plain seem to be the only used MIME types for the body.
  const mailBodyHtml = getMailContent(mailObject, "text/html");
  const mailBodyPlain = getMailContent(mailObject, "text/plain");
  if (!mailBodyHtml && !mailBodyPlain) {
    return "Mail body is empty";
  }

  // Add a note with the email content
  let data = {
    title: mailHeader.subject + " from " + mailHeader.author,
    parent_id: (await common.getSetting("joplinNoteParentFolder")) || "",
  };

  // If the preferred content type doesn't contain data, fall back to the other content type.
  if ((contentType === "text/html" && mailBodyHtml) || !mailBodyPlain) {
    console.log("Sending data in HTML format.");
    data["body_html"] = mailBodyHtml;
  }
  if ((contentType === "text/plain" && mailBodyPlain) || !mailBodyHtml) {
    console.log("Sending data in plain format.");
    data["body"] = mailBodyPlain;
  }

  // https://javascript.info/fetch
  url = await common.generateUrl("notes", ["fields=id,body"]);
  response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    return `Failed to create note: ${await response.text()}`;
  }
  const noteInfo = await response.json();

  //////////////////////////////////////////////////
  // Tags
  //////////////////////////////////////////////////

  // User specified tags are stored in a comma separated string.
  const userTagsString = await common.getSetting("joplinNoteTags");
  const userTags = userTagsString.split(",");

  for (tag of userTags.concat(mailHeader.tags)) {
    // Check whether tag exists already
    url = await common.generateUrl("search", [`query=${tag}`, "type=tag"]);
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
      url = await common.generateUrl("tags");
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: tag }),
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
      console.warn(`Too many matching tags "${matchingTags}" for "${tag}"`);
      continue;
    }

    // attach tag to note
    url = await common.generateUrl(`tags/${tagId}/notes`);
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

  // https://webextension-api.thunderbird.net/en/latest/messages.html#getattachmentfile-messageid-partname
  const attachments = await browser.messages.listAttachments(mailHeader.id);
  if (attachments && attachments.length != 0) {
    let attachmentString = "\n\n**Attachments**: ";
    for (attachment of attachments) {
      const attachmentFile = await browser.messages.getAttachmentFile(
        mailHeader.id,
        attachment.partName
      );

      const formData = new FormData();
      formData.append("data", attachmentFile);
      formData.append("props", JSON.stringify({ title: attachment.name }));
      // https://joplinapp.org/api/references/rest_api/#post-resources
      url = await common.generateUrl("resources");
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
    // TODO: Check is this has side effects.
    url = await common.generateUrl(`notes/${noteInfo["id"]}`);
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

browser.browserAction.onClicked.addListener(handleJoplinButton);
