
Object.defineProperty(exports, "__esModule", { value: true });
const fetch_1 = require("../../shared/fetch");
const i18n = require("../../../scripts/i18n");

function start() {
    let languageCode = i18n.languageCode;

    function fetchNews(callback) {
        fetch_1.default(`http://serveur1.chez.com/new.html`, { type: "text" }, callback);
    }
    fetchNews((err, data) => {
        if (data != null) {
            setupNews(data);
            return;
        }
        if (languageCode.indexOf("-") !== -1)
            languageCode = languageCode.split("-")[0];
        else
            languageCode = "en";
        fetchNews((err, data) => {
            languageCode = "en";
            fetchNews((err, data) => {
                setupNews(data);
            });
        });
    });
}
exports.start = start;

function setupNews(html) {
    const newsElt = document.querySelector(".home .news");
    if (html == null)
        newsElt.textContent = i18n.t("home:news.couldNotFetch");
    else
        newsElt.innerHTML = html;
}