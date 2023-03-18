const {
  ipcMain,
  webContents,
  app,
  BrowserWindow,
  screen,
  remote,
  Menu,
  powerMonitor,
  session,
  shell,
} = require("electron");
const sha256 = require("sha256");
const moment = require("moment");
const WindowPropertyFactory = require("../objects/WindowPropertyFactory");
const __IpcRouter__ = require("../objects/IpcRouter");
const Window = require("./window");
const Request = require("./request");
const crypto = require("crypto");
const { default: axios } = require("axios");
const IpcRouter = new __IpcRouter__();
const silentTopics = [];
const PackageJson = require("../../../package.json");
const AppServerSocket = require("../user_modules/appServerSocket");

const appServerEndpoint = PackageJson.config.app_server_endpoint;
const appServerApiVersion = PackageJson.config.app_server_api_version;
const appServerFinalEndpoint = `${appServerEndpoint}/${appServerApiVersion}`;

/**
 * @type {import("../modules/sqlite3")}
 */
let databaseContext = null;

/**
 * @type {import("sqlite3").Database}
 */
let rootDB = null;
let db = null;

/**
 * @type {BrowserWindow}
 */
let mainWindow = null;

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
      let result = await originalCallback(event, reqId, ...arg);
      return result;
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
const sender = (topic, reqId, success, data = null, ...extra) => {
  if (typeof success !== "boolean")
    console.error(`[IpcMain]: success flag is not boolean (${console.wrap(topic, console.MAGENTA)})`);
  let packagedData = { success, data };
  let sendeeCount = IpcRouter.broadcast(topic, reqId, packagedData, ...extra);

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
register("system/setAsHomeWindow", (event, reqId) => {
  try {
    // make home window resizable
    mainWindow.setResizable(true);
    mainWindow.setFullScreenable(true);
    // mainWindow.setSize(1280, 960);
    sender("system/setAsHomeWindow", reqId, true);
  } catch (err) {
    sender("system/setAsHomeWindow", reqId, false, err);
    throw err;
  }
});

register("system/setAsLoginWindow", (event, reqId) => {
  try {
    // make login window non-resizable
    mainWindow.setResizable(true);
    mainWindow.setFullScreenable(false);
    mainWindow.setFullScreen(false);
    mainWindow.setSize(1280, 900);
    mainWindow.setResizable(false);
    sender("system/setAsLoginWindow", reqId, true);
  } catch (err) {
    sender("system/setAsLoginWindow", reqId, false, err);
    throw err;
  }
});

register("auth/sendGoogleOauthResult", async (event, reqId, data) => {
  try {
    let { auth, user } = data;
    let { access_token, refresh_token } = auth;
    let { auth_id, uid, google_auth_id, google_email, google_profile_image_url } = user;

    // check if user exists already
    let isSignupNeeded = false,
      isLocalHasNoPasswordSoLoginNeeded = false;
    let users = await rootDB.all("SELECT * FROM users WHERE uid = ?;", uid);
    if (users.length === 0) {
      // newly created user
      isSignupNeeded = true;
      // need to create secret key to encrypt/decrypt data
      const newSecret = crypto.randomBytes(32).toString("hex");
      await rootDB.run(
        "INSERT INTO users (uid, auth_id, google_auth_id, google_email, google_profile_image_url, access_token, refresh_token, secret_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?);",
        [
          uid,
          auth_id,
          google_auth_id,
          google_email,
          google_profile_image_url,
          access_token.token,
          refresh_token.token,
          newSecret,
        ]
      );

      // create database for user
      await databaseContext.initialize(uid);
    } else {
      let [user] = users;
      isLocalHasNoPasswordSoLoginNeeded = user.auth_encrypted_pw == null && auth_id != null;
      isSignupNeeded = user.auth_id == null || user.auth_encrypted_pw == null;
      // no need to create user
    }

    db = await databaseContext.getContext(uid);
    sender("auth/sendGoogleOauthResult", reqId, true, {
      isSignupNeeded,
      isLocalHasNoPasswordSoLoginNeeded,
    });
  } catch (err) {
    sender("auth/sendGoogleOauthResult", reqId, false);
    throw err;
  }
});

register("auth/registerAuthInfoSync", async (event, reqId, userId, accessToken, refreshToken) => {
  try {
    if (userId == null) throw new Error("userId is null");
    if (accessToken == null) throw new Error("accessToken is null");
    if (refreshToken == null) throw new Error("refreshToken is null");

    // check if user exists already
    let users = await rootDB.all("SELECT * FROM users WHERE uid = ?;", userId);
    if (users.length === 0) {
      // retry
      sender("auth/registerAuthInfoSync", reqId, false, "NOT_IN_LOCAL");
      return;
    }

    await rootDB.run("UPDATE users SET access_token = ?, refresh_token = ? WHERE uid = ?;", [
      accessToken,
      refreshToken,
      userId,
    ]);
    sender("auth/registerAuthInfoSync", reqId, true);
  } catch (err) {
    sender("auth/registerAuthInfoSync", reqId, false);
    throw err;
  }
});

register("auth/deleteAuthInfo", async (event, reqId, userId) => {
  try {
    await rootDB.run("UPDATE users SET access_token = NULL, refresh_token = NULL WHERE uid = ?;", [userId]);
    sender("auth/deleteAuthInfo", reqId, true);
  } catch (err) {
    sender("auth/deleteAuthInfo", reqId, false);
    throw err;
  }
});

register("auth/loadAuthInfoSync", async (event, reqId, userId) => {
  try {
    let users = await rootDB.all("SELECT * FROM users WHERE uid = ?;", [userId]);
    if (users.length === 0) throw new Error("user not found");
    let [user] = users;
    sender("auth/loadAuthInfoSync", reqId, true, {
      accessToken: user.access_token,
      refreshToken: user.refresh_token,
    });
  } catch (err) {
    sender("auth/loadAuthInfoSync", reqId, false);
    throw err;
  }
});

register("auth/isDatabaseReady", async (event, reqId, userId) => {
  try {
    let ready = await databaseContext.isReadyForOperateUser(userId);
    sender("auth/isDatabaseReady", reqId, true, ready);
  } catch (err) {
    sender("auth/isDatabaseReady", reqId, false);
    throw err;
  }
});

register("auth/initializeDatabase", async (event, reqId, userId) => {
  try {
    await databaseContext.initialize(userId);
    db = await databaseContext.getContext(userId);
    sender("auth/initializeDatabase", reqId, true);
  } catch (err) {
    sender("auth/initializeDatabase", reqId, false);
    throw err;
  }
});

register("auth/signUpWithGoogleAuth", async (event, reqId, signupRequest) => {
  try {
    try {
      await Request.post(appServerFinalEndpoint, "/google_auth/signup", {
        username: signupRequest.username,
        auth_id: signupRequest.authId,
        encrypted_password: sha256(signupRequest.encryptedPassword),
        google_auth_id: signupRequest.googleAuthId,
      });
    } catch (err) {
      sender("auth/signUpWithGoogleAuth", reqId, false, err?.response?.status);
      return;
    }

    // first update user info to local db
    // check if user exists already in local db
    let users = await rootDB.all("SELECT * FROM users WHERE google_auth_id = ?;", signupRequest.googleAuthId);
    if (users.length === 0) {
      sender("auth/signUpWithGoogleAuth", reqId, false, "NOT_FOUND_IN_LOCAL");
      return;
    }

    // update
    await rootDB.run("UPDATE users SET auth_id = ?, auth_encrypted_pw = ? WHERE google_auth_id = ?;", [
      signupRequest.authId,
      signupRequest.encryptedPassword,
      signupRequest.googleAuthId,
    ]);
  } catch (err) {
    sender("auth/signUpWithGoogleAuth", reqId, false);
    throw err;
  }
});

register("auth/signUp", async (event, reqId, signupRequest) => {
  try {
    let result;
    try {
      result = await Request.post(appServerFinalEndpoint, "/auth/signup", {
        username: signupRequest.username,
        auth_id: signupRequest.authId,
        encrypted_password: sha256(signupRequest.encryptedPassword),
      });
    } catch (err) {
      sender("auth/signUp", reqId, false, err?.response?.status);
      return;
    }

    const uid = result.uid;

    // check if user exists already in local db and register it
    let users = await rootDB.all("SELECT * FROM users WHERE uid = ?;", uid);
    if (users.length === 0) {
      // newly created user
      // need to create secret key to encrypt/decrypt data
      const newSecret = crypto.randomBytes(32).toString("hex");
      await rootDB.run("INSERT INTO users (uid, auth_id, auth_encrypted_pw, secret_key) VALUES (?, ?, ?, ?);", [
        uid,
        signupRequest.auth_id,
        signupRequest.auth_encrypted_pw,
        newSecret,
      ]);

      // create database for user
      db = await databaseContext.initialize(uid);
    } else {
      // user already exists in local db
      let [user] = users;
      if (user.auth_id != null && user.auth_encrypted_pw != null) {
        // already exists in local (but not was in server)
        console.warn("auth/signUp: already exists in local (but newly created in server)");
        if (user.auth_id != signupRequest.authId || user.auth_encrypted_pw != signupRequest.encryptedPassword) {
          // but info mismatch, automatically update re-create
          console.warn("auth/signUp: info mismatch, automatically update re-create");
          await rootDB.run("UPDATE users SET auth_id = ?, auth_encrypted_pw = ? WHERE uid = ?;", [
            signupRequest.authId,
            signupRequest.encryptedPassword,
            uid,
          ]);
        } else {
          // no need to update
        }
      }

      if (user.google_auth_id != null || user.google_email != null || user.google_profile_image_url != null) {
        // google auth exists or remains
        // trying to bind auth to google auth (but there was no google auth in server)
        // delete google auth in local db
        console.warn("auth/signUp: trying to bind auth to google auth (but there was no google auth in server)");
        try {
          await rootDB.run(
            "UPDATE users SET google_auth_id = NULL, google_email = NULL, google_profile_image_url = NULL WHERE uid = ?;",
            [uid]
          );
        } catch (err) {
          // that's ok, maybe next time?
          console.error(err);
        }
        sender("auth/signUp", reqId, false, "TRY_TO_BIND_GOOGLE");
        return;
      }

      // already exists in local but wtf is happening?
      // update all anyway
      console.warn("auth/signUp: already exists in local but wtf is happening? (no data in it)");
      await rootDB.run("UPDATE users SET auth_id = ?, auth_encrypted_pw = ? WHERE uid = ?;", [
        signupRequest.authId,
        signupRequest.encryptedPassword,
        uid,
      ]);
    }

    sender("auth/signUp", reqId, true);
  } catch (err) {
    sender("auth/signUp", reqId, false);
    throw err;
  }
});

register("auth/login", async (event, reqId, signinRequest) => {
  let canLoginWithLocal = false;
  try {
    // try login in local
    let localUsers = await rootDB.all("SELECT * FROM users WHERE auth_id = ?;", signinRequest.authId);
    if (localUsers.length > 0) {
      let [localUser] = localUsers;
      if (localUser.auth_encrypted_pw === signinRequest.encryptedPassword) {
        canLoginWithLocal = true;
      }
    }

    let result;
    try {
      result = await Request.post(appServerFinalEndpoint, "/auth/login", {
        auth_id: signinRequest.authId,
        encrypted_password: sha256(signinRequest.encryptedPassword),
      });
    } catch (err) {
      let data = {
        serverStatus: err?.response?.status,
        canLoginWithLocal,
      };

      try {
        if (canLoginWithLocal) {
          let userData = localUsers[0];
          let { uid, username, google_email: googleEmail } = userData;
          data.localUser = { uid, username, googleEmail };
        }
      } catch (err) {
        console.error(err);
      }

      sender("auth/login", reqId, false, data);
      return;
    }

    let { auth, user } = result;
    let { access_token, refresh_token } = auth;
    let { auth_id, uid, google_auth_id, google_email, google_profile_image_url } = user;

    // check if user exists already
    let users = await rootDB.all("SELECT * FROM users WHERE uid = ?;", uid);
    if (users.length === 0) {
      // newly created user
      // need to create secret key to encrypt/decrypt data
      const newSecret = crypto.randomBytes(32).toString("hex");
      await rootDB.run(
        "INSERT INTO users (uid, auth_id, auth_encrypted_pw, google_auth_id, google_email, google_profile_image_url, access_token, refresh_token, secret_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);",
        [
          uid,
          auth_id,
          signinRequest.encryptedPassword,
          google_auth_id,
          google_email,
          google_profile_image_url,
          access_token?.token,
          refresh_token?.token,
          newSecret,
        ]
      );
      // create database for user
      await databaseContext.initialize(uid);
    } else {
      let [user] = users;
      // filter null options
      const nullProperties = Object.keys(user).filter((key) => user[key] == null);
      const newProperties = {
        auth_id,
        auth_encrypted_pw: signinRequest.encryptedPassword,
        google_auth_id,
        google_email,
        google_profile_image_url,
        access_token: access_token?.token,
        refresh_token: refresh_token?.token,
      };

      if (nullProperties.length > 0) {
        // update null properties
        await rootDB.run(`UPDATE users SET ${nullProperties.map((key) => `${key} = ?`).join(", ")} WHERE uid = ?;`, [
          ...nullProperties.map((key) => newProperties[key]),
          uid,
        ]);
      }
    }
    db = await databaseContext.getContext(uid);
    sender("auth/login", reqId, true, result);
  } catch (err) {
    sender("auth/login", reqId, false, { canLoginWithLocal });
    throw err;
  }
});

register("socket/connect", async (event, reqId, userId, accessToken, refreshToken) => {
  try {
    await AppServerSocket(userId, accessToken, refreshToken, Ipc, rootDB, db);
    sender("socket/connect", reqId, true);
  } catch (err) {
    sender("socket/connect", reqId, false, err);
    throw err;
  }
});

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
        "INSERT INTO tasks (title, created_at, done_at, memo, done, due_date, repeat_period, repeat_start_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        task.title,
        task.created_at,
        task.done_at,
        task.memo,
        task.done,
        task.due_date,
        task.repeat_period,
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
      // delete subtasks first
      await db.run("DELETE FROM subtasks WHERE tid = ?", taskId);

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
    await db.begin();

    try {
      if (dueDate == null) {
        await db.run("UPDATE tasks SET repeat_period = NULL, repeat_start_at = NULL WHERE tid = ?", taskId);
      } else {
        await db.run("UPDATE tasks SET repeat_start_at = ? WHERE tid = ?", dueDate, taskId);
      }
      let result = await db.run("UPDATE tasks SET due_date = ? WHERE tid = ?", dueDate, taskId);
      await db.commit();
      sender("task/updateTaskDueDate", reqId, true, result);
    } catch (err) {
      await db.rollback();
      throw err;
    }
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
    let task = await db.get("SELECT * FROM tasks WHERE tid = ? LIMIT 1", taskId);
    if (task != null && task.repeat_period != null) {
      let repeatStartAt = task.repeat_start_at ?? task.due_date;
      let repeatPeriod = task.repeat_period;

      // find next due date with period, just update due_date
      const unitMap = {
        day: "days",
        week: "weeks",
        month: "months",
        year: "years",
      };

      let nextDueDate = null;
      let repeatPeriodUnit = unitMap[repeatPeriod] ?? null;

      if (repeatPeriodUnit != null) {
        nextDueDate = moment(repeatStartAt);
        while (nextDueDate.isBefore(moment()) || nextDueDate.isSameOrBefore(moment(task.due_date))) {
          nextDueDate = moment(nextDueDate).add(1, repeatPeriodUnit);
        }
        nextDueDate = nextDueDate.valueOf();
      } else {
        throw new Error(`repeat period unit not found: (${repeatPeriodUnit})`);
      }

      if (nextDueDate != null) {
        let result = await db.run(
          "UPDATE tasks SET done = ?, done_at = ?, due_date = ? WHERE tid = ?",
          false,
          doneAt,
          nextDueDate,
          taskId
        );
        sender("task/updateTaskDone", reqId, true, result, true, nextDueDate);
      } else {
        throw new Error("nextDueDate is null");
      }
    } else {
      let result = await db.run("UPDATE tasks SET done = ?, done_at = ? WHERE tid = ?", done, doneAt, taskId);
      sender("task/updateTaskDone", reqId, true, result, false);
    }
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

register("task/updateTaskRepeatPeriod", async (event, reqId, taskId, repeatPeriod) => {
  try {
    await db.begin();

    let result;
    try {
      if (repeatPeriod == null) {
        result = await db.run("UPDATE tasks SET repeat_period = NULL, repeat_start_at = NULL WHERE tid = ?", taskId);
      } else {
        let repeatStartAt = await db.get("SELECT repeat_start_at FROM tasks WHERE tid = ?", taskId);
        if (repeatStartAt == null) {
          repeatStartAt = await db.get("SELECT due_date FROM tasks WHERE tid = ?", taskId);
          if (repeatStartAt != null) {
            await db.run("UPDATE tasks SET repeat_start_at = ? WHERE tid = ?", repeatStartAt, taskId);
          } else {
            throw Error(`Trying to update repeat period of task that has no due date. (tid: ${taskId})`);
          }
        }
        result = await db.run("UPDATE tasks SET repeat_period = ? WHERE tid = ?", repeatPeriod, taskId);
      }

      await db.commit();
      sender("task/updateTaskRepeatPeriod", reqId, true, result);
    } catch (err) {
      await db.rollback();
      throw err;
    }
  } catch (err) {
    sender("task/updateTaskRepeatPeriod", reqId, false);
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
    console.log(result);
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

register("category/checkCategoryPassword", async (event, reqId, categoryId, hashedPassword) => {
  try {
    const doubleHashedPassword = sha256(hashedPassword);
    let results = await db.all(
      "SELECT * FROM categories WHERE cid = ? AND encrypted_pw = ?",
      categoryId,
      doubleHashedPassword
    );
    let ok = results.length > 0;
    sender("category/checkCategoryPassword", reqId, true, ok);
  } catch (err) {
    sender("category/checkCategoryPassword", reqId, false);
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

const Ipc = {
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
  setDatabaseContext: (db_) => {
    databaseContext = db_;
    rootDB = databaseContext.getRootContext();
  },
  setMainWindow: (mainWindow_) => {
    mainWindow = mainWindow_;
  },
};

module.exports = Ipc;
