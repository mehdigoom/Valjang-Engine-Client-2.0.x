"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron = require("electron");
const yargs = require("yargs");
const path = require("path");
const fs = require("fs");
const i18n_1 = require("../scripts/i18n");
const argv = yargs
    .usage("Usage: $0 [options]")
    .describe("core-path", "Path to ValjangEngine core")
    .argv;
function getPaths(callback) {
    let dataPath;
    let corePath = argv["core-path"] != null ? path.resolve(argv["core-path"]) : null;
    if (corePath != null) {
        dataPath = corePath;
        process.nextTick(() => { callback(null, corePath, dataPath); });
        return;
    }
    try {
        dataPath = path.join(electron.app.getPath("appData"), "ValjangEngine");
    }
    catch (err) {
        process.nextTick(() => { callback(new i18n_1.LocalizedError("startup:errors.couldNotGetDataPath", { details: err.message })); });
        return;
    }
    console.log(dataPath);
    if (!fs.existsSync(dataPath)) {
        // This is the old custom logic we used to determine the appData folder
        // so if the new data folder doesn't exist, we'll try to migrate from the old one
        let oldDataPath;
        switch (process.platform) {
            case "win32":
                if (process.env.APPDATA != null)
                    oldDataPath = path.join(process.env.APPDATA, "ValjangEngine");
                break;
            case "darwin":
                if (process.env.HOME != null)
                    oldDataPath = path.join(process.env.HOME, "Library", "ValjangEngine");
                break;
            default:
                if (process.env.XDG_DATA_HOME != null)
                    oldDataPath = path.join(process.env.XDG_DATA_HOME, "ValjangEngine");
                else if (process.env.HOME != null)
                    oldDataPath = path.join(process.env.HOME, ".local/share", "ValjangEngine");
        }
        if (oldDataPath != null && fs.existsSync(oldDataPath)) {
            console.log(`Migrating data from ${oldDataPath} to ${dataPath}...`);
            fs.renameSync(oldDataPath, dataPath);
        }
    }
    corePath = path.join(dataPath, "core");
    fs.mkdir(dataPath, (err) => {
        if (err != null && err.code !== "EEXIST") {
            callback(new i18n_1.LocalizedError("startup:errors.couldNotCreateUserDataFolder", { dataPath, reason: err.message }));
            return;
        }
        callback(null, corePath, dataPath);
    });
}
exports.default = getPaths;
