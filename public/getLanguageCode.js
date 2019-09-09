"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const electron = require("electron");
const i18n = require("i18n");
function getLanguageCode(dataPath, callback) {
    fs.readFile(`${dataPath}/settings.json`, { encoding: "utf8" }, (err, settingsJSON) => {
        let languageCode = (settingsJSON != null) ? JSON.parse(settingsJSON).languageCode : null;
        if (languageCode == null)
            languageCode = electron.app.getLocale();
        if (i18n.languageIds.indexOf(languageCode) === -1 && languageCode.indexOf("-") !== -1)
            languageCode = languageCode.split("-")[0];
        if (i18n.languageIds.indexOf(languageCode) === -1)
            languageCode = "en";
        callback(languageCode);
    });
}
exports.default = getLanguageCode;
