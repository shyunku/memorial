const {
  ipcMain,
  webContents,
  app,
  BrowserWindow,
  screen,
  remote,
  Menu,
  Tray,
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

  s.tray = new Tray("public/logo192.png");
  s.tray.on("click", () => {
    s.mainWindow.show();
  });
  s.tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: `Memorial Version ${packageJson.version}`, enabled: false },
      {
        label: "종료",
        click: function () {
          s.mainWindow.close();
          app.quit();
          app.exit();
        },
      },
    ])
  );

  s.setWindowStateChangeListener(s.mainWindow);
  // s.mainWindow.webContents.session.clearCache(() => {});
};
