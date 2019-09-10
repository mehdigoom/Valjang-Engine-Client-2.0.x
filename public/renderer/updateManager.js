"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron = require("electron");
const async = require("async");
const path = require("path");
const fs = require("fs");
const dialogs = require("simple-dialogs");
const mkdirp = require("mkdirp");
const forkServerProcess_1 = require("./forkServerProcess");
const settings = require("./settings");
const systemServerSettings = require("./serverSettings/systems");
const i18n = require("../shared/i18n");
const splashScreen = require("./splashScreen");
const fetch_1 = require("../shared/fetch");
/* tslint:disable */
const https = require("follow-redirects").https;
const yauzl = require("yauzl");
/* tslint:enable */
exports.appVersion = electron.remote.app.getVersion();
if (exports.appVersion === "0.0.0-dev") {
    exports.appVersion = `v${JSON.parse(fs.readFileSync(`${__dirname}/../../package.json`, { encoding: "utf8" })).version}-dev`;
}
else
    exports.appVersion = `v${exports.appVersion}`;
function checkForUpdates(callback) {
    async.series([checkAppUpdate, checkCoreUpdate], callback);
}
exports.checkForUpdates = checkForUpdates;
function checkAppUpdate(callback) {
    if (electron.remote.app.getVersion() === "0.0.0-dev") {
        callback(null);
        return;
    }
    fetch_1.default(`https://api.github.com/repos/ValjangEngine/ValjangEngine-app/releases/latest`, { type: "json" }, (err, lastRelease) => {
        if (err != null) {
            callback(err);
            return;
        }
        if (lastRelease.tag_name === exports.appVersion) {
            callback(null);
            return;
        }
        const label = i18n.t("startup:updateAvailable.app", { latest: lastRelease.tag_name, current: exports.appVersion });
        const options = {
            validationLabel: i18n.t("common:actions.download"),
            cancelLabel: i18n.t("common:actions.skip")
        };
        new dialogs.ConfirmDialog(label, options, (shouldDownload) => {
            if (shouldDownload) {
                electron.shell.openExternal("https://github.com/mehdigoom/ValjangEngine-app/releases/latest");
                electron.remote.app.quit();
                return;
            }
            callback(null);
        });
    });
}
function checkCoreUpdate(callback) {
    fs.readFile(`${settings.corePath}/package.json`, { encoding: "utf8" }, (err, corePackageJSON) => {
        if (err != null && err.code !== "ENOENT")
            throw err;
        const coreFunction = corePackageJSON == null ? firstCoreInstall : updateCore;
        coreFunction((error) => {
            if (error != null) {
                new dialogs.InfoDialog(i18n.t("startup:status.installingCoreFailed", { error: error.message }), null, () => { callback(error); });
            }
            else {
                callback(null);
            }
        });
    });
    return;
}
function getCoreDownloadURL(callback) {
    const registryUrl = "https://raw.githubusercontent.com/ValjangEngine/ValjangEngine-registry/master/registry.json";
    const request = https.get(registryUrl, (res) => {
        if (res.statusCode !== 200) {
            callback(new Error(`Unexpected status code: ${res.statusCode}`));
            return;
        }
        let content = "";
        res.on("data", (chunk) => { content += chunk; });
        res.on("end", () => {
            let registry;
            try {
                registry = JSON.parse(content);
            }
            catch (err) {
                callback(new Error(`Could not parse registry as JSON`));
                return;
            }
            callback(null, registry.core.downloadURL);
        });
    });
    request.on("error", (err) => {
        callback(err);
    });
}
exports.getCoreDownloadURL = getCoreDownloadURL;
function firstCoreInstall(callback) {
    splashScreen.setStatus(i18n.t("startup:status.installingCore"));
    splashScreen.setProgressVisible(true);
    splashScreen.setProgressValue(null);
    getCoreDownloadURL((err, downloadURL) => {
        if (err != null) {
            callback(err);
            return;
        }
        https.get({
            hostname: "github.com",
            path: downloadURL,
            headers: { "user-agent": "ValjangEngine" }
        }, (res) => {
            if (res.statusCode !== 200) {
                callback(new Error(`Unexpected status code: ${res.statusCode}`));
                return;
            }
            const size = parseInt(res.headers["content-length"], 10);
            splashScreen.setProgressMax(size * 2);
            splashScreen.setProgressValue(0);
            let downloaded = 0;
            const buffers = [];
            res.on("data", (data) => { buffers.push(data); downloaded += data.length; splashScreen.setProgressValue(downloaded); });
            res.on("end", () => {
                const zipBuffer = Buffer.concat(buffers);
                yauzl.fromBuffer(zipBuffer, { lazyEntries: true }, (err, zipFile) => {
                    if (err != null)
                        throw err;
                    splashScreen.setProgressMax(zipFile.entryCount * 2);
                    splashScreen.setProgressValue(zipFile.entryCount);
                    let entriesProcessed = 0;
                    const rootFolderName = path.parse(downloadURL).name;
                    zipFile.readEntry();
                    zipFile.on("entry", (entry) => {
                        if (entry.fileName.indexOf(rootFolderName) !== 0)
                            throw new Error(`Found file outside of root folder: ${entry.fileName} (${rootFolderName})`);
                        const filename = path.join(settings.corePath, entry.fileName.replace(rootFolderName, ""));
                        if (/\/$/.test(entry.fileName)) {
                            mkdirp(filename, (err) => {
                                if (err != null)
                                    throw err;
                                entriesProcessed++;
                                splashScreen.setProgressValue(zipFile.entryCount + entriesProcessed);
                                zipFile.readEntry();
                            });
                        }
                        else {
                            zipFile.openReadStream(entry, (err, readStream) => {
                                if (err)
                                    throw err;
                                mkdirp(path.dirname(filename), (err) => {
                                    if (err)
                                        throw err;
                                    readStream.pipe(fs.createWriteStream(filename));
                                    readStream.on("end", () => {
                                        entriesProcessed++;
                                        splashScreen.setProgressValue(zipFile.entryCount + entriesProcessed);
                                        zipFile.readEntry();
                                    });
                                });
                            });
                        }
                    });
                    zipFile.on("end", () => {
                        splashScreen.setProgressVisible(false);
                        splashScreen.setStatus(i18n.t("startup:status.installingCoreSucceed"));
                        callback(null);
                    });
                });
            });
        });
    });
}
function updateCore(callback) {
    systemServerSettings.getRegistry((registry) => {
        if (registry == null || registry.core.isLocalDev || registry.core.version === registry.core.localVersion) {
            callback(null);
            return;
        }
        const label = i18n.t("startup:updateAvailable.core", { latest: registry.core.version, current: registry.core.localVersion });
        const options = {
            validationLabel: i18n.t("common:actions.update"),
            cancelLabel: i18n.t("common:actions.skip")
        };
        new dialogs.ConfirmDialog(label, options, (shouldUpdate) => {
            if (!shouldUpdate) {
                callback(null);
                return;
            }
            splashScreen.setStatus(i18n.t("startup:status.installingCore"));
            splashScreen.setProgressVisible(true);
            splashScreen.setProgressMax(100);
            splashScreen.setProgressValue(null);
            const process = forkServerProcess_1.default(["update", "core", "--force", `--download-url=${registry.core.downloadURL}`]);
            // We need to drain stdout otherwise the process gets stuck
            process.stdout.on("data", (data) => { });
            let errorMessage;
            process.on("message", (event) => {
                if (event.type === "error") {
                    errorMessage = event.message;
                    return;
                }
                if (event.type !== "progress") {
                    // TODO: Whoops?! Handle error?
                    console.log(event);
                    return;
                }
                splashScreen.setProgressValue(event.value);
            });
            process.on("exit", (statusCode) => {
                splashScreen.setProgressVisible(false);
                if (statusCode !== 0) {
                    callback(new Error(errorMessage != null ? errorMessage : "Update failed"));
                    return;
                }
                splashScreen.setStatus(i18n.t("startup:status.installingCoreSucceed"));
                callback(null);
            });
        });
    });
}