"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const async = require("async");
const fs = require("fs");
const path = require('path');
// exports.languageIds = fs.readdirSync(`${__dirname}\..\..\locales`);
exports.languageIds = fs.readdirSync(path.join(__dirname, '/../../public/locales/'));

function setLanguageCode(code) {
    exports.languageCode = code;
}
exports.setLanguageCode = setLanguageCode;
exports.contexts = {};
exports.fallbackContexts = {};
class LocalizedError {
    constructor(key, variables) {
        this.key = key;
        this.variables = variables;
    }
}
exports.LocalizedError = LocalizedError;

function load(contextNames, callback) {
    async.each(contextNames, loadContext.bind(null, exports.languageCode, exports.contexts), () => {
        if (exports.languageCode === "en") {
            callback();
            return;
        }
        async.each(contextNames, loadContext.bind(null, "en", exports.fallbackContexts), callback);
    });
}
exports.load = load;

function t(key, variables) {
    let result = genericT(exports.contexts, key, variables);
    if (result == null)
        result = genericT(exports.fallbackContexts, key, variables);
    return result != null ? result : key;
}
exports.t = t;

function getLocalizedFilename(filename) {
    if (exports.languageCode === "en")
        return filename;
    const [basename, extension] = filename.split(".");
    return `${basename}.${exports.languageCode}.${extension}`;
}
exports.getLocalizedFilename = getLocalizedFilename;

function loadContext(languageCode, contexts, contextName, callback) {
    const filePath = `${__dirname}/../locales/${languageCode}/${contextName}.json`;
    fs.readFile(filePath, { encoding: "utf8" }, (err, text) => {
        if (err != null) {
            callback();
            return;
        }
        contexts[contextName] = JSON.parse(text);
        callback();
    });
}

function genericT(contexts, key, variables) {
    const [contextName, keys] = key.split(":");
    const keyParts = keys.split(".");
    let valueOrText = contexts[contextName];
    if (valueOrText == null)
        return null;
    for (const keyPart of keyParts) {
        valueOrText = valueOrText[keyPart];
        if (valueOrText == null)
            return null;
    }
    if (typeof valueOrText === "string")
        return insertVariables(valueOrText, variables);
    else
        return key;
}

function insertVariables(text, variables) {
    let index = 0;
    do {
        index = text.indexOf("${", index);
        if (index !== -1) {
            const endIndex = text.indexOf("}", index);
            const key = text.slice(index + 2, endIndex);
            const value = variables[key] != null ? variables[key] : `"${key}" is missing`;
            text = text.slice(0, index) + value + text.slice(endIndex + 1);
            index += 1;
        }
    } while (index !== -1);
    return text;
}