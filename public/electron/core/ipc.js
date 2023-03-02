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
      console.error(err);
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
    `IpcMain ${console.wrap(
      `--${reqIdTag(reqId)}-${success ? ">" : "X"}`,
      success ? console.CYAN : console.RED
    )} ${console.wrap(topic, console.MAGENTA)} ${console.wrap(`(${sendeeCount})`, console.BLUE)} ${JSON.stringify(
      data
    )}`
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
  let success = socketResponse.code === Request.ok;
  let data = socketResponse ? (success ? socketResponse.data : socketResponse.code) : null;

  let packagedData = { success, data };
  let sendeeCount = IpcRouter.broadcast(topic, packagedData);

  if (silentTopics.includes(topic)) return;
  console.system(
    `IpcMain ${console.wrap(`--${reqIdTag("NIL")}->`, console.CYAN)} ${console.wrap(
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

register("system/isMaximizable", (event, reqId, param) => {
  let currentWindow = BrowserWindow.fromId(param);
  if (currentWindow) sender("isMaximizable", reqId, true, currentWindow.isMaximizable());
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

// 3 -> 5 (add 4)
// 3.next = 4
register("task/addTask", async (event, reqId, task) => {
  try {
    // find tid is null
    let lastTidList = await db.all("SELECT tid FROM tasks WHERE next IS NULL LIMIT 2;");
    if (lastTidList.length > 1) {
      console.log(lastTidList);
      throw new Error(`tasks that ID is null is more than 1. (${lastTidList.length})`);
    }

    let [lastTask] = lastTidList;

    // transaction
    await db.begin();

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

      if (lastTask != null) {
        await db.run(`UPDATE tasks SET next = ? WHERE tid = ?;`, result.lastID, lastTask.tid);
      }

      // add category to task
      const categories = task.categories;
      if (categories) {
        for (let cid in categories) {
          await db.run(`INSERT INTO tasks_categories (tid, cid) VALUES (?, ?);`, result.lastID, cid);
        }
      }

      await db.commit();
      sender("task/addTask", reqId, true, {
        tid: result.lastID,
        prevTaskId: lastTask ? lastTask.tid : null,
      });
    } catch (err) {
      await db.rollback();
      throw err;
    }
  } catch (err) {
    sender("task/addTask", reqId, false);
    throw err;
  }
});

// 3 -> 4 -> 5 (delete 4)
// 3.next = 5
register("task/deleteTask", async (event, reqId, taskId) => {
  try {
    let prevTaskList = await db.all("SELECT * FROM tasks WHERE next = ?;", taskId);
    if (prevTaskList.length > 1) {
      console.log(prevTaskList);
      throw new Error(`tasks that ID is null is more than 1. (${prevTaskList.length})`);
    }

    let [prevTask] = prevTaskList;

    // transaction
    try {
      await db.begin();
    } catch (err) {
      throw err;
    }

    try {
      // get next task
      let [curTask] = await db.all("SELECT * FROM tasks WHERE tid = ? LIMIT 1;", taskId);
      let nextTaskId = curTask.next ?? null;

      await db.run("UPDATE tasks SET next = NULL WHERE next = ?;", taskId);
      await db.run("DELETE FROM tasks_categories WHERE tid = ?", taskId);

      await db.run("DELETE FROM tasks WHERE tid = ?", taskId);

      // update previous task's next
      if (prevTask != null) {
        await db.run(`UPDATE tasks SET next = ? WHERE tid = ?;`, nextTaskId, prevTask.tid);
      }

      // delete subtasks
      await db.run("DELETE FROM subtasks WHERE tid = ?", taskId);
      await db.commit();
      sender("task/deleteTask", reqId, true, {
        tid: taskId,
      });
    } catch (err) {
      await db.rollback();
      throw err;
    }
  } catch (err) {
    sender("task/deleteTask", reqId, false);
    throw err;
  }
});

// 2 -> 3 -> 4 -> 5 (move 4 after 2)
// 2.next = 4
// 3.next = 5
// 4.next = 3
// 2 -> 3 -> 4 -> 5 (move 4 before 2)
// 4.next = 2
// 3.next = 5
register("task/updateTaskOrder", async (event, reqId, taskId, targetTaskId, afterTarget) => {
  try {
    let prevTaskList = await db.all("SELECT * FROM tasks WHERE next = ?;", taskId);
    if (prevTaskList.length > 1) {
      console.log(prevTaskList);
      throw new Error(`tasks that ID is null is more than 1. (${prevTaskList.length})`);
    }

    let [prevTask] = prevTaskList;

    // transaction
    await db.begin();

    try {
      // get next task
      let [curTask] = await db.all("SELECT * FROM tasks WHERE tid = ? LIMIT 1;", taskId);
      let nextTaskId = curTask.next ?? null;

      // delete current task's next
      await db.run(`UPDATE tasks SET next = NULL WHERE tid = ?;`, taskId);

      // update previous task's next
      if (prevTask != null) {
        // prev.next = current.next
        if (nextTaskId != null) {
          await db.run(`UPDATE tasks SET next = ? WHERE tid = ?;`, nextTaskId, prevTask.tid);
        } else {
          await db.run(`UPDATE tasks SET next = NULL WHERE tid = ?;`, prevTask.tid);
        }
      }

      let targetPrevTask;
      // update target task's next
      if (afterTarget) {
        let [targetTask] = await db.all("SELECT * FROM tasks WHERE tid = ? LIMIT 1;", targetTaskId);
        let targetNextTaskId = targetTask.next ?? null;

        // target.next = current.id
        await db.run(`UPDATE tasks SET next = ? WHERE tid = ?;`, taskId, targetTaskId);
        // current.next = target.next.id
        await db.run(`UPDATE tasks SET next = ? WHERE tid = ?;`, targetNextTaskId, taskId);
        // console.log(targetTaskId, targetNextTaskId, prevTask.tid, taskId, nextTaskId);
      } else {
        let targetPrevTaskList = await db.all("SELECT * FROM tasks WHERE next = ?;", targetTaskId);
        if (targetPrevTaskList.length > 1) {
          console.log(targetPrevTaskList);
          throw new Error(`tasks that ID is null is more than 1. (${targetPrevTaskList.length})`);
        }

        [targetPrevTask] = targetPrevTaskList;
        if (targetPrevTask) {
          await db.run(`UPDATE tasks SET next = ? WHERE tid = ?;`, taskId, targetPrevTask.tid);
        }

        // current.next = target.id
        await db.run(`UPDATE tasks SET next = ? WHERE tid = ?;`, targetTaskId, taskId);
      }

      await db.commit();
      sender("task/updateTaskOrder", reqId, true, {
        tid: taskId,
        targetPrevTid: targetPrevTask ? targetPrevTask.tid : null,
      });
    } catch (err) {
      await db.rollback();
      throw err;
    }
  } catch (err) {
    sender("task/updateTaskOrder", reqId, false);
    console.error(err);
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

register("task/addTaskCategory", async (event, reqId, taskId, categoryId) => {
  try {
    let result = await db.run("INSERT INTO tasks_categories (tid, cid) VALUES (?, ?)", taskId, categoryId);
    sender("task/addTaskCategory", reqId, true, result);
  } catch (err) {
    sender("task/addTaskCategory", reqId, false);
    throw err;
  }
});

register("task/deleteTaskCategory", async (event, reqId, taskId, categoryId) => {
  try {
    let result = await db.run("DELETE FROM tasks_categories WHERE tid = ? AND cid = ?", taskId, categoryId);
    sender("task/deleteTaskCategory", reqId, true, result);
  } catch (err) {
    sender("task/deleteTaskCategory", reqId, false);
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

register("category/getCategoryList", async (event, reqId) => {
  try {
    let result = await db.all("SELECT * FROM categories;");
    sender("category/getCategoryList", reqId, true, result);
  } catch (err) {
    sender("category/getCategoryList", reqId, false);
    throw err;
  }
});

register("category/addCategory", async (event, reqId, category) => {
  try {
    let result = await db.run(
      "INSERT INTO categories (title, secret, encrypted_pw, color) VALUES (?, ?, ?, ?)",
      category.title,
      category.secret,
      category.encrypted_pw,
      category.color
    );
    sender("category/addCategory", reqId, true, result);
  } catch (err) {
    sender("category/addCategory", reqId, false);
    throw err;
  }
});

register("category/deleteCategory", async (event, reqId, categoryId) => {
  try {
    await db.begin();

    try {
      let result = await db.run("DELETE FROM tasks_categories WHERE cid = ?", categoryId);
      result = await db.run("DELETE FROM categories WHERE cid = ?", categoryId);
      db.commit();
      sender("category/deleteCategory", reqId, true, result);
    } catch (err) {
      await db.rollback();
      throw err;
    }
  } catch (err) {
    sender("category/deleteCategory", reqId, false);
    throw err;
  }
});

register("category/getCategoryTasks", async (event, reqId, categoryId) => {
  try {
    let result = await db.all("SELECT * FROM tasks_categories WHERE cid = ?", categoryId);
    sender("category/getCategoryTasks", reqId, true, result);
  } catch (err) {
    sender("category/getCategoryTasks", reqId, false);
    throw err;
  }
});

register("category/updateCategoryTitle", async (event, reqId, categoryId, title) => {
  try {
    let result = await db.run("UPDATE categories SET title = ? WHERE cid = ?", title, categoryId);
    sender("category/updateCategoryTitle", reqId, true, result);
  } catch (err) {
    sender("category/updateCategoryTitle", reqId, false);
    throw err;
  }
});

register("tasks_categories/getTasksCategoriesList", async (event, reqId) => {
  try {
    let result = await db.all("SELECT * FROM tasks_categories;");
    sender("tasks_categories/getTasksCategoriesList", reqId, true, result);
  } catch (err) {
    sender("tasks_categories/getTasksCategoriesList", reqId, false);
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
