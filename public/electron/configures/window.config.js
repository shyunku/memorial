/**
 * @param s {WindowService}
 */
module.exports = function (s) {
  s.mainWindow = s.createMainWindow();
  s.mainWindow.once("ready-to-show", () => {
    s.mainWindow.show();
    s.mainWindow.focus();
  });

  s.setWindowStateChangeListener(s.mainWindow);
  // s.mainWindow.webContents.session.clearCache(() => {});
};
