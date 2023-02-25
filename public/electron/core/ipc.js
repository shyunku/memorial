const { ipcMain, webContents, app, BrowserWindow, screen, remote, Menu, powerMonitor } = require("electron");
const { Readable } = require("stream");
const WindowPropertyFactory = require("../objects/WindowPropertyFactory");
const __IpcRouter__ = require("../objects/IpcRouter");
const Window = require("./window");
const Request = require("./request");
const db = require("../modules/database").getContext();
const IpcRouter = new __IpcRouter__();
const silentTopics = [];

const reqIdTag = (reqId) => {
  return reqId ? `[${reqId.substr(0, 3)}]` : "";
};

const register = (topic, callback, ...arg) => {
  const originalCallback = callback;
  callback = async (event, reqId, ...arg) => {
    if (!silentTopics.includes(topic)) {
      let mergedArguments = arg.map((param) => console.shorten(param)).join(" ");

      console.system(
        `IpcMain ${console.wrap(`<-${reqIdTag(reqId)}--`, console.GREEN)} ${console.wrap(
          topic,
          console.MAGENTA
        )} ${mergedArguments}`
      );
    }
    try {
      return await originalCallback(event, reqId, ...arg);
    } catch (err) {
      console.error(`[IpcMain]: ${err}`);
      return null;
    }
  };
  return ipcMain.on(topic, callback, ...arg);
};

const silentRegister = (topic, ...arg) => {
  return ipcMain.on(topic, ...arg);
};

// send data with success flag
const sender = (topic, reqId, success, data = null) => {
  if (typeof success !== "boolean")
    console.error(`[IpcMain]: success flag is not boolean (${console.wrap(topic, console.MAGENTA)})`);
  let packagedData = { success, data };
  let sendeeCount = IpcRouter.broadcast(topic, reqId, packagedData);

  if (silentTopics.includes(topic)) return;
  console.system(
    `IpcMain ${console.wrap(`--${reqIdTag(reqId)}->`, console.CYAN)} ${console.wrap(
      topic,
      console.MAGENTA
    )} ${console.wrap(`(${sendeeCount})`, console.BLUE)} ${data}`
  );
};

// send raw data (without success flag)
const emiter = (topic, reqId, data) => {
  let sendeeCount = IpcRouter.broadcast(topic, reqId, data);

  if (silentTopics.includes(topic)) return;
  console.system(
    `IpcMain --${reqIdTag(reqId)}-> ${console.wrap(topic, console.MAGENTA)} ${console.wrap(
      `(${sendeeCount})`,
      console.BLUE
    )} ${data}`
  );
};

const fastSender = (topic, socketResponse) => {
  let reqId = "FFFFFFFFFFFFF";
  let success = socketResponse.code === Request.ok;
  let data = socketResponse ? (success ? socketResponse.data : socketResponse.code) : null;

  let packagedData = { success, data };
  let sendeeCount = IpcRouter.broadcast(topic, packagedData);

  if (silentTopics.includes(topic)) return;
  console.system(
    `IpcMain ${console.wrap(`--${reqIdTag(reqId)}->`, console.CYAN)} ${console.wrap(
      topic,
      console.MAGENTA
    )} ${console.wrap(`(${sendeeCount})`, console.BLUE)} ${data}`
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
register("system/terminate_signal", (event, reqId, param) => {
  app.quit();
});

register("system/relaunch", (event, reqId, param) => {
  app.relaunch();
  app.exit();
});

register("system/close_window", (event, reqId, param) => {
  let currentWindow = BrowserWindow.fromId(param);
  if (currentWindow) currentWindow.close();
});

register("system/maximize_window", (event, reqId, param) => {
  let currentWindow = BrowserWindow.fromId(param);
  if (currentWindow) currentWindow.maximize();
});

register("system/minimize_window", (event, reqId, param) => {
  let currentWindow = BrowserWindow.fromId(param);
  if (currentWindow) currentWindow.minimize();
});

register("system/restore_window", (event, reqId, param) => {
  let currentWindow = BrowserWindow.fromId(param);
  if (currentWindow) currentWindow.restore();
});

register("system/modal", (event, reqId, ...arg) => {
  Window.createModalWindow(...arg);
});

register("system/modeless", (event, reqId, ...arg) => {
  Window.createModelessWindow(...arg);
});

register("system/inner-modal", (event, reqId, route, data) => {
  sender("inner-modal", reqId, true, { route, data });
});

register("system/close-inner-modal", (event, reqId, ...arg) => {
  sender("close-inner-modal", reqId, true, ...arg);
});

register("system/subscribe", (event, reqId, webContentsId, topics) => {
  if (!Array.isArray(topics)) topics = [topics];
  IpcRouter.addListenersByWebContentsId(topics, webContentsId);
});

register("system/computer_idle_time", (event, reqId) => {
  const idleTime = powerMonitor.getSystemIdleTime();
  emiter("system/computer_idle_time", reqId, idleTime);
});

register("__callback__", (event, reqId, topic, data) => {
  IpcRouter.broadcast(topic, data);
});

/* ---------------------------------------- Custom ---------------------------------------- */
register("task/getAllTaskList", async (event, reqId) => {
  try {
    let tasks = await db.all("SELECT * FROM tasks;");
    sender("task/getAllTaskList", reqId, true, tasks);
  } catch (err) {
    sender("task/getAllTaskList", reqId, false);
    throw err;
  }
});

register("task/getAllSubtaskList", async (event, reqId) => {
  try {
    let tasks = await db.all("SELECT * FROM subtasks;");
    sender("task/getAllSubtaskList", reqId, true, tasks);
  } catch (err) {
    sender("task/getAllSubtaskList", reqId, false);
    throw err;
  }
});

register("task/addTask", async (event, reqId, task) => {
  try {
    let result = await db.run(
      "INSERT INTO tasks (title, created_at, done_at, memo, done, due_date) VALUES (?, ?, ?, ?, ?, ?)",
      task.title,
      task.created_at,
      task.done_at,
      task.memo,
      task.done,
      task.due_date
    );
    sender("task/addTask", reqId, true, result);
  } catch (err) {
    sender("task/addTask", reqId, false);
    throw err;
  }
});

register("task/deleteTask", async (event, reqId, taskId) => {
  try {
    let result = await db.run("DELETE FROM tasks WHERE tid = ?", taskId);
    sender("task/deleteTask", reqId, true, result);
  } catch (err) {
    sender("task/deleteTask", reqId, false);
    throw err;
  }
});

register("task/updateTaskTitle", async (event, reqId, taskId, title) => {
  try {
    let result = await db.run("UPDATE tasks SET title = ? WHERE tid = ?", title, taskId);
    sender("task/updateTaskTitle", reqId, true, result);
  } catch (err) {
    sender("task/updateTaskTitle", reqId, false);
    throw err;
  }
});

register("task/updateTaskDueDate", async (event, reqId, taskId, dueDate) => {
  try {
    let result = await db.run("UPDATE tasks SET due_date = ? WHERE tid = ?", dueDate, taskId);
    sender("task/updateTaskDueDate", reqId, true, result);
  } catch (err) {
    sender("task/updateTaskDueDate", reqId, false);
    throw err;
  }
});

register("task/updateTaskMemo", async (event, reqId, taskId, memo) => {
  try {
    let result = await db.run("UPDATE tasks SET memo = ? WHERE tid = ?", memo, taskId);
    sender("task/updateTaskMemo", reqId, true, result);
  } catch (err) {
    sender("task/updateTaskMemo", reqId, false);
    throw err;
  }
});

register("task/updateTaskDone", async (event, reqId, taskId, done, doneAt) => {
  try {
    let result = await db.run("UPDATE tasks SET done = ?, done_at = ? WHERE tid = ?", done, doneAt, taskId);
    sender("task/updateTaskDone", reqId, true, result);
  } catch (err) {
    sender("task/updateTaskDone", reqId, false);
    throw err;
  }
});

register("task/addSubtask", async (event, reqId, subtask, taskId) => {
  try {
    let result = await db.run(
      "INSERT INTO subtasks (title, created_at, done_at, due_date, done, tid) VALUES (?, ?, ?, ?, ?, ?)",
      subtask.title,
      subtask.created_at,
      subtask.done_at,
      subtask.due_date,
      subtask.done,
      taskId
    );

    sender("task/addSubtask", reqId, true, result);
  } catch (err) {
    sender("task/addSubtask", reqId, false);
    throw err;
  }
});

register("task/deleteSubtask", async (event, reqId, subtaskId) => {
  try {
    let result = await db.run("DELETE FROM subtasks WHERE sid = ?", subtaskId);
    sender("task/deleteSubtask", reqId, true, result);
  } catch (err) {
    sender("task/deleteSubtask", reqId, false);
    throw err;
  }
});

register("task/updateSubtaskTitle", async (event, reqId, subtaskId, title) => {
  try {
    let result = await db.run("UPDATE subtasks SET title = ? WHERE sid = ?", title, subtaskId);
    sender("task/updateSubtaskTitle", reqId, true, result);
  } catch (err) {
    sender("task/updateSubtaskTitle", reqId, false);
    throw err;
  }
});

register("task/updateSubtaskDueDate", async (event, reqId, subtaskId, dueDate) => {
  try {
    let result = await db.run("UPDATE subtasks SET due_date = ? WHERE sid = ?", dueDate, subtaskId);
    sender("task/updateSubtaskDueDate", reqId, true, result);
  } catch (err) {
    sender("task/updateSubtaskDueDate", reqId, false);
    throw err;
  }
});

register("task/updateSubtaskDone", async (event, reqId, subtaskId, done, doneAt) => {
  try {
    let result = await db.run("UPDATE subtasks SET done = ?, done_at = ? WHERE sid = ?", done, doneAt, subtaskId);
    sender("task/updateSubtaskDone", reqId, true, result);
  } catch (err) {
    sender("task/updateSubtaskDone", reqId, false);
    throw err;
  }
});

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
