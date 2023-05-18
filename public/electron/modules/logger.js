const ElectronLogger = require("electron-log");
const moment = require("moment");
const path = require("path");
const fse = require("fs-extra");
const FileSystem = require("./filesystem");

function initialize(isBuildMode, appDataPath) {
  const loggerDirPath = isBuildMode
    ? path.resolve(appDataPath, "..")
    : path.resolve(appDataPath, "logs");

  console.log(`Logger Directory Path: ${loggerDirPath}`);

  const currentTime = moment(Date.now()).format("YYYY/MM/DD HH:mm:ss.SSS");
  const logFilename = `${currentTime}.log`;
  const loggerFilePath = path.resolve(loggerDirPath, logFilename);

  if (!FileSystem.isDir(loggerDirPath)) {
    try {
      fse.mkdirSync(loggerDirPath);
      console.log(`Make directory for logger`);
    } catch (err) {
      console.error(err);
      process.exit(-3);
    }
  }

  console.log(`Final Logger Path: ${loggerFilePath}`);
  ElectronLogger.transports.console.level = false;
  ElectronLogger.transports.file.level = isBuildMode;
  ElectronLogger.transports.file.resolvePath = () => loggerFilePath;
}

module.exports = {
  initialize,
  module: ElectronLogger,
};
