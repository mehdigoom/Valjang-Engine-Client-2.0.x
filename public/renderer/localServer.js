"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const forkServerProcess_1 = require("./forkServerProcess");
const settings = require("./settings");
const i18n = require(".i18n");
const openServerSettings_1 = require("./tabs/openServerSettings");
const serverSettings = require("./serverSettings");
const log_1 = require("./serverSettings/log");
let serverProcess;
const localServerElt = document.querySelector(".local-server");
const statusElt = localServerElt.querySelector(".status");
const startStopServerButton = localServerElt.querySelector(".start-stop");
const settingsButton = localServerElt.querySelector(".settings");

function start() {
    startStopServerButton.addEventListener("click", startStopServer);
    settingsButton.addEventListener("click", openServerSettings_1.default);
    if (settings.autoStartServer)
        startServer();
}
exports.start = start;

function startStopServer() {
    if (serverProcess == null)
        startServer();
    else
        stopServer();
}

function startServer() {
    if (serverProcess != null)
        return;
    statusElt.textContent = i18n.t("server:status.starting");
    startStopServerButton.textContent = i18n.t("server:buttons.stop");
    serverSettings.enable(false);
    serverSettings.applyScheduledSave();
    serverProcess = forkServerProcess_1.default(["start"]);
    serverProcess.on("exit", onServerExit);
    serverProcess.on("message", onServerMessage);
    serverProcess.stdout.on("data", (data) => { log_1.append(String(data)); });
    serverProcess.stderr.on("data", (data) => { log_1.append(String(data)); });
}
let shutdownCallback;

function shutdown(callback) {
    if (serverProcess == null) {
        callback();
        return;
    }
    shutdownCallback = callback;
    stopServer();
}
exports.shutdown = shutdown;

function setServerUpdating(updating) {
    startStopServerButton.disabled = updating;
    statusElt.textContent = i18n.t(`server:status.${updating ? "updating" : "stopped"}`);
}
exports.setServerUpdating = setServerUpdating;

function stopServer() {
    if (serverProcess == null)
        return;
    statusElt.textContent = i18n.t("server:status.stopping");
    startStopServerButton.textContent = i18n.t("server:buttons.start");
    startStopServerButton.disabled = true;
    serverProcess.send("stop");
}
exports.stopServer = stopServer;

function onServerExit() {
    serverProcess = null;
    statusElt.textContent = i18n.t("server:status.stopped");
    startStopServerButton.textContent = i18n.t("server:buttons.start");
    startStopServerButton.disabled = false;
    serverSettings.enable(true);
    log_1.append("\n");
    if (shutdownCallback != null) {
        shutdownCallback();
        shutdownCallback = null;
    }
}

function onServerMessage(msg) {
    if (typeof msg !== "object")
        return;
    switch (msg.type) {
        case "started":
            statusElt.textContent = i18n.t("server:status.started");
            break;
    }
}