
Object.defineProperty(exports, "__esModule", { value: true });
var electron = require("electron");
var  dialogs = require("simple-dialogs");
var  async = require("async");
var  i18n = require("../shared/i18n");
var  settings = require("./settings");
var  splashScreen = require("./splashScreen");
var updateManager = require("./updateManager");
var  sidebar = require("./sidebar");
var  me = require("./sidebar/me");
var  home = require("./home");
var  serverSettings = require("./serverSettings");
var  serverSettingsSystems = require("./serverSettings/systems");
var  tabs = require("./tabs");
var  openServerSettings_1 = require("./tabs/openServerSettings");
var  localServer = require("./localServer");
var chat = require("./chat");
var WelcomeDialog_1 = require("./WelcomeDialog");
electron.ipcRenderer.on("init", onInitialize);
electron.ipcRenderer.on("quit", onQuit);
var  namespaces = [
    "common", "startup",
    "sidebar", "server",
    "welcome", "home"
];

function onInitialize(sender, corePath, userDataPath, languageCode) {
    settings.setPaths(corePath, userDataPath);
    i18n.setLanguageCode(languageCode);
    i18n.load(namespaces, () => { settings.load(onSettingsLoaded); });
}

function onQuit() {
    serverSettings.applyScheduledSave();
    settings.applyScheduledSave();
    localServer.shutdown(() => { electron.ipcRenderer.send("ready-to-quit"); });
}

function onSettingsLoaded(err) {
    if (err != null) {
        const label = i18n.t("startup:errors.couldNotLoadSettings", {
            settingsPath: `${settings.userDataPath}/settings.json`,
            reason: err.message
        });
        const options = {
            validationLabel: i18n.t("startup:startAnyway"),
            cancelLabel: i18n.t("common:actions.close")
        };
        new dialogs.ConfirmDialog(label, options, (shouldProceed) => {
            if (!shouldProceed) {
                electron.remote.app.quit();
                return;
            }
            updateManager.checkForUpdates(start);
        });
        return;
    }
    updateManager.checkForUpdates(start);
}

function start() {
    sidebar.start();
    home.start();
    serverSettings.start();
    splashScreen.fadeOut(() => {
        if (settings.nickname == null) {
            async.series([showWelcomeDialog, installFirstSystem]);
        } else {
            me.start();
            chat.start();
            updateSystemsAndPlugins();
        }
    });
}

function showWelcomeDialog(callback) {
    new WelcomeDialog_1.default((result) => {
        if (result != null) {
            settings.setNickname(result.nickname);
            settings.setPresence(result.connectToChat ? "online" : "offline");
            settings.setSavedChatrooms(["#ValjangEngine-html5"]);
            if (i18n.languageCode !== "en" && chat.languageChatRooms.indexOf(i18n.languageCode) !== -1) {
                settings.savedChatrooms.push(`#ValjangEngine-html5-${i18n.languageCode}`);
            }
        } else {
            settings.setNickname("Nickname");
            settings.setPresence("offline");
        }
        settings.scheduleSave();
        me.start();
        chat.start();
        setTimeout(callback, 500);
    });
}

function installFirstSystem(callback) {
    const label = i18n.t("welcome:askGameInstall.prompt");
    const options = {
        header: i18n.t("welcome:askGameInstall.title"),
        validationLabel: i18n.t("common:actions.install"),
        cancelLabel: i18n.t("common:actions.skip")
    };
    new dialogs.ConfirmDialog(label, options, (installGame) => {
        if (!installGame) {
            localServer.start();
            callback();
            return;
        }
        const waitingGameInstallElt = document.querySelector(".waiting-game-install");
        async.series([
            (cb) => {
                openServerSettings_1.default();
                serverSettingsSystems.action("install", { systemId: "game" }, () => { cb(); });
                waitingGameInstallElt.hidden = false;
            },
            (cb) => {
                waitingGameInstallElt.hidden = true;
                const label = i18n.t("welcome:serverInformation.info");
                const options = {
                    haeder: i18n.t("welcome:serverInformation.title"),
                    closeLabel: i18n.t("welcome:serverInformation.gotIt")
                };
                new dialogs.InfoDialog(label, options, cb);
            },
            (cb) => {
                localServer.start();
                const label = i18n.t("welcome:sidebarInformation.info");
                const options = {
                    header: i18n.t("welcome:sidebarInformation.title"),
                    closeLabel: dialogs.BaseDialog.defaultLabels.close
                };
                new dialogs.InfoDialog(label, options, cb);
            },
            (cb) => {
                const homeTabElt = tabs.tabStrip.tabsRoot.querySelector(`li[data-name="home"]`);
                tabs.onActivateTab(homeTabElt);
                callback();
            }
        ]);
    });
}

function updateSystemsAndPlugins() {
    serverSettingsSystems.getRegistry((registry) => {
        if (registry == null) {
            localServer.start();
            return;
        }
        const systemsAndPlugins = [];
        for (const systemId in registry.systems) {
            const system = registry.systems[systemId];
            if (!system.isLocalDev && system.localVersion != null && system.version !== system.localVersion)
                systemsAndPlugins.push(systemId);
            for (const authorName in system.plugins) {
                for (const pluginName in system.plugins[authorName]) {
                    const plugin = system.plugins[authorName][pluginName];
                    if (!plugin.isLocalDev && plugin.localVersion != null && plugin.version !== plugin.localVersion)
                        systemsAndPlugins.push(`${systemId}:${authorName}/${pluginName}`);
                }
            }
        }
        if (systemsAndPlugins.length === 0) {
            localServer.start();
            return;
        }
        const label = i18n.t("startup:updateAvailable.systemsAndPlugins", { systemsAndPlugins: systemsAndPlugins.join(", ") });
        const options = {
            validationLabel: i18n.t("common:actions.update"),
            cancelLabel: i18n.t("common:actions.skip")
        };
        new dialogs.ConfirmDialog(label, options, (shouldUpdate) => {
            if (shouldUpdate) {
                openServerSettings_1.default();
                serverSettingsSystems.updateAll(() => { localServer.start(); });
            } else {
                localServer.start();
            }
        });
    });
}