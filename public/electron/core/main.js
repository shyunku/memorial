/* ---------------------------------------- import ---------------------------------------- */
const path = require("path");
const {
  ipcMain,
  webContents,
  app,
  BrowserWindow,
  screen,
  remote,
  Menu,
  powerMonitor,
  systemPreferences,
  powerSaveBlocker,
} = require("electron");
const userDataPath = app.getPath("userData");
const appDataPath = app.getAppPath();

/**
 * Flag that indicates whether current process context is on build mode.
 * If this process is invoked by non-dev environment, this flag will be true.
 * Otherwise, this will be false.
 */
const isBuildMode = !process.env.ELECTRON_START_URL;

const PreloadResult = require("../modules/preload").all(isBuildMode, appDataPath);
const Ipc = require("./ipc");
const Window = require("./window");
const Socket = require("./socket");
const Updater = require("../modules/updater");
const ArchCategory = require("../objects/ArchCategory.constants");
const Util = require("../modules/util");
const UpdaterFlag = Updater.UPDATER_RESULT_FLAG;
const Database = require("../modules/database");
/* ---------------------------------------- Declaration ---------------------------------------- */
/* -------------------- General -------------------- */
// Main context window of process
let mainWindow;

/**
 * Flag that indicates whether this process context is on production mode.
 * Only deployed version of program should have this value as true, otherwise this will be false.
 */
let isProdMode;
let buildLevel = 0;

const osCategory = Util.getSystemArchCategory();
const osLabel = Util.getSystemArchitectureLabel();

const isWindowsOS = osCategory === ArchCategory.Windows;
const isMacOS = osCategory === ArchCategory.MacOS;

const checkUpdate = true;
const requestPermission = true;

let micPermissionStatus = "unknown";
let camPermissionStatus = "unknown";

/* ---------------------------------------- Pre-execute statements ---------------------------------------- */
process.env.NODE_ENV =
  process.env.NODE_ENV && process.env.NODE_ENV.trim().toLowerCase() == "development" ? "development" : "production";
isProdMode = process.env.NODE_ENV === "production";
buildLevel = isProdMode + isBuildMode;

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

Database.initialize(isWindowsOS, buildLevel, userDataPath, appDataPath);

/* ---------------------------------------- Main execute statements ---------------------------------------- */
app.on("ready", async () => {
  try {
    if (isProdMode && checkUpdate) {
      const window = await Window.createUpdaterWindow(true);
      const { result: checkUpdateResult, data } = await Updater.checkForUpdates(osCategory);

      switch (checkUpdateResult) {
        case UpdaterFlag.ALREADY_LATEST:
          // do nothing
          break;
        case UpdaterFlag.NEW_VERSION_FOUND:
          const { version, isBeta } = data;
          const destInstallerPath = await Updater.updateToNewVersion(osCategory, userDataPath, version);
          const shouldRelaunch = await Updater.installNewVersion(osCategory, userDataPath, destInstallerPath);

          if (shouldRelaunch) {
            console.system(`Relaunching app...`);
            app.relaunch();
          }
          app.exit();
          return;
        case UpdaterFlag.UPDATE_CHECK_FAIL:
          console.error(`Couldn't check update. Exiting program...`);
          app.exit();
          return;
      }

      await Util.sleep(1000);
      window.close();
    }

    micPermissionStatus = systemPreferences.getMediaAccessStatus("microphone");
    console.debug(`Current microphone permission: ${micPermissionStatus}`);
    camPermissionStatus = systemPreferences.getMediaAccessStatus("camera");
    console.debug(`Current camera permission: ${micPermissionStatus}`);

    if (isBuildMode && requestPermission) {
      switch (micPermissionStatus) {
        case "not-determined":
          if (isMacOS) {
            console.debug(`Waiting for microphone access permission request...`);
            systemPreferences.askForMediaAccess("microphone").then((mediaAccessResult) => {
              console.debug(`Microphone access permission result: ` + mediaAccessResult);

              if (!mediaAccessResult) {
                console.error(`Microphone permission not granted even after request!`);
              }
            });
          } else {
            console.error(`Not handled error: microphone access not granted (${micPermissionStatus})`);
          }
          break;
        case "granted":
          console.info(`Microphone permission is already granted.`);
          break;
        case "denied":
          console.warn(`User already denied microphone permission!`);
          break;
        default:
          console.error(`Unhandled permission error: microphone permission state: ${micPermissionStatus}`);
          break;
      }

      switch (camPermissionStatus) {
        case "not-determined":
          if (isMacOS) {
            console.debug(`Waiting for camera access permission request...`);
            systemPreferences.askForMediaAccess("camera").then((mediaAccessResult) => {
              console.debug(`Camera access permission result: ` + mediaAccessResult);

              if (!mediaAccessResult) {
                console.error(`Camera permission not granted even after request!`);
              }
            });
          } else {
            console.error(`Not handled error: camera access not granted (${camPermissionStatus})`);
          }
          break;
        case "granted":
          console.info(`Camera permission is already granted.`);
          break;
        case "denied":
          console.warn(`User already denied camera permission!`);
          break;
        default:
          console.error(`Unhandled permission error: camera permission state: ${camPermissionStatus}`);
          break;
      }
    }

    // TODO :: check utility of this command
    // powerSaveBlocker.start('prevent-app-suspension');
    // app.commandLine.appendSwitch('webrtc-max-cpu-consumption-percentage', '100');

    mainWindow = Window.createMainWindow();
    Window.setWindowStateChangeListener(mainWindow, Ipc);
  } catch (err) {
    console.error(err);
    app.quit();
  }
});
