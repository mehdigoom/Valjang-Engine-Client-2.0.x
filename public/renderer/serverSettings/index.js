"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const electron = require("electron");
const settings = require("../settings");
const i18n = require("../../shared/i18n");
const systems = require("./systems");
require("./log");
const settingsElt = document.querySelector(".server-settings");
const disabledElt = settingsElt.querySelector(".disabled");
const serverNameElt = settingsElt.querySelector(".server-name input");
const mainPortElt = settingsElt.querySelector(".main-port input");
const buildPortElt = settingsElt.querySelector(".build-port input");
const autoStartServerElt = settingsElt.querySelector("#auto-start-server-checkbox");
const openProjectsFolderElt = settingsElt.querySelector(".projects-folder button");
const maxRecentBuildsElt = settingsElt.querySelector(".max-recent-builds input");
const openToInternetElt = document.getElementById("open-server-to-internet-checkbox");
const passwordRowElt = settingsElt.querySelector("li.password");
const passwordElt = passwordRowElt.querySelector("input");
const showOrHidePasswordElt = passwordRowElt.querySelector("button");

function start() {
    const serverConfig = getServerConfig();
    if (serverConfig == null) {
        settingsElt.querySelector(".error").hidden = true;
        settingsElt.querySelector(".settings").hidden = true;
        settingsElt.querySelector(".systems").hidden = true;
        return;
    }
    serverNameElt.value = serverConfig.serverName != null ? serverConfig.serverName : "";
    serverNameElt.addEventListener("input", scheduleSave);
    mainPortElt.value = serverConfig.mainPort.toString();
    mainPortElt.addEventListener("input", scheduleSave);
    buildPortElt.value = serverConfig.buildPort.toString();
    buildPortElt.addEventListener("input", scheduleSave);
    maxRecentBuildsElt.value = serverConfig.maxRecentBuilds.toString();
    maxRecentBuildsElt.addEventListener("input", scheduleSave);
    autoStartServerElt.checked = settings.autoStartServer;
    autoStartServerElt.addEventListener("change", onChangeAutoStartServer);
    openProjectsFolderElt.addEventListener("click", onOpenProjectsFolderClick);
    openToInternetElt.checked = serverConfig.password.length > 0;
    openToInternetElt.addEventListener("change", onChangeOpenToInternet);
    passwordRowElt.hidden = serverConfig.password.length === 0;
    passwordElt.value = serverConfig.password;
    passwordElt.addEventListener("input", scheduleSave);
    showOrHidePasswordElt.addEventListener("click", onShowOrHidePassword);
    systems.refreshRegistry();
}
exports.start = start;

function enable(enabled) {
    disabledElt.hidden = enabled;
}
exports.enable = enable;

function getServerConfig() {
    let defaultConfig;
    try {
        /* tslint:disable */
        defaultConfig = require(`${settings.corePath}/server/config.js`).defaults;
        /* tslint:enable */
    } catch (err) {
        return null;
    }
    let localConfig;
    try {
        localConfig = JSON.parse(fs.readFileSync(`${settings.userDataPath}/config.json`, { encoding: "utf8" }));
    } catch (err) { /* Ignore */ }
    if (localConfig == null)
        localConfig = {};
    const config = {};
    for (const key in defaultConfig) {
        if (localConfig[key] != null)
            config[key] = localConfig[key];
        else
            config[key] = defaultConfig[key];
    }
    return config;
}

function onOpenProjectsFolderClick() {
    electron.shell.openExternal(`${settings.userDataPath}/projects/`);
}

function onChangeAutoStartServer() {
    settings.setAutoStartServer(autoStartServerElt.checked);
    settings.scheduleSave();
}

function onChangeOpenToInternet() {
    if (openToInternetElt.checked) {
        let password = "";
        for (let i = 0; i < 15; i++) {
            const minCharCode = 33;
            const maxCharCode = 126;
            const charCode = minCharCode + Math.round(Math.random() * (maxCharCode - minCharCode));
            const char = String.fromCharCode(charCode);
            password += char;
        }
        passwordElt.value = password;
        passwordRowElt.hidden = false;
    } else {
        passwordRowElt.hidden = true;
        passwordElt.value = "";
    }
    scheduleSave();
}

function onShowOrHidePassword() {
    if (passwordElt.type === "password") {
        passwordElt.type = "text";
        showOrHidePasswordElt.textContent = i18n.t("common:actions.hide");
    } else {
        passwordElt.type = "password";
        showOrHidePasswordElt.textContent = i18n.t("common:actions.show");
    }
}
let scheduleSaveTimeoutId;

function scheduleSave() {
    if (scheduleSaveTimeoutId != null)
        return;
    scheduleSaveTimeoutId = setTimeout(applyScheduledSave, 30 * 1000);
}
exports.scheduleSave = scheduleSave;

function applyScheduledSave() {
    if (scheduleSaveTimeoutId == null)
        return;
    const config = {
        serverName: serverNameElt.value.length > 0 ? serverNameElt.value : null,
        mainPort: parseInt(mainPortElt.value, 10),
        buildPort: parseInt(buildPortElt.value, 10),
        password: passwordElt.value,
        maxRecentBuilds: parseInt(maxRecentBuildsElt.value, 10)
    };
    fs.writeFileSync(`${settings.userDataPath}/config.json`, JSON.stringify(config, null, 2) + "\n", { encoding: "utf8" });
    clearTimeout(scheduleSaveTimeoutId);
    scheduleSaveTimeoutId = null;
}
exports.applyScheduledSave = applyScheduledSave;