"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./me");
const ResizeHandle = require("resize-handle");
const TreeView = require("dnd-tree-view");
const simple_dialogs_1 = require("simple-dialogs");
const i18n = require("i18n");
const AddOrEditServerDialog_1 = require("./AddOrEditServerDialog");
const settings = require("../settings");
const openServer_1 = require("../tabs/openServer");
new ResizeHandle(document.querySelector("body > .sidebar"), "left");
const addServerBtn = document.querySelector(".add-server");
const editServerBtn = document.querySelector(".edit-server");
const removeServerBtn = document.querySelector(".remove-server");
const serversTreeView = new TreeView(document.querySelector(".servers-tree-view"), { dropCallback: onServerDrop });

function start() {
    for (const serverEntry of settings.favoriteServers)
        addServer(serverEntry);
    addServerBtn.disabled = false;
}
exports.start = start;
addServerBtn.addEventListener("click", onAddServerClick);
editServerBtn.addEventListener("click", onEditServerClick);
removeServerBtn.addEventListener("click", onRemoveServerClick);
serversTreeView.on("selectionChange", updateSelectedServer);
serversTreeView.on("activate", onServerActivate);

function onAddServerClick(event) {
    const addOrEditOptions = {
        validationLabel: "Add",
        initialHostnameValue: "127.0.0.1",
        initialPortValue: "4237",
        initialLabelValue: "",
        initialHttpUsernameValue: "",
        initialHttpPasswordValue: ""
    };
    new AddOrEditServerDialog_1.default(i18n.t("sidebar:addServer.title"), addOrEditOptions, (newServer) => {
        if (newServer == null)
            return;
        let id = 0;
        for (const server of settings.favoriteServers)
            id = Math.max(id, parseInt(server.id, 10) + 1);
        newServer.id = id.toString();
        addServer(newServer);
        settings.favoriteServers.push(newServer);
        settings.favoriteServersById[newServer.id] = newServer;
        settings.scheduleSave();
    });
}

function onEditServerClick(event) {
    const serverId = parseInt(serversTreeView.selectedNodes[0].dataset["serverId"], 10);
    const serverEntry = settings.favoriteServersById[serverId];
    const addOrEditOptions = {
        validationLabel: i18n.t("common:actions.save"),
        initialHostnameValue: serverEntry.hostname,
        initialPortValue: serverEntry.port,
        initialLabelValue: serverEntry.label,
        initialHttpUsernameValue: serverEntry.httpUsername,
        initialHttpPasswordValue: serverEntry.httpPassword
    };
    new AddOrEditServerDialog_1.default(i18n.t("sidebar:editServer.title"), addOrEditOptions, (updatedEntry) => {
        if (updatedEntry == null)
            return;
        serverEntry.hostname = updatedEntry.hostname;
        serverEntry.port = updatedEntry.port;
        serverEntry.label = updatedEntry.label;
        serverEntry.httpUsername = updatedEntry.httpUsername;
        serverEntry.httpPassword = updatedEntry.httpPassword;
        const selectedServerElt = serversTreeView.treeRoot.querySelector(`li[data-server-id="${serverId}"]`);
        const host = serverEntry.hostname + (serverEntry.port != null ? `:${serverEntry.port}` : "");
        selectedServerElt.querySelector(".host").textContent = host;
        selectedServerElt.querySelector(".label").textContent = serverEntry.label;
        settings.scheduleSave();
    });
}

function onRemoveServerClick(event) {
    new simple_dialogs_1.ConfirmDialog("Are you sure you want to remove the server?", { validationLabel: "Remove" }, (confirm) => {
        if (!confirm)
            return;
        const selectedServerId = serversTreeView.selectedNodes[0].dataset["serverId"];
        const selectedServerElt = serversTreeView.treeRoot.querySelector(`li[data-server-id="${selectedServerId}"]`);
        serversTreeView.treeRoot.removeChild(selectedServerElt);
        const favoriteServer = settings.favoriteServersById[selectedServerId];
        delete settings.favoriteServersById[selectedServerId];
        settings.favoriteServers.splice(settings.favoriteServers.indexOf(favoriteServer), 1);
        settings.scheduleSave();
    });
}

function addServer(serverEntry) {
    const serverElt = document.createElement("li");
    serverElt.dataset["serverId"] = serverEntry.id;
    serversTreeView.append(serverElt, "item");
    const labelElt = document.createElement("div");
    labelElt.classList.add("label");
    labelElt.textContent = serverEntry.label;
    serverElt.appendChild(labelElt);
    const hostElt = document.createElement("div");
    hostElt.classList.add("host");
    const host = serverEntry.hostname + (serverEntry.port != null ? `:${serverEntry.port}` : "");
    hostElt.textContent = host;
    serverElt.appendChild(hostElt);
}

function onServerDrop(event, dropLocation, orderedNodes) {
    // TODO
    return false;
}

function updateSelectedServer() {
    if (serversTreeView.selectedNodes.length === 0) {
        editServerBtn.disabled = true;
        removeServerBtn.disabled = true;
    } else {
        editServerBtn.disabled = false;
        removeServerBtn.disabled = false;
    }
}

function onServerActivate() {
    if (serversTreeView.selectedNodes.length === 0)
        return;
    const serverId = serversTreeView.selectedNodes[0].dataset["serverId"];
    openServer_1.default(settings.favoriteServersById[serverId]);
}