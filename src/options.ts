import { generateUrl, getSetting } from "./common";

declare const browser: any;
declare const btnSave: HTMLButtonElement;
declare const btnRefreshNotebooks: HTMLButtonElement;

const default_map: { [key: string]: string | number | boolean } = {
  joplinScheme: "http",
  joplinHost: "127.0.0.1",
  joplinPort: 41184,
  joplinToken: "",
  joplinShowNotifications: "onFailure",
  joplinSubjectTrimRegex: "",
  joplinAddHeaderInfo: false,
  joplinNoteFormat: "text/html",
  joplinExportAsTodo: false,
  joplinAttachments: "attach",
  joplinNoteTags: "email",
  joplinNoteTagsFromEmail: true,
};

async function checkJoplinConnection() {
  let url = await generateUrl("ping");
  let response;
  try {
    response = await fetch(url);
  } catch (e) {
    return {
      working: false,
      message:
        "Pinging Joplin failed. Please check that Joplin is running and the webclipper is enabled.",
    };
  }

  let response_text = await response.text();
  if (response_text !== "JoplinClipperServer") {
    return {
      working: false,
      message: `Unexpected ping response "${response_text}". Please check that addon and Joplin versions are matching.`,
    };
  }

  // Ping doesn't care for the token, so we need to check another endpoint.
  url = await generateUrl("folders");
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
  let connectionStatus = document.getElementById(
    "joplinStatus"
  ) as HTMLInputElement;
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
  (document.getElementById("joplinUrl") as HTMLInputElement).value =
    (document.getElementById("joplinScheme") as HTMLInputElement).value +
    "://" +
    (document.getElementById("joplinHost") as HTMLInputElement).value +
    ":" +
    (document.getElementById("joplinPort") as HTMLInputElement).value;
}

async function savePrefs() {
  for (const setting in default_map) {
    const element = document.getElementById(setting) as HTMLInputElement;
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
    joplinNoteParentFolder: (
      document.getElementById("joplinNoteParentFolder") as HTMLInputElement
    ).value,
  });
}

async function refreshNotebooks() {
  // https://stackoverflow.com/a/8674667/7410886
  type NotebookTree = Array<{
    id: string;
    title: string;
    children: NotebookTree;
  }>;
  function fillNotebookSelect(
    tree: NotebookTree,
    select: HTMLSelectElement,
    indentationLevel = 0
  ) {
    for (const notebook of tree) {
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
  const url = await generateUrl("folders", ["as_tree=1"]);
  const response = await fetch(url);
  if (!response.ok) {
    return;
  }
  const notebookTree = await response.json();
  let notebookSelect = document.getElementById(
    "joplinNoteParentFolder"
  ) as HTMLSelectElement;
  // Clear all options before inserting new ones.
  while (notebookSelect.firstChild) {
    notebookSelect.firstChild.remove();
  }
  fillNotebookSelect(notebookTree, notebookSelect);

  // Set notebook if possible
  const parentFolderId = await getSetting("joplinNoteParentFolder");
  if (parentFolderId) {
    notebookSelect.value = parentFolderId;
  }
}

async function initOptions() {
  btnSave.addEventListener("click", savePrefs);
  btnRefreshNotebooks.addEventListener("click", refreshNotebooks);

  // Try to obtain the settings from local storage. If not possible, fall back to the defaults.
  for (const setting in default_map) {
    const currentValue = await getSetting(setting);
    // 'false' is a valid value. Only check for 'null' and 'undefined'.
    const newValue = currentValue != null ? currentValue : default_map[setting];
    await browser.storage.local.set({ [setting]: newValue });
  }

  // Set values of the UI
  for (const setting in default_map) {
    const element = document.getElementById(setting) as HTMLInputElement;
    const value = await getSetting(setting);
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
