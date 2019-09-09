"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron = require("electron");
const async = require("async");
const forkServerProcess_1 = require("../forkServerProcess");
const TreeView = require("dnd-tree-view");
const dialogs = require("simple-dialogs");
const html_1 = require("../html");
const i18n = require("../.i18n");
const localServer = require("../localServer");
const settingsElt = document.querySelector(".server-settings");
const systemsPaneElt = settingsElt.querySelector(".systems");
const treeView = new TreeView(systemsPaneElt.querySelector(".tree-view-container"), { multipleSelection: false });
treeView.addListener("selectionChange", updateUI);
const refreshButton = systemsPaneElt.querySelector(".registry .actions .refresh");
refreshButton.addEventListener("click", refreshRegistry);
const updateAllButton = systemsPaneElt.querySelector(".registry .actions .update-all");
updateAllButton.addEventListener("click", () => { updateAll(); });
const detailsElt = systemsPaneElt.querySelector(".details");
const selectionTitleElt = detailsElt.querySelector(".title");
const selectionActionsElt = detailsElt.querySelector(".actions");
const installOrUninstallButton = selectionActionsElt.querySelector(".install-uninstall");
installOrUninstallButton.addEventListener("click", installOrUninstallClick);
const updateButton = selectionActionsElt.querySelector(".update");
updateButton.addEventListener("click", onUpdateClick);
const releaseNotesButton = selectionActionsElt.querySelector(".release-notes");
releaseNotesButton.addEventListener("click", onReleaseNotesClick);
const installedElt = detailsElt.querySelector("tr.installed td");
const latestElt = detailsElt.querySelector("tr.latest td");
let registry;
let registryServerProcess;
const serverProcessById = {};;
let getRegistryCallbacks = [];

function getRegistry(callback) {
    if (registry != null) {
        callback(registry);
    } else {
        getRegistryCallbacks.push(callback);
        refreshRegistry();
    }
}
exports.getRegistry = getRegistry;

function refreshRegistry() {
    if (registryServerProcess != null)
        return;
    registry = null;
    treeView.clear();
    registryServerProcess = forkServerProcess_1.default(["registry"]);
    updateUI();
    registryServerProcess.on("message", onRegistryReceived);
    registryServerProcess.on("exit", () => {
        registryServerProcess = null;
        updateUI();
    });
}
exports.refreshRegistry = refreshRegistry;

function onRegistryReceived(event) {
    if (event.type !== "registry") {
        // TODO: Whoops?! Handle error?
        console.log(event);
        return;
    }
    if (event.error == null && event.registry != null) {
        registry = event.registry;
        const systemsById = registry.systems;
        for (const systemId in systemsById) {
            const system = systemsById[systemId];
            const systemElt = html_1.default("li", { dataset: { id: systemId } });
            html_1.default("div", "label", { parent: systemElt, textContent: systemId });
            html_1.default("div", "progress", { parent: systemElt });
            treeView.append(systemElt, "group");
            for (const authorName in system.plugins) {
                const plugins = system.plugins[authorName];
                const authorElt = html_1.default("li");
                html_1.default("div", "label", { parent: authorElt, textContent: `${authorName} (${Object.keys(plugins).length} plugins)` });
                treeView.append(authorElt, "group", systemElt);
                for (const pluginName in plugins) {
                    const pluginElt = html_1.default("li", { dataset: { id: `${systemId}:${authorName}/${pluginName}` } });
                    html_1.default("div", "label", { parent: pluginElt, textContent: pluginName });
                    html_1.default("div", "progress", { parent: pluginElt });
                    treeView.append(pluginElt, "item", authorElt);
                }
            }
        }
    } else {
        registry = null;
    }
    for (const getRegistryCallback of getRegistryCallbacks)
        getRegistryCallback(registry);
    getRegistryCallbacks.length = 0;
}

function action(command, item, callback) {
    getRegistry((registry) => {
        if (registry == null)
            return;
        const id = item.pluginName != null ? `${item.systemId}:${item.authorName}/${item.pluginName}` : item.systemId;
        const progressElt = treeView.treeRoot.querySelector(`li[data-id="${id}"] .progress`);
        const registryItem = item.pluginName != null ? registry.systems[item.systemId].plugins[item.authorName][item.pluginName] : registry.systems[item.systemId];
        progressElt.textContent = "...";
        const process = serverProcessById[id] = forkServerProcess_1.default([command, id, "--force", `--download-url=${registryItem.downloadURL}`]);
        process.stdout.on("data", () => {});
        updateUI();
        process.on("message", (event) => {
            if (event.type === "error") {
                new dialogs.InfoDialog(event.message);
                return;
            }
            if (event.type !== "progress") {
                // TODO: Whoops?! Handle error?
                console.log(event);
                return;
            }
            progressElt.textContent = `${event.value}%`;
        });
        process.on("exit", (statusCode) => {
            progressElt.textContent = "";
            delete serverProcessById[id];
            if (statusCode === 0) {
                if (command === "uninstall") {
                    registryItem.localVersion = null;
                    if (item.pluginName == null) {
                        for (const authorName in registry.systems[item.systemId].plugins) {
                            for (const pluginName in registry.systems[item.systemId].plugins[authorName]) {
                                registry.systems[item.systemId].plugins[authorName][pluginName].localVersion = null;
                            }
                        }
                    }
                } else {
                    registryItem.localVersion = registryItem.version;
                }
            }
            updateUI();
            if (callback != null)
                callback(statusCode === 0);
        });
    });
}
exports.action = action;

function updateAll(callback) {
    getRegistry((registry) => {
        if (registry == null)
            return;
        async.each(Object.keys(registry.systems), (systemId, cb) => {
            const system = registry.systems[systemId];
            async.parallel([
                (systemCb) => {
                    if (!system.isLocalDev && system.localVersion != null && system.version !== system.localVersion)
                        action("update", { systemId }, () => { systemCb(); });
                    else
                        systemCb();
                }, (pluginsCb) => {
                    async.each(Object.keys(system.plugins), (authorName, authorCb) => {
                        const pluginsByName = system.plugins[authorName];
                        async.each(Object.keys(pluginsByName), (pluginName, pluginCb) => {
                            const plugin = system.plugins[authorName][pluginName];
                            if (!plugin.isLocalDev && plugin.localVersion != null && plugin.version !== plugin.localVersion)
                                action("update", { systemId, authorName, pluginName }, () => { pluginCb(); });
                            else
                                pluginCb();
                        }, authorCb);
                    }, pluginsCb);
                }
            ], cb);
        }, () => {
            if (callback != null)
                callback();
        });
    });
}
exports.updateAll = updateAll;

function updateUI() {
    if (registryServerProcess != null) {
        refreshButton.disabled = true;
        detailsElt.hidden = true;
        localServer.setServerUpdating(false);
        return;
    }
    const updating = Object.keys(serverProcessById).length > 0;
    refreshButton.disabled = updating;
    localServer.setServerUpdating(updating);
    const id = treeView.selectedNodes.length === 1 ? treeView.selectedNodes[0].dataset["id"] : null;
    if (id != null) {
        detailsElt.hidden = false;
        const [systemId, pluginPath] = id.split(":");
        const [authorName, pluginName] = pluginPath != null ? pluginPath.split("/") : [null, null];
        const registrySystem = registry.systems[systemId];
        const registryItem = pluginName != null ? registrySystem.plugins[authorName][pluginName] : registrySystem;
        installOrUninstallButton.disabled = serverProcessById[id] != null || registryItem.isLocalDev || (pluginName != null && registrySystem.localVersion == null);
        updateButton.disabled = serverProcessById[id] != null || registryItem.isLocalDev || registryItem.localVersion == null || registryItem.version === registryItem.localVersion;
        const installOrUninstallAction = registryItem.isLocalDev || registryItem.localVersion == null ? "install" : "uninstall";
        installOrUninstallButton.textContent = i18n.t(`common:actions.${installOrUninstallAction}`);
        selectionTitleElt.textContent = id;
        installedElt.textContent = registryItem.isLocalDev ? "(dev)" : (registryItem.localVersion == null ? i18n.t("common:none") : registryItem.localVersion);
        latestElt.textContent = registryItem.version;
        // TODO: Update system details (description, ...)
    } else {
        detailsElt.hidden = true;
    }
}

function installOrUninstallClick() {
    const id = treeView.selectedNodes.length === 1 ? treeView.selectedNodes[0].dataset["id"] : null;
    if (id == null || serverProcessById[id] != null)
        return;
    const [systemId, pluginPath] = id.split(":");
    const [authorName, pluginName] = pluginPath != null ? pluginPath.split("/") : [null, null];
    const registryItem = pluginName != null ? registry.systems[systemId].plugins[authorName][pluginName] : registry.systems[systemId];
    action(registryItem.localVersion == null ? "install" : "uninstall", { systemId, authorName, pluginName });
}

function onUpdateClick() {
    const id = treeView.selectedNodes.length === 1 ? treeView.selectedNodes[0].dataset["id"] : null;
    if (id == null || serverProcessById[id] != null)
        return;
    const [systemId, pluginPath] = id.split(":");
    const [authorName, pluginName] = pluginPath != null ? pluginPath.split("/") : [null, null];
    action("update", { systemId, authorName, pluginName });
}

function onReleaseNotesClick() {
    const id = treeView.selectedNodes.length === 1 ? treeView.selectedNodes[0].dataset["id"] : null;
    if (id == null)
        return;
    const [systemId, pluginPath] = id.split(":");
    const [authorName, pluginName] = pluginPath != null ? pluginPath.split("/") : [null, null];
    const registryItem = pluginName != null ? registry.systems[systemId].plugins[authorName][pluginName] : registry.systems[systemId];
    electron.shell.openExternal(registryItem.releaseNotesURL);
}