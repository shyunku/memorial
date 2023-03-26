const {
  ipcMain,
  webContents,
  app,
  BrowserWindow,
  screen,
  remote,
  Menu,
} = require("electron");
const electronRemote = require("@electron/remote/main");
const { WindowType } = require("../modules/constants");
const url = require("url");
const path = require("path");
const WindowPropertyFactory = require("../util/WindowPropertyFactory");
const AlertPopupConstants = require("../constants/AlertPopup.constants");
let mainWindow;

const urlPrefix =
  process.env.ELECTRON_START_URL ||
  url.format({
    pathname: path.join(__dirname, "../../../build/index.html"),
    protocol: "file",
    slashes: true,
  });

const __window__ = {};

module.exports = __window__;
