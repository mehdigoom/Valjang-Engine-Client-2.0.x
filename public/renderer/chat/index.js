"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tls = require("tls");
const SlateIRC = require("slate-irc");
const settings = require("../settings");
const tabs = require("../tabs");
const sidebarMe = require("../sidebar/me");
const ChatTab_1 = require("./ChatTab");
exports.nicknamePattern = /^([A-Za-z][A-Za-z0-9_-]{1,15})$/;
exports.nicknamePatternString = exports.nicknamePattern.toString().slice(1, -1);
exports.languageChatRooms = ["fr"];
let socket;
exports.ircNetwork = { host: "irc.freenode.net", port: 6697 };
let mentionRegex;
const statusChatTab = new ChatTab_1.default("status", { label: exports.ircNetwork.host, showTab: false });
statusChatTab.paneElt.dataset["persist"] = "true";
const channelChatTabs = {};
const privateChatTabs = {};
tabs.tabStrip.on("closeTab", onCloseTab);
function start() {
    if (settings.presence !== "offline") {
        connect();
        for (const roomName of settings.savedChatrooms) {
            join(roomName, false);
            channelChatTabs[roomName].addInfo("Connecting...");
        }
    }
}
exports.start = start;
function openStatusTab() {
    statusChatTab.showTab(true);
}
exports.openStatusTab = openStatusTab;
function onPresenceUpdated() {
    if (settings.presence !== "offline") {
        if (socket == null)
            connect();
        else {
            // TODO: Use this once https://github.com/slate/slate-irc/pull/38 is merged
            // irc.away(settings.presence === "away" ? "Away" : "");
            exports.irc.write(`AWAY :${settings.presence === "away" ? "Away" : ""}`);
        }
    }
    else {
        disconnect();
    }
}
exports.onPresenceUpdated = onPresenceUpdated;
function onNicknameUpdated() {
    if (socket == null)
        return;
    if (exports.irc.me !== settings.nickname) {
        exports.irc.nick(settings.nickname);
    }
}
exports.onNicknameUpdated = onNicknameUpdated;
function onCloseTab(tabElement) {
    const name = tabElement.dataset["chatTarget"];
    if (name == null)
        return;
    const chatTab = channelChatTabs[name];
    if (chatTab != null) {
        if (exports.irc != null)
            exports.irc.part(name);
        delete channelChatTabs[name];
        settings.savedChatrooms.splice(settings.savedChatrooms.indexOf(name), 1);
        return;
    }
    const privateChatTab = privateChatTabs[name];
    if (privateChatTab != null) {
        delete privateChatTabs[name];
    }
}
function connect() {
    if (socket != null)
        return;
    statusChatTab.addInfo(`Connecting to ${exports.ircNetwork.host}:${exports.ircNetwork.port}...`);
    for (const name in channelChatTabs)
        channelChatTabs[name].addInfo("Connecting...");
    for (const name in privateChatTabs)
        privateChatTabs[name].addInfo("Connecting...");
    socket = tls.connect({ host: exports.ircNetwork.host, port: exports.ircNetwork.port, rejectUnauthorized: false });
    socket.on("error", onSocketError);
    exports.irc = SlateIRC(socket);
    exports.irc.on("welcome", onWelcome);
    exports.irc.on("motd", onMOTD);
    exports.irc.on("topic", onTopic);
    exports.irc.on("join", onJoin);
    exports.irc.on("part", onPart);
    exports.irc.on("nick", onNick);
    exports.irc.on("mode", onMode);
    exports.irc.on("away", onAway);
    exports.irc.on("quit", onQuit);
    exports.irc.on("data", onData);
    exports.irc.on("message", onMessage);
    exports.irc.on("notice", onNotice);
    exports.irc.on("disconnect", onDisconnect);
    exports.irc.nick(settings.nickname);
    exports.irc.user(settings.nickname, settings.nickname);
}
function disconnect() { cleanUp(null); }
exports.disconnect = disconnect;
function onSocketError(err) { cleanUp(err.message); }
function setupMentionRegex() {
    mentionRegex = new RegExp(`(.*\\s)?${exports.irc.me}([^\\w]*)`, "g");
}
function onWelcome(name) {
    statusChatTab.addInfo(`Connected as ${exports.irc.me}.`);
    setupMentionRegex();
    if (settings.presence === "away") {
        // TODO: Use this once https://github.com/slate/slate-irc/pull/38 is merged
        // irc.away("Away");
        exports.irc.write(`AWAY :Away`);
    }
    for (const name in channelChatTabs)
        channelChatTabs[name].join();
    return;
}
function onMOTD(event) {
    for (const line of event.motd)
        statusChatTab.addInfo(line);
}
function send(target, message) {
    exports.irc.send(target, message);
    let chatTab;
    if (target[0] === "#") {
        chatTab = channelChatTabs[target];
        if (chatTab == null)
            return false;
    }
    else {
        chatTab = privateChatTabs[target];
        if (chatTab == null) {
            chatTab = new ChatTab_1.default(target);
            privateChatTabs[target] = chatTab;
        }
    }
    chatTab.addMessage(exports.irc.me, message, "me");
    return true;
}
exports.send = send;
function join(channelName, focus) {
    channelName = channelName.toLowerCase();
    let chatTab = channelChatTabs[channelName];
    if (chatTab == null) {
        chatTab = new ChatTab_1.default(channelName, { isChannel: true });
        channelChatTabs[chatTab.target] = chatTab;
        if (settings.savedChatrooms.indexOf(channelName) === -1)
            settings.savedChatrooms.push(channelName);
    }
    if (settings.presence === "offline") {
        settings.setPresence("online");
        sidebarMe.updatePresenceFromSettings();
        connect();
    }
    settings.scheduleSave();
    chatTab.showTab(focus === true);
}
exports.join = join;
function onTopic(event) {
    const chatTab = channelChatTabs[event.channel];
    if (chatTab != null)
        chatTab.onTopic(event);
}
function onJoin(event) {
    const chatTab = channelChatTabs[event.channel];
    if (chatTab != null)
        chatTab.onJoin(event);
}
function onPart(event) {
    for (const channel of event.channels) {
        const chatTab = channelChatTabs[channel];
        if (chatTab != null)
            chatTab.onPart(event);
    }
}
function onNick(event) {
    if (exports.irc.me === event.new)
        setupMentionRegex();
    for (const name in channelChatTabs) {
        const chatTab = channelChatTabs[name];
        if (chatTab.hasUser(event.nick))
            chatTab.onNick(event);
    }
    const privateChatTab = privateChatTabs[event.nick];
    if (privateChatTab != null) {
        delete privateChatTabs[event.nick];
        privateChatTabs[event.new] = privateChatTab;
        privateChatTab.updateTarget(event.new);
    }
}
function onMode(event) {
    const chatTab = channelChatTabs[event.target];
    if (chatTab != null)
        chatTab.onMode(event);
}
function onAway(event) {
    for (const name in channelChatTabs) {
        const chatTab = channelChatTabs[name];
        if (chatTab.hasUser(event.nick))
            chatTab.onAway(event);
    }
    const privateChatTab = privateChatTabs[event.nick];
    if (privateChatTab != null)
        privateChatTab.onAway(event);
}
function onQuit(event) {
    for (const name in channelChatTabs) {
        const chatTab = channelChatTabs[name];
        if (chatTab.hasUser(event.nick))
            chatTab.onQuit(event);
    }
    const privateChatTab = privateChatTabs[event.nick];
    if (privateChatTab != null)
        privateChatTab.onQuit(event);
}
const ignoredCommands = [
    "NICK", "PRIVMSG", "NOTICE",
    "JOIN", "PART", "QUIT",
    "PING"
];
function onData(event) {
    if (ignoredCommands.indexOf(event.command) !== -1 || event.command.slice(0, 4) === "RPL_") {
        console.log(`Data: ${event.string}`);
        return;
    }
    statusChatTab.addInfo(`== ${event.string}`);
}
function onMessage(event) {
    if (event.to === exports.irc.me) {
        let privateChatTab = privateChatTabs[event.from];
        if (privateChatTab == null) {
            privateChatTab = new ChatTab_1.default(event.from);
            privateChatTabs[event.from] = privateChatTab;
        }
        privateChatTab.addMessage(event.from, event.message, "private");
        notify(`Private message from ${event.from}`, event.message, () => { privateChatTab.showTab(true); });
    }
    else {
        const chatTab = channelChatTabs[event.to];
        if (chatTab == null)
            return;
        if (mentionRegex != null && mentionRegex.test(event.message)) {
            notify(`Mentioned by ${event.from} in ${event.to}`, event.message, () => { chatTab.showTab(true); });
        }
        chatTab.addMessage(event.from, event.message, null);
    }
}
function notify(title, body, callback) {
    const notification = new window.Notification(title, { icon: "/images/icon.png", body: body });
    const closeTimeoutId = setTimeout(() => { notification.close(); }, 5000);
    notification.addEventListener("click", () => {
        window.focus();
        clearTimeout(closeTimeoutId);
        notification.close();
        callback();
    });
}
function onNotice(event) {
    if (event.to === "*") {
        statusChatTab.addMessage(event.from, event.message, "private notice");
        return;
    }
    if (event.to === exports.irc.me) {
        let privateChatTab = privateChatTabs[event.from];
        if (privateChatTab == null) {
            privateChatTab = new ChatTab_1.default(event.from);
            privateChatTabs[event.from] = privateChatTab;
        }
        privateChatTab.addMessage(event.from, event.message, "notice");
        notify(`Private notice from ${event.from}`, event.message, () => { privateChatTab.showTab(true); });
    }
    else {
        const chatTab = channelChatTabs[event.to];
        if (chatTab == null)
            return;
        if (mentionRegex != null && mentionRegex.test(event.message)) {
            notify(`Mentioned by ${event.from} in ${event.to}`, event.message, () => {
                chatTab.showTab(true);
            });
        }
        chatTab.addMessage(event.from, event.message, "notice");
    }
}
function onDisconnect() {
    cleanUp();
}
function cleanUp(reason) {
    if (socket != null) {
        socket.destroy();
        socket = null;
    }
    exports.irc = null;
    for (const name in channelChatTabs)
        channelChatTabs[name].onDisconnect(reason);
    statusChatTab.onDisconnect(reason);
}
