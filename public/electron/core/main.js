/* ---------------------------------------- import ---------------------------------------- */
const { app } = require("electron");

/**
 * Flag that indicates whether current process context is on build mode.
 * If this process is invoked by non-dev environment, this flag will be true.
 * Otherwise, this will be false.
 */
const isBuildMode = !process.env.ELECTRON_START_URL;
const appDataPath = app.getAppPath();

const PreloadResult = require("../modules/preload").all(isBuildMode, appDataPath);
const Ipc = require("./ipc");
const Window = require("./window");
const Socket = require("./socket");
const Updater = require("../modules/updater");
const ArchCategory = require("../objects/ArchCategory.constants");
const Util = require("../modules/util");
const UpdaterFlag = Updater.UPDATER_RESULT_FLAG;
const Database = require("../modules/sqlite3");
const WindowPropertyFactory = require("../objects/WindowPropertyFactory");
const FileSystem = require("../modules/filesystem");
const Session = require("./session");
/* ---------------------------------------- Declaration ---------------------------------------- */
/* -------------------- General -------------------- */
// Main context window of process
let mainWindow;

/**
 * Flag that indicates whether this process context is on production mode.
 * Only deployed version of program should have this value as true, otherwise this will be false.
 */
process.env.NODE_ENV =
  process.env.NODE_ENV && process.env.NODE_ENV.trim().toLowerCase() == "development" ? "development" : "production";
let isProdMode = process.env.NODE_ENV === "production";
let buildLevel = isProdMode + isBuildMode;

const osCategory = Util.getSystemArchCategory();
const osLabel = Util.getSystemArchitectureLabel();

const isWindowsOS = osCategory === ArchCategory.Windows;
const isMacOS = osCategory === ArchCategory.MacOS;
const userDataPath = FileSystem.getUserDataPath(buildLevel);

const checkUpdate = true;

/* ---------------------------------------- Pre-execute statements ---------------------------------------- */
Ipc.setSockets(Socket.socket);
Socket.setIpc(Ipc);
Updater.setIpc(Ipc);

console.debug(`[Platform/OS] ${osLabel} (${osCategory})`);
console.debug(`[Build Level] ${buildLevel}`);
console.debug(`[Execution Mode] ${process.env.NODE_ENV}`);
console.debug(`[Production Mode] ${isProdMode}`);
console.debug(`[Build Mode] ${isBuildMode}`);
console.debug(`[AppData Path] ${appDataPath}`);
console.debug(`[UserData Path] ${userDataPath}`);

Database.setSystemInfo(buildLevel, userDataPath);
Database.initializeRoot();

Ipc.setDatabaseContext(Database);

/* ---------------------------------------- Main execute statements ---------------------------------------- */
app.on("ready", async () => {
  try {
    // database check & initialize

    // listen for default electron events
    listenForDefaultElectronEvents();

    if (isProdMode && checkUpdate) {
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

    // initialize session
    Session.initialize();

    mainWindow = Window.createMainWindow();

    Ipc.setMainWindow(mainWindow);
    Window.setWindowStateChangeListener(mainWindow, Ipc);
  } catch (err) {
    console.error(err);
    app.quit();
    throw err;
  }
});

function listenForDefaultElectronEvents() {
  app.on("browser-window-created", (e, window) => {
    if (mainWindow == null || window.id === mainWindow.id) return;
    window.setMenu(null);
  });
}
