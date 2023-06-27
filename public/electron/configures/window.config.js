const {
  ipcMain,
  webContents,
  app,
  BrowserWindow,
  screen,
  remote,
  Menu,
} = require("electron");
const packageJson = require("../../../package.json");
const path = require("path");

/**
 * @param s {WindowService}
 */
module.exports = function (s) {
  s.mainWindow = s.createMainWindow({
    webPreferences: {
      preload: path.join(__dirname, "../", "modules", "preload.js"),
    },
  });
  s.mainWindow.once("ready-to-show", () => {
    s.mainWindow.show();
    s.mainWindow.focus();
  });

  s.setWindowStateChangeListener(s.mainWindow);
  // s.mainWindow.webContents.session.clearCache(() => {});
};
