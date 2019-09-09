"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const updateManager = require("./updateManager");
const loadingElt = document.querySelector(".loading");
const appVersionElt = loadingElt.querySelector(".version");
appVersionElt.textContent = updateManager.appVersion;
const splashElt = loadingElt.querySelector(".splash");
const statusElt = loadingElt.querySelector(".status");
const progressElt = loadingElt.querySelector(".progress");
const progressBarElt = progressElt.querySelector("progress");
splashElt.hidden = false;
let onAppReady;
let splashInAnim = splashElt.animate([
    { opacity: "0", transform: "translateY(-50vh)" },
    { opacity: "1", transform: "translateY(0)" }
], { duration: 500, easing: "ease-out" });
splashInAnim.addEventListener("finish", () => {
    splashInAnim = null;
    if (onAppReady != null)
        onAppReady();
});
function setStatus(text) {
    statusElt.textContent = text;
}
exports.setStatus = setStatus;
function setProgressVisible(visible) {
    progressElt.hidden = !visible;
}
exports.setProgressVisible = setProgressVisible;
function setProgressValue(value) {
    progressBarElt.value = value;
}
exports.setProgressValue = setProgressValue;
function setProgressMax(max) {
    progressBarElt.max = max;
}
exports.setProgressMax = setProgressMax;
let fadeOutCallback;
function fadeOut(callback) {
    fadeOutCallback = callback;
    if (splashInAnim != null)
        onAppReady = playOutAnimation;
    else
        playOutAnimation();
}
exports.fadeOut = fadeOut;
function playOutAnimation() {
    const statusOutAnim = statusElt.animate([{ opacity: "1" }, { opacity: "0" }], { duration: 300, easing: "ease-in" });
    statusOutAnim.addEventListener("finish", () => {
        statusElt.style.opacity = "0";
        const loadingOutAnim = loadingElt.animate([
            { opacity: "1" },
            { opacity: "0" }
        ], { duration: 300, easing: "ease-in" });
        /* const splashOutAnim = */ splashElt.animate([
            { transform: "scale(1, 1)" },
            { transform: "scale(5, 5)" }
        ], { duration: 100, easing: "ease-in" });
        loadingOutAnim.addEventListener("finish", () => {
            loadingElt.parentElement.removeChild(loadingElt);
            fadeOutCallback();
        });
    });
}
