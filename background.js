async function getSetting(name) {
  // Convenience wrapper to get a setting from local storage.
  return (await browser.storage.local.get(name))[name];
}

async function handleJoplinButton(tab, info) {
  // Check for joplin api token. If it isn't present, we can skip everything else.
  const apiToken = (await browser.storage.local.get("joplinToken")).joplinToken;
  if (!apiToken) {
    // https://github.com/thundernest/sample-extensions/tree/77f79f986e6005c07008d974fa629e258dcceb80/managedStorage
    throw new Error("API token not set. Please specify it at the settings.");
  }

  const baseUrl =
    (await browser.storage.local.get("joplinScheme")).joplinScheme +
    "://" +
    (await browser.storage.local.get("joplinHost")).joplinHost +
    ":" +
    (await browser.storage.local.get("joplinPort")).joplinPort;

  //////////////////////////////////////////////////
  // Header, including subject, author and tags
  //////////////////////////////////////////////////

  // https://webextension-api.thunderbird.net/en/91/messages.html#messages-messageheader
  let tabs = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  let mailHeader = await browser.messageDisplay.getDisplayedMessage(tabs[0].id);
  if (!mailHeader) {
    throw new Error("Mail header is empty");
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
  const contentType = await getSetting("joplinNoteFormat");
  const mailBody = getMailContent(mailObject, contentType);
  if (!mailBody) {
    throw new Error("Mail body is empty");
  }

  // Add a note with the email content
  url = `${baseUrl}/notes?token=${apiToken}`;
  let data = {
    title: mailHeader.subject + " from " + mailHeader.author,
    parent_id: (await getSetting("joplinNoteParentFolder")) || "",
  };
  if (contentType === "text/html") {
    data["body_html"] = mailBody;
  } else if (contentType === "text/plain") {
    data["body"] = mailBody;
  }

  // https://javascript.info/fetch
  response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  let noteInfo = await response.json();
  console.log(noteInfo["id"]);

  //////////////////////////////////////////////////
  // Tags
  //////////////////////////////////////////////////
  // TODO
  //console.log(mailHeader.tags)
  //for (let tag of mailHeader.tags) {
  //  // create tag
  //
  //  // attach tag to note
  //
  //}

  //////////////////////////////////////////////////
  // Attachments
  //////////////////////////////////////////////////

  // listAttachments
  // getAttachmentFile
  // https://webextension-api.thunderbird.net/en/latest/messages.html#getattachmentfile-messageid-partname
  // let attachments = await browser.messages.listAttachments(mailHeader.id);
  // console.log(attachments);
}

browser.messageDisplayAction.onClicked.addListener(handleJoplinButton);
