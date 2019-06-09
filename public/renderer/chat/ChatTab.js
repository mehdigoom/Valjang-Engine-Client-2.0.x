"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ResizeHandle = require("resize-handle");
const TreeView = require("dnd-tree-view");
const tabs_1 = require("../tabs");
const chat = require("./index");
const tabs = require("../tabs");
const html_1 = require("../html");
const escapeHTML = require("escape-html");
const getBackgroundColor_1 = require("./getBackgroundColor");
const tabTemplate = document.querySelector("template.chat-tab");
const commandRegex = /^\/([^\s]*)(?:\s(.*))?$/;
class ChatTab {
    constructor(target, options) {
        this.target = target;
        this.users = {};
        this.onTextAreaKeyDown = (event) => {
            if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey)
                return;
            if (event.keyCode === 38 /* Up */) {
                if (this.previousMessage == null)
                    return;
                if (this.textAreaElt.value.length > 0)
                    return;
                event.preventDefault();
                this.textAreaElt.value = this.previousMessage;
            }
            else if (event.keyCode === 9 /* Tab */) {
                event.preventDefault();
                this.doNicknameAutocomplete();
            }
        };
        this.onTextAreaKeyPress = (event) => {
            if (event.keyCode === 13) {
                event.preventDefault();
                if (this.textAreaElt.value.length > 0) {
                    this.send(this.textAreaElt.value);
                    this.previousMessage = this.textAreaElt.value;
                    this.textAreaElt.value = "";
                }
            }
        };
        this.onChannelNamesReceived = (error, names) => {
            if (error != null) {
                this.addInfo(`Channel names error: ${error.message}`);
                return;
            }
            this.users = {};
            this.usersTreeView.treeRoot.innerHTML = "";
            names.sort((a, b) => a.name.localeCompare(b.name));
            for (const name of names) {
                let mode = "";
                if (name.mode.indexOf("@") !== -1)
                    mode += "o";
                if (name.mode.indexOf("+") !== -1)
                    mode += "v";
                this.addUser(name.name, mode);
            }
            if (this.waitingForTopic) {
                // If we receive the names before the topic then we can assume no topic has been set
                this.waitingForTopic = false;
                this.topicElt.textContent = "(No topic)";
            }
        };
        if (options == null)
            options = {};
        this.label = (options.label != null) ? options.label : target;
        if (options.showTab !== false)
            this.showTab(false);
        this.paneElt = document.createElement("div");
        this.paneElt.hidden = true;
        this.paneElt.dataset["name"] = `chat-${target}`;
        this.paneElt.className = "chat-tab";
        tabs_1.panesElt.appendChild(this.paneElt);
        this.paneElt.appendChild(document.importNode(tabTemplate.content, true));
        const headerElt = this.paneElt.querySelector(".header");
        let chatTabName = this.target;
        let chatTabDetails = `on ${chat.ircNetwork.host}:${chat.ircNetwork.port}`;
        let chatTabTopic = "(Waiting for topic...)";
        if (this.target === "status") {
            chatTabName = `${chat.ircNetwork.host}:${chat.ircNetwork.port}`;
            chatTabDetails = "";
            chatTabTopic = "Connection status";
        }
        else if (this.target[0] !== "#") {
            chatTabTopic = "Private chat";
        }
        else {
            this.waitingForTopic = true;
        }
        headerElt.querySelector(".info .name").textContent = chatTabName;
        headerElt.querySelector(".info .details").textContent = chatTabDetails;
        this.topicElt = headerElt.querySelector(".topic");
        this.topicElt.textContent = chatTabTopic;
        this.logElt = this.paneElt.querySelector(".log");
        this.textAreaElt = this.paneElt.querySelector("textarea");
        this.textAreaElt.addEventListener("keydown", this.onTextAreaKeyDown);
        this.textAreaElt.addEventListener("keypress", this.onTextAreaKeyPress);
        const sidebarElt = this.paneElt.querySelector(".sidebar");
        if (options.isChannel) {
            new ResizeHandle(sidebarElt, "right");
            this.usersTreeView = new TreeView(this.paneElt.querySelector(".users-tree-view"));
            if (chat.irc != null && chat.irc.me != null)
                this.join();
        }
        else {
            sidebarElt.parentElement.removeChild(sidebarElt.previousElementSibling); // Resize handle
            sidebarElt.parentElement.removeChild(sidebarElt);
        }
    }
    updateTarget(target) {
        this.target = target;
        this.paneElt.dataset["name"] = `chat-${target}`;
        this.label = target;
        if (this.tabElt != null) {
            this.tabElt.dataset["name"] = `chat-${this.target}`;
            this.tabElt.dataset["chatTarget"] = this.target;
            this.tabElt.querySelector(".label").textContent = this.label;
        }
    }
    showTab(focus) {
        if (this.tabElt == null) {
            this.tabElt = document.createElement("li");
            this.tabElt.dataset["name"] = `chat-${this.target}`;
            this.tabElt.dataset["chatTarget"] = this.target;
            const iconElt = document.createElement("img");
            iconElt.className = "icon";
            iconElt.src = "images/tabs/chat.svg";
            this.tabElt.appendChild(iconElt);
            const labelElt = document.createElement("div");
            this.tabElt.appendChild(labelElt);
            labelElt.className = "label";
            labelElt.textContent = this.label;
            const closeButton = document.createElement("button");
            closeButton.className = "close";
            this.tabElt.appendChild(closeButton);
        }
        if (this.tabElt.parentElement == null)
            tabs_1.tabStrip.tabsRoot.appendChild(this.tabElt);
        if (focus)
            tabs.onActivateTab(this.tabElt);
    }
    join() {
        this.addInfo(`Joining ${this.target}...`);
        chat.irc.join(this.target);
    }
    linkify(text) {
        text = escapeHTML(text);
        const channelRegex = /^(.*\s)?#([#A-Za-z0-9_-]+)/g;
        text = text.replace(channelRegex, "$1<a href=\"#\">#$2</a>");
        const linkRegex = /^(.*\s)?(http|https):\/\/([^\s]+)/g;
        text = text.replace(linkRegex, "$1<a href=\"$2://$3\">$2://$3</a>");
        return text;
    }
    appendLogElt(type, from, style) {
        let elt;
        let contentElt;
        if (this.lastLogItem != null &&
            this.lastLogItem.elt.classList.contains(type) &&
            this.lastLogItem.from === from &&
            this.lastLogItem.style === style) {
            elt = this.lastLogItem.elt;
            contentElt = elt.querySelector(".content");
        }
        else {
            elt = html_1.default("div", type);
            if (style != null)
                style.split(" ").forEach((x) => elt.classList.add(x));
            if (from != null) {
                const gutterElt = html_1.default("div", "gutter", { parent: elt });
                html_1.default("div", "avatar", {
                    textContent: from.substring(0, 2),
                    style: { backgroundColor: getBackgroundColor_1.default(from), },
                    parent: gutterElt
                });
            }
            contentElt = html_1.default("div", "content", { parent: elt });
            html_1.default("div", "from", { parent: contentElt, textContent: from });
            this.logElt.appendChild(elt);
        }
        this.lastLogItem = { elt, type, from, style };
        return contentElt;
    }
    scrollToBottom() {
        this.logElt.scrollTop = 9e9;
    }
    addInfo(text) {
        const contentElt = this.appendLogElt("info", null, null);
        html_1.default("div", "text", { innerHTML: this.linkify(text), parent: contentElt });
        this.scrollToBottom();
    }
    addMessage(from, text, style) {
        const contentElt = this.appendLogElt("message", from, style);
        html_1.default("div", "text", { innerHTML: this.linkify(text), parent: contentElt });
        this.scrollToBottom();
    }
    hasUser(nickname) {
        return this.users[nickname] != null;
    }
    addUser(nickname, mode) {
        if (this.hasUser(nickname))
            return;
        this.users[nickname] = { nickname, mode };
        const userElt = document.createElement("li");
        userElt.dataset["nickname"] = nickname;
        const modeElt = document.createElement("div");
        modeElt.className = "mode";
        modeElt.textContent = this.getModeSymbol(mode);
        userElt.appendChild(modeElt);
        const nicknameElt = document.createElement("div");
        nicknameElt.className = "nickname";
        nicknameElt.textContent = nickname;
        userElt.appendChild(nicknameElt);
        this.usersTreeView.append(userElt, "item");
    }
    getModeSymbol(mode) {
        if (mode.indexOf("o") !== -1)
            return "@";
        if (mode.indexOf("v") !== -1)
            return "+";
        return "";
    }
    removeUser(nickname) {
        if (!this.hasUser(nickname))
            return;
        delete this.users[nickname];
        const userElt = this.usersTreeView.treeRoot.querySelector(`li[data-nickname="${nickname}"]`);
        this.usersTreeView.remove(userElt);
    }
    send(message) {
        const result = commandRegex.exec(message);
        if (result != null) {
            this.handleCommand(result[1].toLocaleLowerCase(), result[2]);
            return;
        }
        if (chat.irc == null)
            this.addInfo("You are not connected.");
        else
            chat.send(this.target, message);
    }
    handleCommand(command, params) {
        if (chat.irc != null) {
            switch (command) {
                case "nick":
                    chat.irc.nick(params);
                    break;
                case "msg":
                    {
                        const index = params.indexOf(" ");
                        if (index === -1) {
                            this.addInfo("/msg: Please enter a message.");
                            return;
                        }
                        const target = params.slice(0, index);
                        const message = params.slice(index + 1);
                        if (!chat.send(target, message)) {
                            this.addInfo(`/msg: Can't send message to ${target}.`);
                            return;
                        }
                    }
                    break;
                case "join":
                    {
                        if (params.length === 0 || params[0] !== "#" || params.indexOf(" ") !== -1) {
                            this.addInfo("/join: Please enter a channel name.");
                            return;
                        }
                        chat.join(params, true);
                    }
                    break;
                default:
                    this.addInfo(`Unsupported command: ${command}`);
            }
        }
        else {
            this.addInfo("You are not connected.");
        }
    }
    onDisconnect(reason) {
        this.addInfo(reason != null ? `Disconnected: ${reason}.` : "Disconnected.");
        if (this.usersTreeView != null) {
            this.usersTreeView.clearSelection();
            this.usersTreeView.treeRoot.innerHTML = "";
            this.users = {};
        }
    }
    onTopic(event) {
        this.topicElt.classList.toggle("disabled", event.topic.length === 0);
        this.topicElt.textContent = event.topic.length > 0 ? event.topic : "(No topic)";
        this.waitingForTopic = false;
    }
    onJoin(event) {
        this.addInfo(`${event.nick} has joined ${event.channel}.`);
        if (event.nick === chat.irc.me) {
            chat.irc.names(this.target, this.onChannelNamesReceived);
        }
        else {
            this.addUser(event.nick, "");
        }
    }
    onPart(event) {
        this.addInfo(`${event.nick} has parted ${event.channels[0]}.`);
        this.removeUser(event.nick);
    }
    onNick(event) {
        this.addInfo(`${event.nick} has changed nick to ${event.new}.`);
        const oldUser = this.users[event.nick];
        if (oldUser == null)
            return;
        delete this.users[event.nick];
        this.users[event.new] = { nickname: event.new, mode: oldUser.mode };
        const userElt = this.usersTreeView.treeRoot.querySelector(`li[data-nickname="${event.nick}"]`);
        userElt.dataset["nickname"] = event.new;
        userElt.querySelector(".nickname").textContent = event.new;
    }
    onMode(event) {
        const user = this.users[event.client];
        if (user == null)
            return;
        let addingMode = true;
        for (const c of event.mode) {
            if (c === "+")
                addingMode = true;
            else if (c === "-")
                addingMode = false;
            else {
                const index = user.mode.indexOf(c);
                if (addingMode && index === -1)
                    user.mode += c;
                else if (!addingMode && index !== -1)
                    user.mode = user.mode.substring(0, index) + user.mode.substring(index + 1);
            }
        }
        const userElt = this.usersTreeView.treeRoot.querySelector(`li[data-nickname="${event.client}"]`);
        userElt.querySelector(".mode").textContent = this.getModeSymbol(user.mode);
    }
    onAway(event) {
        if (event.message.length > 0)
            this.addInfo(`${event.nick} is now away: ${event.message}.`);
        else
            this.addInfo(`${event.nick} is now back: ${event.message}.`);
    }
    onQuit(event) {
        this.addInfo(`${event.nick} has quit (${event.message}).`);
        this.removeUser(event.nick);
    }
    doNicknameAutocomplete() {
        const stubStartIndex = this.textAreaElt.value.lastIndexOf(" ", this.textAreaElt.selectionStart - 1) + 1;
        const stubEndIndex = this.textAreaElt.selectionStart;
        const stub = this.textAreaElt.value.slice(stubStartIndex, stubEndIndex).toLowerCase();
        if (stub.length === 0)
            return;
        const matches = [];
        for (const user in this.users) {
            if (user.toLowerCase().indexOf(stub) === 0)
                matches.push(user);
        }
        if (matches.length === 1) {
            this.textAreaElt.value = `${this.textAreaElt.value.slice(0, stubStartIndex)}${matches[0]} `;
        }
        else if (matches.length > 1) {
            this.addInfo(`Matching users: ${matches.join(", ")}.`);
        }
    }
}
exports.default = ChatTab;
