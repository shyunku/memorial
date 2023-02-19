const {ipcMain, webContents, app, BrowserWindow, screen, remote, Menu} = require('electron');
const { WindowType } = require('../modules/constants');
const url = require('url');
const path = require('path');
const WindowPropertyFactory = require('../objects/WindowPropertyFactory');
const AlertPopupConstants = require('../objects/AlertPopup.constants');
let mainWindow;

const urlPrefix = process.env.ELECTRON_START_URL || url.format({
    pathname: path.join(__dirname, "../../../build/index.html"),
    protocol: 'file',
    slashes: true,
});

const __window__ = {
    getMainWindow: () => {
        return mainWindow;
    },
    invokeWindow: (url, windowProperty = {}, paramter, shown) => {
        let window = new BrowserWindow(windowProperty);
        let refinedUrl = (urlPrefix + '#' + url).replace(/\s/g, '');

        window.loadURL(refinedUrl);
        window.on('ready-to-show', () => {
            window.show();
            if(shown) shown(window);
            // window.blur();
            // window.focus();

            if(paramter) {
                window.webContents.send("__window_param__", paramter);
            }
        });

        return window;
    },
    createMainWindow: () => {
        let windowProperty = new WindowPropertyFactory()
            .windowType(WindowType.Modeless)
            .show(false)
            .center(true)
            .frame(false)
            .minWidth(800)
            .minHeight(600)
            .width(1440)
            .height(960)
            .backgroundThrottling(false)
            .build();
        mainWindow = __window__.invokeWindow('/', windowProperty);
        return mainWindow;
    },
    createModalWindow: (browserId, url, windowProperty, parameter) => {
        let currentlyFocusedWindow, currentlyFocusedWindowCenterPos;
        let defaultWindowFactory = new WindowPropertyFactory()
            .import(windowProperty)
            .modal(true)
            .resizable(false)
            .frame(false)
            .center(true);
        
        if(browserId) {
            currentlyFocusedWindow = BrowserWindow.fromId(browserId);
            currentlyFocusedWindowCenterPos = __window__.getWindowCenterPos(currentlyFocusedWindow);
            defaultWindowFactory.parent(currentlyFocusedWindow);
        }

        const defaultWindowProperty = defaultWindowFactory.build();
        let newWindow = __window__.invokeWindow('/modal' + url, defaultWindowProperty, parameter);

        if(browserId) {
            __window__.setWindowCenterPos(
                newWindow, 
                currentlyFocusedWindowCenterPos.x,
                currentlyFocusedWindowCenterPos.y
            );
        }

        return newWindow;
    },
    createModelessWindow: (browserId, url, windowProperty, parameter) => {
        let currentlyFocusedWindow, currentlyFocusedWindowCenterPos;
        let defaultWindowFactory = new WindowPropertyFactory()
            .import(windowProperty)
            .modal(false)
            .resizable(true)
            .frame(false)
            .center(true);
        
        if(browserId) {
            currentlyFocusedWindow = BrowserWindow.fromId(browserId);
            currentlyFocusedWindowCenterPos = __window__.getWindowCenterPos(currentlyFocusedWindow);
            defaultWindowFactory.parent(currentlyFocusedWindow);
        }

        const defaultWindowProperty = defaultWindowFactory.build();
        let newWindow = __window__.invokeWindow('/modal' + url, defaultWindowProperty, parameter);

        if(browserId) {
            __window__.setWindowCenterPos(
                newWindow, 
                currentlyFocusedWindowCenterPos.x,
                currentlyFocusedWindowCenterPos.y
            );
        }

        return newWindow;
    },
    createUpdaterWindow: (await = false) => {
        let windowProperty = new WindowPropertyFactory()
            .windowType(WindowType.Modeless)
            .show(false)
            .center(true)
            .frame(false)
            .width(300)
            .height(250)
            .resizable(false)
            .build();
        
        if(await) {
            return new Promise((resolve, reject) => {
                try {
                    __window__.invokeWindow('/update-checker', windowProperty, null, (window) => {
                        resolve(window);
                    });
                } catch (err) {
                    reject(err);
                }
            });
        } else {
            let window = __window__.invokeWindow('/update-checker', windowProperty);
            return window;
        }
    },
    createAlertPopupWindow: (url, windowProperty, parameter) => {
        const display = screen.getPrimaryDisplay();
        const displayWorkArea = display.workArea;

        let defaultWindowProperty = new WindowPropertyFactory()
            .windowType(WindowType.Modeless)
            .show(false)
            .center(true)
            .frame(false)
            .width(AlertPopupConstants.DEFAULT_WIDTH)
            .height(AlertPopupConstants.DEFAULT_HEIGHT)
            .xCoordinate(displayWorkArea.width - AlertPopupConstants.DEFAULT_WIDTH - AlertPopupConstants.RIGHT_MARGIN)
            .yCoordinate(displayWorkArea.height - AlertPopupConstants.DEFAULT_HEIGHT - AlertPopupConstants.BOTTOM_MARGIN)
            .resizable(false)
            .import(windowProperty)
            .build();
        
        let newWindow = __window__.invokeWindow('/alert-popup' + url, defaultWindowProperty, parameter);
        return newWindow;
    },
    getWindowCenterPos: window => {
        let LUpos = window.getPosition();
        let size = window.getSize();

        return {
            x: parseInt(LUpos[0] + size[0] / 2),
            y: parseInt(LUpos[1] + size[1] / 2)
        };
    },
    setWindowCenterPos: (window, x, y) => {
        let size = window.getSize();

        window.setPosition(
            parseInt(x - size[0] / 2),
            parseInt(y - size[1] / 2)
        );
    },
    setWindowStateChangeListener: (window, Ipc) => {
        window.on('minimize', e => {
            Ipc.sender('win_state_changed', true, 'minimize');
        });
        window.on('maximize', e => {
            Ipc.sender('win_state_changed', true, 'maximize');
        });
        window.on('unmaximize', e => {
            Ipc.sender('win_state_changed', true, 'unmaximize');
        });
        window.on('restore', e => {
            Ipc.sender('win_state_changed', true, 'restore');
        });
    }
}

module.exports = __window__;