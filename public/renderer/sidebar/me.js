"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chat = require("../chat");
const dialogs = require("simple-dialogs");
const i18n = require("../.i18n");
const settings = require("../settings");
const container = document.querySelector("body > .sidebar .me");
const nameElt = container.querySelector(".name");
const presenceElt = container.querySelector(".presence select");
const showIrcStatusButton = container.querySelector(".show-chat-status");

function start() {
    nameElt.textContent = settings.nickname;
    presenceElt.value = settings.presence;
}
exports.start = start;

function updatePresenceFromSettings() {
    presenceElt.value = settings.presence;
}
exports.updatePresenceFromSettings = updatePresenceFromSettings;
nameElt.addEventListener("click", (event) => {
    const options = {
        title: i18n.t("sidebar:setNickname.title"),
        initialValue: nameElt.textContent,
        validationLabel: i18n.t("common:actions.update"),
        pattern: chat.nicknamePatternString,
        required: true
    };
    new dialogs.PromptDialog("Enter a new nickname", options, (newNickname) => {
        if (newNickname != null) {
            nameElt.textContent = newNickname;
            settings.setNickname(newNickname);
            settings.scheduleSave();
            chat.onNicknameUpdated();
        }
    });
});
presenceElt.addEventListener("change", (event) => {
    settings.setPresence(presenceElt.value);
    settings.scheduleSave();
    chat.onPresenceUpdated();
});
showIrcStatusButton.addEventListener("click", (event) => {
    event.preventDefault();
    chat.openStatusTab();
});