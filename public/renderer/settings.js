"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const i18n = require("../shared/i18n");
function setPaths(newCorePath, newUserDataPath) {
    exports.corePath = newCorePath;
    exports.userDataPath = newUserDataPath;
}
exports.setPaths = setPaths;
function setNickname(newNickname) {
    exports.nickname = newNickname;
}
exports.setNickname = setNickname;
function setPresence(newPresence) {
    exports.presence = newPresence;
}
exports.setPresence = setPresence;
function setSavedChatrooms(newSavedChatrooms) {
    exports.savedChatrooms = newSavedChatrooms;
}
exports.setSavedChatrooms = setSavedChatrooms;
function setAutoStartServer(enabled) {
    exports.autoStartServer = enabled;
}
exports.setAutoStartServer = setAutoStartServer;
function load(callback) {
    const settingsPath = `${exports.userDataPath}/settings.json`;
    console.log(`Loading settings from ${settingsPath}.`);
    fs.readFile(settingsPath, { encoding: "utf8" }, (err, dataJSON) => {
        if (err != null && err.code !== "ENOENT") {
            callback(err);
            return;
        }
        exports.favoriteServersById = {};
        exports.recentProjects = [];
        if (dataJSON == null) {
            // Setup defaults
            const myServerEntry = { id: "0", hostname: "127.0.0.1", port: "4237", label: i18n.t("server:myServer"), httpUsername: "", httpPassword: "" };
            exports.favoriteServers = [myServerEntry];
            exports.favoriteServersById[myServerEntry.id] = myServerEntry;
            exports.recentProjects = [];
            exports.autoStartServer = true;
            exports.nickname = null;
            exports.presence = "offline";
            exports.savedChatrooms = [];
            callback(null);
            return;
        }
        const data = JSON.parse(dataJSON);
        exports.favoriteServers = data.favoriteServers;
        for (const entry of exports.favoriteServers) {
            exports.favoriteServersById[entry.id] = entry;
            if (entry.httpUsername == null)
                entry.httpUsername = "";
            if (entry.httpPassword == null)
                entry.httpPassword = "";
        }
        exports.recentProjects = data.recentProjects;
        exports.autoStartServer = data.autoStartServer;
        exports.nickname = data.nickname;
        exports.presence = data.presence;
        exports.savedChatrooms = data.savedChatrooms;
        callback(null);
    });
}
exports.load = load;
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
    const data = {
        favoriteServers: exports.favoriteServers,
        recentProjects: exports.recentProjects,
        autoStartServer: exports.autoStartServer,
        nickname: exports.nickname,
        presence: exports.presence,
        savedChatrooms: exports.savedChatrooms
    };
    fs.writeFileSync(`${exports.userDataPath}/settings.json`, JSON.stringify(data, null, 2) + "\n", { encoding: "utf8" });
    clearTimeout(scheduleSaveTimeoutId);
    scheduleSaveTimeoutId = null;
}
exports.applyScheduledSave = applyScheduledSave;
