"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const electron = require("electron");
const i18n = require("../scripts/i18n");

function getLanguageCode(dataPath, callback) {
    fs.readFile(`${dataPath}/settings.json`, { encoding: "utf8" }, (err, settingsJSON) => {

        let languageCode = (settingsJSON != null) ? JSON.parse(settingsJSON).languageCode : null;

        languageCode = "en";
        callback(languageCode);
    });
}
exports.default = getLanguageCode;