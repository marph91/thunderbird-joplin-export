const { handleJoplinButton } = require("./process_mail");
browser.browserAction.onClicked.addListener(handleJoplinButton);
