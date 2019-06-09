"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
const electron = require("electron");
const async = require("async");
const fs = require("fs");
const fsMkdirp = require("mkdirp");
const childProcess = require("child_process");
const os = require("os");
const currentWindow = electron.remote.getCurrentWindow();
const tmpRoot = os.tmpdir();
const tmpCharacters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const getRandomTmpCharacter = () => tmpCharacters[Math.floor(Math.random() * tmpCharacters.length)];
const secretKey = crypto.randomBytes(48).toString("hex");
electron.ipcRenderer.send("setup-key", secretKey);
let nextIpcId = 0;
function getNextIpcId() {
    const ipcId = nextIpcId.toString();
    nextIpcId++;
    return ipcId;
}
const ipcCallbacks = {};
electron.ipcRenderer.on("choose-folder-callback", onFolderChosen);
electron.ipcRenderer.on("choose-file-callback", onFileChosen);
electron.ipcRenderer.on("authorize-folder-callback", onFolderAuthorized);
electron.ipcRenderer.on("check-path-authorization-callback", onPathAuthorizationChecked);
function onFolderChosen(event, ipcId, folderPath) {
    const callback = ipcCallbacks[ipcId];
    if (callback == null)
        return;
    delete ipcCallbacks[ipcId];
    callback(folderPath);
}
function onFileChosen(event, ipcId, filename) {
    const callback = ipcCallbacks[ipcId];
    if (callback == null)
        return;
    delete ipcCallbacks[ipcId];
    callback(filename);
}
function onFolderAuthorized(event, ipcId) {
    const callback = ipcCallbacks[ipcId];
    if (callback == null)
        return;
    delete ipcCallbacks[ipcId];
    callback();
}
function checkPathAuthorization(pathToCheck, callback) {
    const ipcId = getNextIpcId();
    ipcCallbacks[ipcId] = callback;
    electron.ipcRenderer.send("check-path-authorization", secretKey, ipcId, window.location.origin, pathToCheck);
}
function onPathAuthorizationChecked(event, ipcId, checkedPath, authorization) {
    const callback = ipcCallbacks[ipcId];
    if (callback == null)
        return;
    delete ipcCallbacks[ipcId];
    callback(checkedPath, authorization);
}
var SupApp;
(function (SupApp) {
    function onMessage(messageType, callback) {
        electron.ipcRenderer.addListener(`sup-app-message-${messageType}`, (event, ...args) => { callback(...args); });
    }
    SupApp.onMessage = onMessage;
    function sendMessage(windowId, message) {
        electron.ipcRenderer.send("send-message", windowId, message);
    }
    SupApp.sendMessage = sendMessage;
    function getCurrentWindow() { return currentWindow; }
    SupApp.getCurrentWindow = getCurrentWindow;
    function showMainWindow() { electron.ipcRenderer.send("show-main-window"); }
    SupApp.showMainWindow = showMainWindow;
    function openWindow(url, options) {
        if (options == null)
            options = {};
        if (options.size == null && options.minSize == null) {
            options.size = { width: 1280, height: 800 };
            options.minSize = { width: 800, height: 480 };
        }
        if (options.resizable == null)
            options.resizable = true;
        const electronWindowOptions = {
            icon: `${__dirname}/../ValjangEngine.ico`,
            useContentSize: true, autoHideMenuBar: true,
            resizable: options.resizable,
            webPreferences: { nodeIntegration: false, preload: `${__dirname}/index.js` }
        };
        if (options.size != null) {
            electronWindowOptions.width = options.size.width;
            electronWindowOptions.height = options.size.height;
        }
        if (options.minSize != null) {
            electronWindowOptions.minWidth = options.minSize.width;
            electronWindowOptions.minHeight = options.minSize.height;
        }
        const window = new electron.remote.BrowserWindow(electronWindowOptions);
        window.webContents.on("will-navigate", (event) => { event.preventDefault(); });
        window.loadURL(url);
        return window;
    }
    SupApp.openWindow = openWindow;
    function openLink(url) { electron.shell.openExternal(url); }
    SupApp.openLink = openLink;
    function showItemInFolder(path) { electron.shell.showItemInFolder(path); }
    SupApp.showItemInFolder = showItemInFolder;
    function createMenu() { return new electron.remote.Menu(); }
    SupApp.createMenu = createMenu;
    function createMenuItem(options) {
        return new electron.remote.MenuItem(options);
    }
    SupApp.createMenuItem = createMenuItem;
    let clipboard;
    (function (clipboard) {
        function copyFromDataURL(dataURL) {
            const image = electron.nativeImage.createFromDataURL(dataURL);
            electron.clipboard.writeImage(image);
        }
        clipboard.copyFromDataURL = copyFromDataURL;
    })(clipboard = SupApp.clipboard || (SupApp.clipboard = {}));
    function chooseFolder(callback) {
        const ipcId = getNextIpcId();
        ipcCallbacks[ipcId] = callback;
        electron.ipcRenderer.send("choose-folder", secretKey, ipcId, window.location.origin);
    }
    SupApp.chooseFolder = chooseFolder;
    function chooseFile(access, callback) {
        const ipcId = getNextIpcId();
        ipcCallbacks[ipcId] = callback;
        electron.ipcRenderer.send("choose-file", secretKey, ipcId, window.location.origin, access);
    }
    SupApp.chooseFile = chooseFile;
    function tryFileAccess(filePath, access, callback) {
        checkPathAuthorization(filePath, (err, authorization) => {
            if (authorization !== access) {
                callback(new Error("Unauthorized"));
                return;
            }
            fs.exists(filePath, (exists) => {
                callback(exists ? null : new Error("Not found"));
            });
        });
    }
    SupApp.tryFileAccess = tryFileAccess;
    function mkdirp(folderPath, callback) {
        checkPathAuthorization(folderPath, (normalizedFolderPath, authorization) => {
            if (authorization !== "readWrite") {
                callback(new Error(`Access to "${normalizedFolderPath}" hasn't been authorized for read/write.`));
                return;
            }
            fsMkdirp(normalizedFolderPath, callback);
        });
    }
    SupApp.mkdirp = mkdirp;
    function mktmpdir(callback) {
        let tempFolderPath;
        async.retry(10, (cb) => {
            let folderName = "ValjangEngine-temp-";
            for (let i = 0; i < 16; i++)
                folderName += getRandomTmpCharacter();
            tempFolderPath = `${tmpRoot}/${folderName}`;
            fs.mkdir(tempFolderPath, cb);
        }, (err) => {
            if (err != null) {
                callback(err, null);
                return;
            }
            const ipcId = getNextIpcId();
            ipcCallbacks[ipcId] = () => { callback(null, tempFolderPath); };
            electron.ipcRenderer.send("authorize-folder", secretKey, ipcId, window.location.origin, tempFolderPath);
        });
    }
    SupApp.mktmpdir = mktmpdir;
    function writeFile(filename, data, options, callback) {
        if (callback == null && typeof options === "function") {
            callback = options;
            options = null;
        }
        checkPathAuthorization(filename, (normalizedFilename, authorization) => {
            if (authorization !== "readWrite") {
                callback(new Error(`Access to "${normalizedFilename}" hasn't been authorized for read/write.`));
                return;
            }
            // This hack is required because buffers might be passed from another JS context
            // (for example, from the build dialog). The other JS context will have its own Buffer object
            // and fs.writeFile uses `instanceof` to check if the object is a buffer, so it would fail.
            let oldProto;
            if (data._isBuffer) {
                oldProto = data.__proto__;
                data.__proto__ = Buffer.prototype;
            }
            fs.writeFile(normalizedFilename, data, options, callback);
            if (data._isBuffer)
                data.__proto__ = oldProto;
        });
    }
    SupApp.writeFile = writeFile;
    function readDir(folderPath, callback) {
        fs.readdir(folderPath, callback);
    }
    SupApp.readDir = readDir;
    function spawnChildProcess(filename, args, callback) {
        checkPathAuthorization(filename, (normalizedFilename, authorization) => {
            if (authorization !== "execute") {
                callback(new Error(`Access to "${normalizedFilename}" for execution hasn't been authorized.`));
                return;
            }
            const spawnedProcess = childProcess.spawn(filename, args);
            callback(null, spawnedProcess);
        });
    }
    SupApp.spawnChildProcess = spawnChildProcess;
})(SupApp || (SupApp = {}));
global.SupApp = SupApp;
