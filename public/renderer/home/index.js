"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const news = require("./news");
const chat = require("../chat");
const chatrooms = document.querySelector(".home .sidebar .chatrooms");
chatrooms.addEventListener("click", onChatroomClick);

function start() {
    news.start();
}
exports.start = start;

function onChatroomClick(event) {
    const target = event.target;
    if (target.tagName !== "A")
        return;
    event.preventDefault();
    chat.join(target.dataset["channel"], true);
}