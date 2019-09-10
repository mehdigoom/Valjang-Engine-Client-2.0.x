"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const i18n = require("../../shared/i18n");
const index_1 = require("./index");

function openServerSettings() {
    index_1.clearActiveTab();
    let serverSettingsTabElt = index_1.tabStrip.tabsRoot.querySelector(`li[data-name="server-settings"]`);
    if (serverSettingsTabElt == null) {
        serverSettingsTabElt = document.createElement("li");
        serverSettingsTabElt.dataset["name"] = "server-settings";
        const iconElt = document.createElement("img");
        iconElt.className = "icon";
        iconElt.src = "images/tabs/serverSettings.svg";
        serverSettingsTabElt.appendChild(iconElt);
        const labelElt = document.createElement("div");
        labelElt.className = "label";
        labelElt.textContent = i18n.t("server:settings.title");
        serverSettingsTabElt.appendChild(labelElt);
        const closeButton = document.createElement("button");
        closeButton.className = "close";
        serverSettingsTabElt.appendChild(closeButton);
        index_1.tabStrip.tabsRoot.appendChild(serverSettingsTabElt);
    }
    const serverSettingsPaneElt = index_1.panesElt.querySelector(`:scope > div[data-name="server-settings"]`);
    serverSettingsTabElt.classList.add("active");
    serverSettingsPaneElt.hidden = false;
}
exports.default = openServerSettings;