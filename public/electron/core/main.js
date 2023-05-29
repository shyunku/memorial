/* ---------------------------------------- import ---------------------------------------- */
const { app } = require("electron");

/**
 * Flag that indicates whether current process context is on build mode.
 * If this process is invoked by non-dev environment, this flag will be true.
 * Otherwise, this will be false.
 */
const isBuildMode = !process.env.ELECTRON_START_URL;
const appDataPath = app.getAppPath();

console.log(`This is ${isBuildMode ? "build" : "dev"} mode`);

require("../modules/initializer").all(isBuildMode, appDataPath);
// const Updater = require("../modules/updater");
const ArchCategory = require("../constants/ArchCategory.constants");
const Util = require("../modules/util");
// const UpdaterFlag = Updater.UPDATER_RESULT_FLAG;
const FileSystem = require("../modules/filesystem");
const ServiceGroup = require("./serviceGroup");
const { getBuildLevel } = require("../util/SystemUtil");
/* ---------------------------------------- Declaration ---------------------------------------- */
/* -------------------- General -------------------- */
// Manage service packages as a group
const serviceGroup = new ServiceGroup();

/**
 * Flag that indicates whether this process context is on production mode.
 * Only deployed version of program should have this value as true, otherwise this will be false.
 */
process.env.NODE_ENV =
  process.env.NODE_ENV &&
  process.env.NODE_ENV.trim().toLowerCase() === "development"
    ? "development"
    : "production";
let isProdMode = process.env.NODE_ENV === "production";
let buildLevel = getBuildLevel();

const osCategory = Util.getSystemArchCategory();
const osLabel = Util.getSystemArchitectureLabel();

const isWindowsOS = osCategory === ArchCategory.Windows;
const isMacOS = osCategory === ArchCategory.MacOS;
const userDataPath = FileSystem.getUserDataPath();

const checkUpdate = true;

/* ---------------------------------------- Pre-execute statements ---------------------------------------- */
if (!isWindowsOS && !isMacOS) {
  console.error(`[Platform/OS] ${osLabel} (${osCategory}) is not supported`);
  process.exit(-1);
}
console.debug(`[Platform/OS] ${osLabel} (${osCategory})`);
console.debug(`[Build Level] ${buildLevel}`);
console.debug(`[Execution Mode] ${process.env.NODE_ENV}`);
console.debug(`[Production Mode] ${isProdMode}`);
console.debug(`[Build Mode] ${isBuildMode}`);
console.debug(`[AppData Path] ${appDataPath}`);
console.debug(`[UserData Path] ${userDataPath}`);

/* ---------------------------------------- Main execute statements ---------------------------------------- */
app.on("ready", async () => {
  try {
    // initialize & configure all services
    serviceGroup.injectReferences();
    serviceGroup.configure();

    if (isProdMode && checkUpdate) {
      // TODO :: implement this
      // const window = await Window.createUpdaterWindow(true);
      // const { result: checkUpdateResult, data } = await Updater.checkForUpdates(osCategory);
      // switch (checkUpdateResult) {
      //   case UpdaterFlag.ALREADY_LATEST:
      //     // do nothing
      //     break;
      //   case UpdaterFlag.NEW_VERSION_FOUND:
      //     const { version, isBeta } = data;
      //     const destInstallerPath = await Updater.updateToNewVersion(osCategory, userDataPath, version);
      //     const shouldRelaunch = await Updater.installNewVersion(osCategory, userDataPath, destInstallerPath);
      //     if (shouldRelaunch) {
      //       console.system(`Relaunching app...`);
      //       app.relaunch();
      //     }
      //     app.exit();
      //     return;
      //   case UpdaterFlag.UPDATE_CHECK_FAIL:
      //     console.error(`Couldn't check update. Exiting program...`);
      //     app.exit();
      //     return;
      // }
      // await Util.sleep(1000);
      // window.close();
    }

    // TODO :: check utility of this command
    // powerSaveBlocker.start('prevent-app-suspension');
    // app.commandLine.appendSwitch('webrtc-max-cpu-consumption-percentage', '100');
  } catch (err) {
    console.error(err);
    app.quit();
    throw err;
  }
});

app.on("browser-window-created", (e, window) => {
  const mainWindow = serviceGroup.windowService.mainWindow;
  if (mainWindow == null || window.id === mainWindow.id) return;
  console.debug("turn off menu bar");
  window.setMenu(null);
  window.webContents.session.clearCache(() => {});
  // window.webContents.openDevTools();
});
