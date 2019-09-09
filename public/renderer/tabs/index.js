"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TabStrip = require("tab-strip");
const tabsBarElt = document.querySelector(".tabs-bar");
exports.tabStrip = new TabStrip(tabsBarElt);
exports.panesElt = document.querySelector(".panes");
exports.tabStrip.on("activateTab", onActivateTab);
exports.tabStrip.on("closeTab", onCloseTab);
exports.tabStrip.tabsRoot.addEventListener("click", onTabStripClick);
document.addEventListener("keydown", (event) => {
    const ctrlOrCmd = event.ctrlKey || event.metaKey;
    if (event.keyCode === 87 && ctrlOrCmd) { // Ctrl+W
        onCloseTab(exports.tabStrip.tabsRoot.querySelector("li.active"));
    }
    if (event.keyCode === 9 && event.ctrlKey) { // Ctrl+Tab
        event.preventDefault();
        if (event.shiftKey)
            onActivatePreviousTab();
        else
            onActivateNextTab();
    }
});
function clearActiveTab() {
    const activeTabElt = exports.tabStrip.tabsRoot.querySelector("li.active");
    if (activeTabElt != null) {
        activeTabElt.classList.remove("active");
        exports.panesElt.querySelector(":scope > *:not([hidden])").hidden = true;
    }
}
exports.clearActiveTab = clearActiveTab;
function onActivateTab(tabElt) {
    clearActiveTab();
    tabElt.classList.add("active");
    const serverId = tabElt.dataset["serverId"];
    const paneName = tabElt.dataset["name"];
    let paneElt;
    if (serverId != null)
        paneElt = exports.panesElt.querySelector(`:scope > div[data-server-id="${serverId}"]`);
    else
        paneElt = exports.panesElt.querySelector(`:scope > *[data-name="${paneName}"]`);
    paneElt.hidden = false;
    const firstChild = paneElt.firstElementChild;
    if (firstChild.tagName === "WEBVIEW")
        firstChild.focus();
    else if (paneElt.classList.contains("chat-tab")) {
        paneElt.querySelector(".input textarea").focus();
    }
}
exports.onActivateTab = onActivateTab;
function onCloseTab(tabElement) {
    if (tabElement.classList.contains("pinned"))
        return;
    const serverId = tabElement.dataset["serverId"];
    const paneName = tabElement.dataset["name"];
    let paneElt;
    if (serverId != null)
        paneElt = exports.panesElt.querySelector(`:scope > div[data-server-id='${serverId}']`);
    else
        paneElt = exports.panesElt.querySelector(`:scope > *[data-name='${paneName}']`);
    if (tabElement.classList.contains("active")) {
        const activeTabElement = (tabElement.nextElementSibling != null) ? tabElement.nextElementSibling : tabElement.previousElementSibling;
        if (activeTabElement != null)
            onActivateTab(activeTabElement);
    }
    tabElement.parentElement.removeChild(tabElement);
    if (paneElt.dataset["persist"] === "true")
        paneElt.hidden = true;
    else
        paneElt.parentElement.removeChild(paneElt);
}
function onTabStripClick(event) {
    const target = event.target;
    if (target.tagName !== "BUTTON" || target.className !== "close") {
        const activePaneElt = exports.panesElt.querySelector(":scope > *:not([hidden])");
        activePaneElt.firstElementChild.focus();
        return;
    }
    exports.tabStrip.emit("closeTab", target.parentElement);
}
function onActivatePreviousTab() {
    const activeTabElt = exports.tabStrip.tabsRoot.querySelector(".active");
    for (let tabIndex = 0; exports.tabStrip.tabsRoot.children.length; tabIndex++) {
        const tabElt = exports.tabStrip.tabsRoot.children[tabIndex];
        if (tabElt === activeTabElt) {
            const newTabIndex = (tabIndex === 0) ? exports.tabStrip.tabsRoot.children.length - 1 : tabIndex - 1;
            onActivateTab(exports.tabStrip.tabsRoot.children[newTabIndex]);
            return;
        }
    }
}
function onActivateNextTab() {
    const activeTabElt = exports.tabStrip.tabsRoot.querySelector(".active");
    for (let tabIndex = 0; exports.tabStrip.tabsRoot.children.length; tabIndex++) {
        const tabElt = exports.tabStrip.tabsRoot.children[tabIndex];
        if (tabElt === activeTabElt) {
            const newTabIndex = (tabIndex === exports.tabStrip.tabsRoot.children.length - 1) ? 0 : tabIndex + 1;
            onActivateTab(exports.tabStrip.tabsRoot.children[newTabIndex]);
            return;
        }
    }
}
