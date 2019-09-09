## Desktop app for ValjangEngine


[![Patreon](https://img.shields.io/badge/patreon-support%20us-brightgreen.svg)](https://www.patreon.com/valjang)

[Website](http://Valjang.fr/) —
--
Building the desktop app

The desktop app is powered by Electron.

In a terminal, run the following commands:

`git clone https://github.com/mehdigoom/Valjang-Engine-Client Valjang-Engine-Client`

`cd Valjang-Engine-Client/app`

`npm run build`

Once it's done, you can start the app by running:

# Install Electron the first time (and then everytime you want to update it).
`npm install -g electron`

`npm run start`

Enabling development mode

In order to catch as many runtime errors as possible while working on Valjang-Engine, you can enable development mode. When development mode is enabled, the project header in the top-left corner will be blue. When it turns red, it's a good sign that you should open your browser's dev tools and look for errors in the Console tab.

Enabling development mode will also add the None language to the language selector, which is useful for finding strings that need to be internationalized.

To enable development mode, open a Valjang-Engine project, press F12 to open the dev tools and type the following in the console:

`localStorage.setItem("ValjangEngine-dev-mode", "true");`

Reload for the change to take effect.


based on superpowers and three.js


