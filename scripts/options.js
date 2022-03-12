const common = require("./common");

const default_map = {
  joplinScheme: "http",
  joplinHost: "127.0.0.1",
  joplinPort: 41184,
  joplinToken:
    "ac6882d828b99b9e72a418a11285edf06315d3a3cdc5340ee49df2380ac59adf9199f41fb8bc08f62e21d6308e11402d148c8f2ab57053f7145947df2700ce7e",
  joplinNoteFormat: "text/html",
  joplinAttachments: "ignore",
  joplinNoteTags: "email",
  joplinNoteTagsFromEmail: false,
};

async function checkJoplinConnection() {
  let url = await common.generateUrl("ping");
  let response;
  try {
    response = await fetch(url);
  } catch (e) {
    return {
      working: false,
      message:
        "Pinging joplin failed. Please check that joplin is running and the webclipper is enabled.",
    };
  }

  let response_text = await response.text();
  if (response_text !== "JoplinClipperServer") {
    return {
      working: false,
      message: `Unexpected ping response "${response_text}". Please check that addon and joplin versions are matching.`,
    };
  }

  // Ping doesn't care for the token, so we need to check another endpoint.
  url = await common.generateUrl("folders");
  response = await fetch(url);
  if (!response.ok) {
    return {
      working: false,
      message: `Unexpected http status "${response.status}". Please check that the configuration is correct.`,
    };
  }

  return { working: true, message: "" };
}

async function updateConnectionStatus() {
  let connectionStatus = document.getElementById("joplinStatus");
  const { working, message } = await checkJoplinConnection();
  if (working) {
    connectionStatus.style.color = "blue";
    connectionStatus.value = "working";
  } else {
    connectionStatus.style.color = "red";
    connectionStatus.value = message;
  }

  return working;
}

async function displayUrl() {
  document.getElementById("joplinUrl").value =
    document.getElementById("joplinScheme").value +
    "://" +
    document.getElementById("joplinHost").value +
    ":" +
    document.getElementById("joplinPort").value;
}

async function savePrefs() {
  for (setting in default_map) {
    const element = document.getElementById(setting);
    let value;
    if (element.type === "checkbox") {
      value = element.checked;
    } else {
      value = element.value;
    }
    browser.storage.local.set({ [setting]: value });
  }

  await displayUrl();

  // The parent notebook can only be set if the connection is functional!
  const working = await updateConnectionStatus();
  if (!working) {
    return;
  }

  await browser.storage.local.set({
    joplinNoteParentFolder: document.getElementById("joplinNoteParentFolder")
      .value,
  });
}

async function refreshNotebooks() {
  // https://stackoverflow.com/a/8674667/7410886
  function fillNotebookSelect(tree, select, indentationLevel = 0) {
    for (notebook of tree) {
      let opt = document.createElement("option");
      opt.value = notebook.id;
      // Spaces: https://stackoverflow.com/a/17855282/7410886
      opt.text = "\xA0\xA0".repeat(indentationLevel) + " " + notebook.title;
      select.appendChild(opt);

      if (notebook.children) {
        fillNotebookSelect(notebook.children, select, (indentationLevel += 1));
      }
    }
  }
  const url = await common.generateUrl("folders", ["as_tree=1"]);
  const response = await fetch(url);
  if (!response.ok) {
    return;
  }
  const notebookTree = await response.json();
  let notebookSelect = document.getElementById("joplinNoteParentFolder");
  // Clear all options before inserting new ones.
  while (notebookSelect.firstChild) {
    notebookSelect.firstChild.remove();
  }
  fillNotebookSelect(notebookTree, notebookSelect);

  // Set notebook if possible
  const parentFolderId = await common.getSetting("joplinNoteParentFolder");
  if (parentFolderId) {
    notebookSelect.value = parentFolderId;
  }
}

async function initOptions() {
  btnSave.addEventListener("click", savePrefs);
  btnRefreshNotebooks.addEventListener("click", refreshNotebooks);

  // Try to obtain the settings from local storage. If not possible, fall back to the defaults.
  for (setting in default_map) {
    await browser.storage.local.set({
      [setting]: (await common.getSetting(setting)) || default_map[setting],
    });
  }

  // Set values of the UI
  for (setting in default_map) {
    const element = document.getElementById(setting);
    const value = await common.getSetting(setting);
    if (element.type === "checkbox") {
      element.checked = value;
    } else {
      element.value = value;
    }
  }

  await displayUrl();

  // The parent notebook can only be set if the connection is functional!
  const working = await updateConnectionStatus();
  if (!working) {
    return;
  }

  await refreshNotebooks();
}

document.addEventListener("DOMContentLoaded", initOptions, { once: true });
