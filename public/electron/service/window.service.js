const { BrowserWindow, screen } = require("electron");
const WindowPropertyFactory = require("../util/WindowPropertyFactory");
const { WindowType } = require("../modules/constants");
const electronRemote = require("@electron/remote/main");
const AlertPopupConstants = require("../constants/AlertPopup.constants");
const url = require("url");
const path = require("path");
const lodash = require("lodash");

const urlPrefix =
  process.env.ELECTRON_START_URL ||
  url.format({
    pathname: path.join(__dirname, "../../../build/index.html"),
    protocol: "file",
    slashes: true,
  });

class WindowService {
  constructor(ipcService) {
    /** @type {IpcService} */
    this.ipcService = null;
    this.mainWindow = null;
    /** @type {Tray} */
    this.tray = null;
  }

  /**
   * @param serviceGroup {ServiceGroup}
   */
  inject(serviceGroup) {
    this.ipcService = serviceGroup.ipcService;
  }

  initialize() {
    this.mainWindow = this.createMainWindow();
    this.mainWindow.once("ready-to-show", () => {
      this.mainWindow.show();
      this.mainWindow.focus();
    });
    this.setWindowStateChangeListener(this.mainWindow);
  }

  getMainWindow() {
    return this.mainWindow;
  }

  invokeWindow(url, windowProperty = {}, parameter, shown) {
    let window = new BrowserWindow(windowProperty);
    let refinedUrl = (urlPrefix + "#" + url).replace(/\s/g, "");

    window.loadURL(refinedUrl);
    window.on("ready-to-show", () => {
      window.show();
      if (shown) shown(window);
      // window.blur();
      // window.focus();

      if (parameter) {
        window.webContents.send("__window_param__", parameter);
      }
    });

    return window;
  }

  createMainWindow(overlapWindowProperty = {}) {
    let windowProperty = new WindowPropertyFactory()
      .windowType(WindowType.Modeless)
      .show(false)
      .center(true)
      .frame(false)
      .minWidth(900)
      .minHeight(600)
      .width(1440)
      .height(960)
      .backgroundThrottling(false)
      .build();
    windowProperty = lodash.merge({}, windowProperty, overlapWindowProperty);
    let mainWindow = this.invokeWindow("/", windowProperty);
    electronRemote.enable(mainWindow.webContents);
    return mainWindow;
  }

  createModalWindow(browserId, url, windowProperty, parameter) {
    let currentlyFocusedWindow, currentlyFocusedWindowCenterPos;
    let defaultWindowFactory = new WindowPropertyFactory()
      .import(windowProperty)
      .modal(true)
      .resizable(false)
      .frame(false)
      .center(true);

    if (browserId) {
      currentlyFocusedWindow = BrowserWindow.fromId(browserId);
      currentlyFocusedWindowCenterPos = this.getWindowCenterPos(
        currentlyFocusedWindow
      );
      defaultWindowFactory.parent(currentlyFocusedWindow);
    }

    const defaultWindowProperty = defaultWindowFactory.build();
    let newWindow = this.invokeWindow(
      "/modal" + url,
      defaultWindowProperty,
      parameter
    );

    if (browserId) {
      this.setWindowCenterPos(
        newWindow,
        currentlyFocusedWindowCenterPos.x,
        currentlyFocusedWindowCenterPos.y
      );
    }

    return newWindow;
  }

  createModelessWindow(browserId, url, windowProperty, parameter) {
    let currentlyFocusedWindow, currentlyFocusedWindowCenterPos;
    let defaultWindowFactory = new WindowPropertyFactory()
      .import(windowProperty)
      .modal(false)
      .resizable(true)
      .frame(false)
      .center(true);

    if (browserId) {
      currentlyFocusedWindow = BrowserWindow.fromId(browserId);
      currentlyFocusedWindowCenterPos = this.getWindowCenterPos(
        currentlyFocusedWindow
      );
      defaultWindowFactory.parent(currentlyFocusedWindow);
    }

    const defaultWindowProperty = defaultWindowFactory.build();
    let newWindow = this.invokeWindow(
      "/modal" + url,
      defaultWindowProperty,
      parameter
    );

    if (browserId) {
      this.setWindowCenterPos(
        newWindow,
        currentlyFocusedWindowCenterPos.x,
        currentlyFocusedWindowCenterPos.y
      );
    }

    return newWindow;
  }

  async createUpdaterWindow(overlapWindowProperty) {
    let windowProperty = new WindowPropertyFactory()
      .windowType(WindowType.Modeless)
      .show(false)
      .center(true)
      .frame(false)
      .width(300)
      .height(250)
      .resizable(false)
      .build();

    windowProperty = lodash.merge({}, windowProperty, overlapWindowProperty);
    return new Promise((resolve, reject) => {
      try {
        let window = this.invokeWindow(
          "/update-checker",
          windowProperty,
          null,
          (window) => {
            resolve(window);
          }
        );
        electronRemote.enable(window.webContents);
      } catch (err) {
        reject(err);
      }
    });
  }

  createAlertPopupWindow(url, windowProperty, parameter) {
    const display = screen.getPrimaryDisplay();
    const displayWorkArea = display.workArea;

    let defaultWindowProperty = new WindowPropertyFactory()
      .windowType(WindowType.Modeless)
      .show(false)
      .center(true)
      .frame(false)
      .width(AlertPopupConstants.DEFAULT_WIDTH)
      .height(AlertPopupConstants.DEFAULT_HEIGHT)
      .xCoordinate(
        displayWorkArea.width -
          AlertPopupConstants.DEFAULT_WIDTH -
          AlertPopupConstants.RIGHT_MARGIN
      )
      .yCoordinate(
        displayWorkArea.height -
          AlertPopupConstants.DEFAULT_HEIGHT -
          AlertPopupConstants.BOTTOM_MARGIN
      )
      .resizable(false)
      .import(windowProperty)
      .build();

    let newWindow = this.invokeWindow(
      "/alert-popup" + url,
      defaultWindowProperty,
      parameter
    );
    return newWindow;
  }

  getWindowCenterPos(window) {
    let LUpos = window.getPosition();
    let size = window.getSize();

    return {
      x: parseInt(LUpos[0] + size[0] / 2),
      y: parseInt(LUpos[1] + size[1] / 2),
    };
  }

  setWindowCenterPos(window, x, y) {
    let size = window.getSize();

    window.setPosition(parseInt(x - size[0] / 2), parseInt(y - size[1] / 2));
  }

  setWindowStateChangeListener(window) {
    window.on("minimize", (e) => {
      this.ipcService.sender("win_state_changed", null, true, "minimize");
    });
    window.on("maximize", (e) => {
      this.ipcService.sender("win_state_changed", null, true, "maximize");
    });
    window.on("unmaximize", (e) => {
      this.ipcService.sender("win_state_changed", null, true, "unmaximize");
    });
    window.on("restore", (e) => {
      this.ipcService.sender("win_state_changed", null, true, "restore");
    });
  }
}

module.exports = WindowService;
