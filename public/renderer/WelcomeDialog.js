"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dialogs = require("simple-dialogs");
const i18n = require("../shared/i18n");
const chat_1 = require("./chat");
class WelcomeDialog extends dialogs.BaseDialog {
    constructor(callback) {
        super(callback);
        const header = document.createElement("header");
        header.textContent = i18n.t("welcome:title");
        this.formElt.appendChild(header);
        const promptElt = document.createElement("div");
        promptElt.className = "group";
        promptElt.textContent = i18n.t("welcome:prompt");
        this.formElt.appendChild(promptElt);
        // Nickname
        const nicknameGroup = document.createElement("div");
        nicknameGroup.className = "group";
        nicknameGroup.style.display = "flex";
        this.formElt.appendChild(nicknameGroup);
        this.nicknameField = document.createElement("input");
        this.nicknameField.id = "nickname-field";
        this.nicknameField.type = "text";
        this.nicknameField.placeholder = i18n.t("welcome:nickname");
        this.nicknameField.required = true;
        this.nicknameField.maxLength = 16;
        this.nicknameField.pattern = chat_1.nicknamePatternString;
        nicknameGroup.appendChild(this.nicknameField);
        this.nicknameField.style.flex = "1 1 0";
        // Connect to chat
        const downElt = document.createElement("div");
        this.formElt.appendChild(downElt);
        downElt.style.display = "flex";
        downElt.style.alignItems = "center";
        this.connectToChatCheckbox = document.createElement("input");
        this.connectToChatCheckbox.type = "checkbox";
        this.connectToChatCheckbox.checked = true;
        downElt.appendChild(this.connectToChatCheckbox);
        this.connectToChatCheckbox.id = "go-online-checkbox";
        const goOnlineLabel = document.createElement("label");
        goOnlineLabel.textContent = i18n.t("welcome:connectToChat");
        goOnlineLabel.style.flex = "1 1 0";
        downElt.appendChild(goOnlineLabel);
        goOnlineLabel.htmlFor = "go-online-checkbox";
        // Buttons
        const buttonsElt = document.createElement("div");
        buttonsElt.className = "buttons";
        downElt.appendChild(buttonsElt);
        this.validateButtonElt = document.createElement("button");
        this.validateButtonElt.textContent = i18n.t("welcome:getStarted");
        this.validateButtonElt.className = "validate-button";
        buttonsElt.appendChild(this.validateButtonElt);
        this.nicknameField.focus();
    }
    submit() {
        super.submit({
            nickname: this.nicknameField.value,
            connectToChat: this.connectToChatCheckbox.checked
        });
    }
}
exports.default = WelcomeDialog;