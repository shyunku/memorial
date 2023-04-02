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

/**
 * @param s {WindowService}
 */
module.exports = function (s) {
  if (!packageJson.allowMultipleExecution) {
    let getInstanceLock = app.requestSingleInstanceLock();

    if (!getInstanceLock) {
      console.log(
        "Instance is locked by single instance lock (already running). exiting app..."
      );
      app.quit();
    } else {
      app.on("second-instance", (event, commandLine, workingDirectory) => {
        if (s.mainWindow) {
          if (s.mainWindow.isMinimized()) {
            s.mainWindow.restore();
          }
          s.mainWindow.focus();
        }

        console.log("Something trying to open already opened-program.");
      });
    }
  }

  s.mainWindow = s.createMainWindow();
  s.mainWindow.once("ready-to-show", () => {
    s.mainWindow.show();
    s.mainWindow.focus();
  });

  s.setWindowStateChangeListener(s.mainWindow);
  // s.mainWindow.webContents.session.clearCache(() => {});
};
