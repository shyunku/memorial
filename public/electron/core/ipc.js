const { ipcMain, webContents, app, BrowserWindow, screen, remote, Menu, powerMonitor } = require("electron");
const { Readable } = require("stream");
const WindowPropertyFactory = require("../objects/WindowPropertyFactory");
const __IpcRouter__ = require("../objects/IpcRouter");
const Window = require("./window");
const Request = require("./request");
const db = require("../modules/database").getContext();
const IpcRouter = new __IpcRouter__();
const silentTopics = [];

let socket;

const register = (topic, callback, ...arg) => {
  const originalCallback = callback;
  callback = (event, ...arg) => {
    if (!silentTopics.includes(topic)) {
      let mergedArguments = arg.map((param) => console.shorten(param)).join(" ");

      console.system(
        `IpcMain ${console.wrap("<--", console.GREEN)} ${console.wrap(topic, console.MAGENTA)} ${mergedArguments}`
      );
    }
    originalCallback(event, ...arg);
  };
  return ipcMain.on(topic, callback, ...arg);
};

const silentRegister = (topic, callback, ...arg) => {
  return ipcMain.on(topic, callback, ...arg);
};

const sender = (topic, success, data) => {
  let packagedData = { success, data };
  let sendeeCount = IpcRouter.broadcast(topic, packagedData);

  if (silentTopics.includes(topic)) return;
  console.system(
    `IpcMain ${console.wrap("-->", console.CYAN)} ${console.wrap(topic, console.MAGENTA)} ${console.wrap(
      `(${sendeeCount})`,
      console.BLUE
    )} ${data}`
  );
};

const emiter = (topic, data) => {
  let sendeeCount = IpcRouter.broadcast(topic, data);

  if (silentTopics.includes(topic)) return;
  console.system(
    `IpcMain --> ${console.wrap(topic, console.MAGENTA)} ${console.wrap(`(${sendeeCount})`, console.BLUE)} ${data}`
  );
};

const fastSender = (topic, socketResponse) => {
  let success = socketResponse.code === Request.ok;
  let data = socketResponse ? (success ? socketResponse.data : socketResponse.code) : null;

  let packagedData = { success, data };
  let sendeeCount = IpcRouter.broadcast(topic, packagedData);

  if (silentTopics.includes(topic)) return;
  console.system(
    `IpcMain ${console.wrap("-->", console.CYAN)} ${console.wrap(topic, console.MAGENTA)} ${console.wrap(
      `(${sendeeCount})`,
      console.BLUE
    )} ${data}`
  );
};

const silentSender = (topic, success, data) => {
  let packagedData = { success, data };
  IpcRouter.broadcast(topic, packagedData);
};

const fastSilentSender = (topic, socketResponse) => {
  let success = socketResponse.code === Request.ok;
  let data = socketResponse ? (success ? socketResponse.data : socketResponse.code) : null;

  let packagedData = { success, data };
  IpcRouter.broadcast(topic, packagedData);
};

// /* ---------------------------------------- System ---------------------------------------- */
register("terminate_signal", (event, param) => {
  app.quit();
});

register("relaunch", (event, param) => {
  app.relaunch();
  app.exit();
});

register("close_window", (event, param) => {
  let currentWindow = BrowserWindow.fromId(param);
  if (currentWindow) currentWindow.close();
});

register("maximize_window", (event, param) => {
  let currentWindow = BrowserWindow.fromId(param);
  if (currentWindow) currentWindow.maximize();
});

register("minimize_window", (event, param) => {
  let currentWindow = BrowserWindow.fromId(param);
  if (currentWindow) currentWindow.minimize();
});

register("restore_window", (event, param) => {
  let currentWindow = BrowserWindow.fromId(param);
  if (currentWindow) currentWindow.restore();
});

register("modal", (event, ...arg) => {
  Window.createModalWindow(...arg);
});

register("modeless", (event, ...arg) => {
  Window.createModelessWindow(...arg);
});

register("inner-modal", (event, route, data) => {
  sender("inner-modal", true, { route, data });
});

register("close-inner-modal", (event, ...arg) => {
  sender("close-inner-modal", true, ...arg);
});

register("register_topic", (event, webContentsId, topics) => {
  IpcRouter.addListenersByWebContentsId(topics, webContentsId);
});

register("save_setting", (event, userId, savingData) => {
  socket.emit("save_setting", { user_id: userId, saving_data: savingData });
});

register("computer_idle_time", (event) => {
  const idleTime = powerMonitor.getSystemIdleTime();
  emiter("computer_idle_time", idleTime);
});

register("__callback__", (event, topic, data) => {
  IpcRouter.broadcast(topic, data);
});

/* ---------------------------------------- Popup ---------------------------------------- */

/* ---------------------------------------- Test ---------------------------------------- */
register("test_signal", (event, param) => {});

module.exports = {
  sender,
  fastSender,
  silentSender,
  fastSilentSender,
  register,
  emiter,
  silentRegister,
  setSockets: (socket_) => {
    socket = socket_;
  },
};
