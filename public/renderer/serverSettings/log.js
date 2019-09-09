"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ResizeHandle = require("resize-handle");
new ResizeHandle(document.querySelector(".server-log"), "bottom");
const settingsElt = document.querySelector(".server-settings");
const logTextarea = settingsElt.querySelector(".server-log textarea");
const clearServerLogButton = settingsElt.querySelector(".server-log button.clear");
clearServerLogButton.addEventListener("click", onClearLogButtonClick);
function append(text) {
    logTextarea.value += text;
    setTimeout(() => { logTextarea.scrollTop = logTextarea.scrollHeight; }, 0);
}
exports.append = append;
function onClearLogButtonClick(event) {
    event.preventDefault();
    logTextarea.value = "";
}
