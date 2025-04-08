/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

async function getSelection() {
    let selection = window.getSelection();
    return selection.toString();
}

messenger.runtime.onMessage.addListener((message, sender) => {
    switch (message.action) {
        case "getSelection":
            return getSelection();
    }
    return false;
});
