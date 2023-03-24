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
const { reqIdTag } = require("../modules/util");
const Exec = require("../user_modules/executeRouter");
const {
  createTaskPre,
  CreateTaskTxContent,
} = require("../executors/createTask.exec");
const {
  deleteTaskPre,
  DeleteTaskTxContent,
} = require("../executors/deleteTask.exec");
const {
  UpdateTaskOrderTxContent,
  updateTaskOrderPre,
} = require("../executors/updateTaskOrder.exec");
const {
  UpdateTaskTitleTxContent,
} = require("../executors/updateTaskTitle.exec");
const {
  UpdateTaskDueDateTxContent,
} = require("../executors/updateTaskDueDate.exec");
const { UpdateTaskMemoTxContent } = require("../executors/updateTaskMemo.exec");
const {
  createCategoryPre,
  CreateCategoryTxContent,
} = require("../executors/createCategory.exec");
const { DeleteCategoryTxContent } = require("../executors/deleteCategory.exec");
const {
  AddTaskCategoryTxContent,
} = require("../executors/addTaskCategory.exec");
const { UpdateTaskDoneTxContent } = require("../executors/updateTaskDone.exec");
const {
  DeleteTaskCategoryTxContent,
} = require("../executors/deleteTaskCategory.exec");
const {
  UpdateTaskRepeatPeriodTxContent,
} = require("../executors/updateTaskRepeatPeriod.exec");
const {
  CreateSubtaskTxContent,
  createSubtaskPre,
} = require("../executors/createSubtask.exec");
const { DeleteSubtaskTxContent } = require("../executors/deleteSubtask.exec");
const {
  UpdateSubtaskTitleTxContent,
} = require("../executors/updateSubtaskTitle.exec");
const {
  UpdateSubtaskDueDateTxContent,
} = require("../executors/updateSubtaskDueDate.exec");
const {
  UpdateSubtaskDoneTxContent,
} = require("../executors/updateSubtaskDone.exec");
const { initializeState } = require("../executors/initializeState.exec");
const { TX_TYPE } = Exec;

const appServerEndpoint = PackageJson.config.app_server_endpoint;
const appServerApiVersion = PackageJson.config.app_server_api_version;
const appServerFinalEndpoint = `${appServerEndpoint}/${appServerApiVersion}`;

/**
 * @type {import("../modules/sqlite3")}
 * This is database module context (object...)
 */
let databaseContext = null;

/**
 * @type {import("sqlite3").Database}
 */
let rootDB = null;
// This is database context (query...)
let db = null;

/**
 * @type {BrowserWindow}
 */
let mainWindow = null;

/**
 * @type {WebSocket}
 *
 */
let socket = null;

let lastBlockNumberMap = {};
let waitingBlockNumberMap = {};
let currentUserId = null;
const getLastBlockNumber = (userId) => {
  return lastBlockNumberMap[userId] ?? 0;
};
const setLastBlockNumber = (userId, lastBlockNumber_) => {
  if (lastBlockNumberMap[userId] == null) lastBlockNumberMap[userId] = 0;
  lastBlockNumberMap[userId] = lastBlockNumber_;
  sender("system/lastBlockNumber", null, true, lastBlockNumber_);
};
const setWaitingBlockNumber = (userId, waitingBlockNumber_) => {
  if (waitingBlockNumberMap[userId] == null) waitingBlockNumberMap[userId] = 0;
  waitingBlockNumberMap[userId] = waitingBlockNumber_;
  sender("system/waitingBlockNumber", null, true, waitingBlockNumber_);
};

const color = console.RGB(78, 119, 138);
const coloredIpcMain = console.wrap("IpcMain", color);

const register = (topic, callback, ...arg) => {
  const originalCallback = callback;
  callback = async (event, reqId, ...arg) => {
    if (!silentTopics.includes(topic)) {
      let mergedArguments = arg
        .map((param) => console.shorten(param))
        .join(" ");

      console.system(
        `${coloredIpcMain} ${console.wrap(
          `<-${reqIdTag(reqId)}--`,
          console.GREEN
        )} ${console.wrap(topic, console.MAGENTA)} ${mergedArguments}`
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
    console.error(
      `[IpcMain]: success flag is not boolean (${console.wrap(
        topic,
        console.MAGENTA
      )})`
    );
  let packagedData = { success, data };
  let sendeeCount = IpcRouter.broadcast(topic, reqId, packagedData, ...extra);

  if (silentTopics.includes(topic)) return;
  console.system(
    `${coloredIpcMain} ${console.wrap(
      `--${reqIdTag(reqId)}-${success ? ">" : "X"}`,
      success ? console.CYAN : console.RED
    )} ${console.wrap(topic, console.MAGENTA)} ${console.wrap(
      `(${sendeeCount})`,
      console.BLUE
    )} ${JSON.stringify(data)}`
  );
};

// send raw data (without success flag)
const emiter = (topic, reqId, data) => {
  let sendeeCount = IpcRouter.broadcast(topic, reqId, data);

  if (silentTopics.includes(topic)) return;
  console.system(
    `${coloredIpcMain} --${reqIdTag(reqId)}-> ${console.wrap(
      topic,
      console.MAGENTA
    )} ${console.wrap(`(${sendeeCount})`, console.BLUE)}`,
    data
  );
};

const fastSender = (topic, socketResponse) => {
  let success = socketResponse.code === Request.ok;
  let data = socketResponse
    ? success
      ? socketResponse.data
      : socketResponse.code
    : null;

  let packagedData = { success, data };
  let sendeeCount = IpcRouter.broadcast(topic, packagedData);

  if (silentTopics.includes(topic)) return;
  console.system(
    `${coloredIpcMain} ${console.wrap(
      `--${reqIdTag("NIL")}->`,
      console.CYAN
    )} ${console.wrap(topic, console.MAGENTA)} ${console.wrap(
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
  let data = socketResponse
    ? success
      ? socketResponse.data
      : socketResponse.code
    : null;

  let packagedData = { success, data };
  IpcRouter.broadcast(topic, packagedData);
};

/* ---------------------------------------- Websocket (Custom) ---------------------------------------- */
const sendTx = async (tx) => {
  if (socket == null) throw new Error("Socket is not connected");
  if (!(tx instanceof Exec.Transaction))
    throw new Error("Invalid transaction type (not Transaction)");
  try {
    if (socket.connected()) {
      return await socket.emitSync("transaction", tx);
    }
  } catch (err) {
    console.error(err);
    sender("transaction/error", null, false, err.message, tx);
  }
};

/* ---------------------------------------- System ---------------------------------------- */
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
  if (currentWindow)
    sender("isMaximizable", reqId, true, currentWindow.isMaximizable());
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

register("system/lastTxUpdateTime", async (event, reqId) => {
  try {
    let transactions = await db.all(
      "SELECT * FROM transactions ORDER BY block_number DESC LIMIT 1;"
    );
    let lastTxUpdateTime;
    if (transactions.length === 0) {
      lastTxUpdateTime = null;
    } else {
      let [transaction] = transactions;
      lastTxUpdateTime = transaction.timestamp;
    }
    sender("system/lastTxUpdateTime", reqId, true, lastTxUpdateTime);
  } catch (err) {
    sender("system/lastTxUpdateTime", reqId, false, err);
    throw err;
  }
});

register("system/lastBlockNumber", async (event, reqId) => {
  try {
    if (currentUserId == null) throw new Error("currentUserId is null");
    let lastBlockNumber = lastBlockNumberMap[currentUserId];
    if (lastBlockNumber == null) throw new Error("lastBlockNumber is null");
    sender("system/lastBlockNumber", reqId, true, lastBlockNumber);
  } catch (err) {
    throw err;
  }
});

register("system/waitingBlockNumber", async (event, reqId) => {
  try {
    if (currentUserId == null) throw new Error("currentUserId is null");
    let waitingBlockNumber = waitingBlockNumberMap[currentUserId];
    if (waitingBlockNumber != null) {
      sender("system/waitingBlockNumber", reqId, true, waitingBlockNumber);
    }
  } catch (err) {
    throw err;
  }
});

register("system/isDatabaseClear", async (event, reqId) => {
  try {
    // check if transaction is clear
    let transactions = await db.all("SELECT * FROM transactions;");
    let localClear = transactions.length === 0;
    if (!localClear) {
      sender("system/isDatabaseClear", reqId, true, false);
      return;
    }
    // check remote transactions
    if (!socket.connected()) {
      throw new Error("socket is not connected");
    }
    let waitingBlockNumber = await socket.emitSync("waitingBlockNumber");
    sender("system/isDatabaseClear", reqId, true, waitingBlockNumber === 1);
  } catch (err) {
    sender("system/isDatabaseClear", reqId, false);
    throw err;
  }
});

register("system/isMigratable", async (event, reqId) => {
  try {
    let migratableDatabaseExists =
      databaseContext.migratableDatabaseExists(currentUserId);
    sender("system/isMigratable", reqId, true, migratableDatabaseExists);
  } catch (err) {
    sender("system/isMigratable", reqId, false);
    throw err;
  }
});

register("system/migrateDatabase", async (event, reqId) => {
  try {
    await databaseContext.migrateOldDatabase(socket, db, Ipc);
    sender("system/migrateDatabase", reqId, true);
  } catch (err) {
    sender("system/migrateDatabase", reqId, false);
    throw err;
  }
});

register(
  "system/mismatchTxAcceptTheirs",
  async (event, reqId, startNumber, endNumber) => {
    try {
      if (!socket.connected()) {
        throw new Error("socket is not connected");
      }

      // get state from remote
      let state = await socket.emitSync("stateByBlockNumber", {
        blockNumber: startNumber - 1,
      });

      let block = await socket.emitSync("blockByBlockNumber", {
        blockNumber: startNumber - 1,
      });

      // save last tx in local db
      let { tx: rawTx, number } = block;
      const tx = new Exec.Transaction(
        rawTx.version,
        rawTx.type,
        rawTx.timestamp,
        rawTx.content,
        number
      );
      const rawContent = tx.content;
      const decodedBuffer = Buffer.from(JSON.stringify(rawContent));
      await db.run(
        `INSERT INTO transactions (version, type, timestamp, content, hash, block_number) VALUES (?, ?, ?, ?, ?, ?);`,
        [
          tx.version,
          tx.type,
          tx.timestamp,
          decodedBuffer,
          tx.hash,
          tx.blockNumber,
        ]
      );

      // delete user database
      await db.close();
      await databaseContext.deleteDatabase(currentUserId);
      await databaseContext.initialize(currentUserId);
      db = await databaseContext.getContext();

      // insert state to local database
      await initializeState(db, null, Ipc, state, 1);
      setLastBlockNumber(currentUserId, startNumber - 1);

      sender("system/mismatchTxAcceptTheirs", reqId, true);
    } catch (err) {
      sender("system/mismatchTxAcceptTheirs", reqId, false);
      throw err;
    }
  }
);

register(
  "system/mismatchTxAcceptMine",
  async (event, reqId, startNumber, endNumber) => {
    try {
      // delete all transactions from startNumber to endNumber in remote db
      if (!socket.connected()) {
        throw new Error("socket is not connected");
      }
      await socket.emitSync("deleteMismatchBlocks", {
        startNumber,
        endNumber,
      });
      sender("system/mismatchTxAcceptMine", reqId, true);
    } catch (err) {
      sender("system/mismatchTxAcceptMine", reqId, false);
      throw err;
    }
  }
);

register("auth/sendGoogleOauthResult", async (event, reqId, data) => {
  try {
    let { googleUserInfo } = data;
    let { email: google_email, picture: google_profile_image_url } =
      googleUserInfo;
    let user;

    // check if user exists already
    let isSignupNeeded = false;
    let users = await rootDB.all(
      "SELECT * FROM users WHERE google_email = ?;",
      google_email
    );
    if (users.length === 0) {
      // newly created user
      isSignupNeeded = true;
    } else {
      user = users[0];
      isSignupNeeded = user.auth_id == null || user.auth_encrypted_pw == null;
      // no need to create user
    }

    sender("auth/sendGoogleOauthResult", reqId, true, {
      isSignupNeeded,
      user,
    });
  } catch (err) {
    sender("auth/sendGoogleOauthResult", reqId, false);
    throw err;
  }
});

register(
  "auth/registerAuthInfoSync",
  async (event, reqId, userId, accessToken, refreshToken) => {
    try {
      if (userId == null) throw new Error("userId is null");
      if (accessToken == null) throw new Error("accessToken is null");
      if (refreshToken == null) throw new Error("refreshToken is null");

      // check if user exists already
      let users = await rootDB.all(
        "SELECT * FROM users WHERE uid = ?;",
        userId
      );
      if (users.length === 0) {
        // retry
        sender("auth/registerAuthInfoSync", reqId, false, "NOT_IN_LOCAL");
        return;
      }

      await rootDB.run(
        "UPDATE users SET access_token = ?, refresh_token = ? WHERE uid = ?;",
        [accessToken, refreshToken, userId]
      );
      sender("auth/registerAuthInfoSync", reqId, true);
    } catch (err) {
      sender("auth/registerAuthInfoSync", reqId, false, err.message);
      throw err;
    }
  }
);

register("auth/deleteAuthInfo", async (event, reqId, userId) => {
  try {
    await rootDB.run(
      "UPDATE users SET access_token = NULL, refresh_token = NULL WHERE uid = ?;",
      [userId]
    );
    sender("auth/deleteAuthInfo", reqId, true);
  } catch (err) {
    sender("auth/deleteAuthInfo", reqId, false);
    throw err;
  }
});

register("auth/loadAuthInfoSync", async (event, reqId, userId) => {
  try {
    let users = await rootDB.all("SELECT * FROM users WHERE uid = ?;", [
      userId,
    ]);
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
    let result;
    try {
      result = await Request.post(
        appServerFinalEndpoint,
        "/google_auth/signup",
        {
          username: signupRequest.username,
          auth_id: signupRequest.authId,
          encrypted_password: sha256(signupRequest.encryptedPassword),
          google_auth_id: signupRequest.googleAuthId,
          google_email: signupRequest.googleEmail,
          google_profile_image_url: signupRequest.googleProfileImageUrl,
        }
      );
    } catch (err) {
      console.error(err);
      console.debug(err?.response?.data);
      sender("auth/signUpWithGoogleAuth", reqId, false, err?.response?.status);
      return;
    }

    // first update user info to local db
    // check if user exists already in local db
    let users = await rootDB.all(
      "SELECT * FROM users WHERE uid = ?;",
      result.userId
    );
    if (users.length === 0) {
      // create new
      await rootDB.run(
        "INSERT INTO users (uid, auth_id, username, auth_encrypted_pw, google_auth_id, google_email, google_profile_image_url, auth_hashed_pw) VALUES (?, ?, ?, ?, ?, ?, ?, ?);",
        [
          result.userId,
          result.authId,
          result.username,
          signupRequest.encryptedPassword,
          result.googleAuthId,
          result.googleEmail,
          result.googleProfileImageUrl,
          signupRequest.hashedPassword,
        ]
      );
    } else {
      // update google info (already registered without google)
      await rootDB.run(
        "UPDATE users SET google_auth_id = ?, google_email = ?, google_profile_image_url = ? WHERE uid = ?;",
        [
          result.googleAuthId,
          result.googleEmail,
          result.googleProfileImageUrl,
          result.userId,
        ]
      );
    }

    sender("auth/signUpWithGoogleAuth", reqId, true, { user: result });
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
      await rootDB.run(
        "INSERT INTO users (uid, auth_id, auth_encrypted_pw, username, auth_hashed_pw) VALUES (?, ?, ?, ?, ?);",
        [
          uid,
          result.auth_id,
          signupRequest.encryptedPassword,
          result.username,
          signupRequest.hashedPassword,
        ]
      );

      // create database for user
      await databaseContext.initialize(uid);
    } else {
      // user already exists in local db
      let [user] = users;
      if (user.auth_id != null && user.auth_encrypted_pw != null) {
        // already exists in local (but not was in server)
        console.warn(
          "auth/signUp: already exists in local (but newly created in server)"
        );
        if (
          user.auth_id != signupRequest.authId ||
          user.auth_encrypted_pw != signupRequest.encryptedPassword
        ) {
          // but info mismatch, automatically update re-create
          console.warn(
            "auth/signUp: info mismatch, automatically update re-create"
          );
          await rootDB.run(
            "UPDATE users SET auth_id = ?, auth_encrypted_pw = ? WHERE uid = ?;",
            [signupRequest.authId, signupRequest.encryptedPassword, uid]
          );
        } else {
          // no need to update
        }
      }

      if (
        user.google_auth_id != null ||
        user.google_email != null ||
        user.google_profile_image_url != null
      ) {
        // google auth exists or remains
        // trying to bind auth to google auth (but there was no google auth in server)
        // delete google auth in local db
        console.warn(
          "auth/signUp: trying to bind auth to google auth (but there was no google auth in server)"
        );
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
      console.warn(
        "auth/signUp: already exists in local but wtf is happening? (no data in it)"
      );
      await rootDB.run(
        "UPDATE users SET auth_id = ?, auth_encrypted_pw = ? WHERE uid = ?;",
        [signupRequest.authId, signupRequest.encryptedPassword, uid]
      );
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
    let localUsers = await rootDB.all(
      "SELECT * FROM users WHERE auth_id = ?;",
      signinRequest.authId
    );
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
    let {
      auth_id,
      uid,
      google_auth_id,
      google_email,
      google_profile_image_url,
    } = user;

    // check if user exists already
    let users = await rootDB.all("SELECT * FROM users WHERE uid = ?;", uid);
    if (users.length === 0) {
      // newly created user
      // need to create secret key to encrypt/decrypt data
      await rootDB.run(
        "INSERT INTO users (uid, auth_id, auth_encrypted_pw, google_auth_id, google_email, google_profile_image_url, access_token, refresh_token, auth_hashed_pw) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);",
        [
          uid,
          auth_id,
          signinRequest.encryptedPassword,
          google_auth_id,
          google_email,
          google_profile_image_url,
          access_token?.token,
          refresh_token?.token,
          signinRequest.hashedPassword,
        ]
      );
      // create database for user
      await databaseContext.initialize(uid);
    } else {
      let [user] = users;
      // filter null options
      const nullProperties = Object.keys(user).filter(
        (key) => user[key] == null
      );
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
        await rootDB.run(
          `UPDATE users SET ${nullProperties
            .map((key) => `${key} = ?`)
            .join(", ")} WHERE uid = ?;`,
          [...nullProperties.map((key) => newProperties[key]), uid]
        );
      }
    }
    db = await databaseContext.getContext(uid);
    sender("auth/login", reqId, true, result);
  } catch (err) {
    sender("auth/login", reqId, false, { canLoginWithLocal });
    throw err;
  }
});

register(
  "socket/connect",
  async (event, reqId, userId, accessToken, refreshToken) => {
    try {
      if (db == null) {
        db = await databaseContext.getContext(userId);
      }

      currentUserId = userId;

      // find last blocknumber
      let transactions = await db.all(
        "SELECT * FROM transactions ORDER BY block_number DESC LIMIT 1;"
      );
      if (transactions.length === 0) {
        lastBlockNumber = 0;
      } else {
        let [transaction] = transactions;
        lastBlockNumber = transaction.block_number;
        sender("system/lastTxUpdateTime", null, true, transaction.timestamp);
      }
      console.debug(
        `current last block number: ${lastBlockNumber} for user ${userId}`
      );
      setLastBlockNumber(userId, lastBlockNumber);

      await AppServerSocket(
        userId,
        accessToken,
        refreshToken,
        Ipc,
        rootDB,
        db,
        false,
        (socket_) => {
          socket = socket_;
        }
      );
      sender("socket/connect", reqId, true);
    } catch (err) {
      sender("socket/connect", reqId, false, err);
      throw err;
    }
  }
);

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
    let preResult = await createTaskPre(db);
    const txContent = new CreateTaskTxContent(
      preResult.tid,
      task.title,
      task.created_at,
      task.done_at,
      task.memo,
      task.done,
      task.due_date,
      task.repeat_period,
      task.repeat_start_at,
      task.categories,
      preResult.prevTaskId
    );
    const targetBlockNumber = getLastBlockNumber(currentUserId) + 1;
    const tx = Exec.makeTransaction(
      TX_TYPE.CREATE_TASK,
      txContent,
      targetBlockNumber
    );
    Exec.txExecutor(db, reqId, Ipc, tx);
    sendTx(tx);
  } catch (err) {
    sender("task/addTask", reqId, false);
    throw err;
  }
});

// 3 -> 4 -> 5 (delete 4)
// 3.next = 5
register("task/deleteTask", async (event, reqId, taskId) => {
  try {
    let preResult = await deleteTaskPre(db, taskId);
    const txContent = new DeleteTaskTxContent(taskId, preResult.prevTaskId);
    const targetBlockNumber = getLastBlockNumber(currentUserId) + 1;
    const tx = Exec.makeTransaction(
      TX_TYPE.DELETE_TASK,
      txContent,
      targetBlockNumber
    );
    Exec.txExecutor(db, reqId, Ipc, tx);
    sendTx(tx);
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
register(
  "task/updateTaskOrder",
  async (event, reqId, taskId, targetTaskId, afterTarget) => {
    try {
      let preResult = await updateTaskOrderPre(db, taskId, targetTaskId);
      const txContent = new UpdateTaskOrderTxContent(
        taskId,
        targetTaskId,
        afterTarget,
        preResult.prevTaskId,
        preResult.targetPrevTaskId
      );
      const targetBlockNumber = getLastBlockNumber(currentUserId) + 1;
      const tx = Exec.makeTransaction(
        TX_TYPE.UPDATE_TASK_ORDER,
        txContent,
        targetBlockNumber
      );
      Exec.txExecutor(db, reqId, Ipc, tx);
      sendTx(tx);
    } catch (err) {
      sender("task/updateTaskOrder", reqId, false);
      console.error(err);
    }
  }
);

register("task/updateTaskTitle", async (event, reqId, taskId, title) => {
  try {
    const txContent = new UpdateTaskTitleTxContent(taskId, title);
    const targetBlockNumber = getLastBlockNumber(currentUserId) + 1;
    const tx = Exec.makeTransaction(
      TX_TYPE.UPDATE_TASK_TITLE,
      txContent,
      targetBlockNumber
    );
    Exec.txExecutor(db, reqId, Ipc, tx);
    sendTx(tx);
  } catch (err) {
    sender("task/updateTaskTitle", reqId, false);
    throw err;
  }
});

register("task/updateTaskDueDate", async (event, reqId, taskId, dueDate) => {
  try {
    const txContent = new UpdateTaskDueDateTxContent(taskId, dueDate);
    const targetBlockNumber = getLastBlockNumber(currentUserId) + 1;
    const tx = Exec.makeTransaction(
      TX_TYPE.UPDATE_TASK_DUE_DATE,
      txContent,
      targetBlockNumber
    );
    Exec.txExecutor(db, reqId, Ipc, tx);
    sendTx(tx);
  } catch (err) {
    sender("task/updateTaskDueDate", reqId, false);
    throw err;
  }
});

register("task/updateTaskMemo", async (event, reqId, taskId, memo) => {
  try {
    const txContent = new UpdateTaskMemoTxContent(taskId, memo);
    const targetBlockNumber = getLastBlockNumber(currentUserId) + 1;
    const tx = Exec.makeTransaction(
      TX_TYPE.UPDATE_TASK_MEMO,
      txContent,
      targetBlockNumber
    );
    Exec.txExecutor(db, reqId, Ipc, tx);
    sendTx(tx);
  } catch (err) {
    sender("task/updateTaskMemo", reqId, false);
    throw err;
  }
});

register("task/updateTaskDone", async (event, reqId, taskId, done, doneAt) => {
  try {
    const txContent = new UpdateTaskDoneTxContent(taskId, done, doneAt);
    const targetBlockNumber = getLastBlockNumber(currentUserId) + 1;
    const tx = Exec.makeTransaction(
      TX_TYPE.UPDATE_TASK_DONE,
      txContent,
      targetBlockNumber
    );
    Exec.txExecutor(db, reqId, Ipc, tx);
    sendTx(tx);
  } catch (err) {
    sender("task/updateTaskDone", reqId, false);
    throw err;
  }
});

register("task/addTaskCategory", async (event, reqId, taskId, categoryId) => {
  try {
    const txContent = new AddTaskCategoryTxContent(taskId, categoryId);
    const targetBlockNumber = getLastBlockNumber(currentUserId) + 1;
    const tx = Exec.makeTransaction(
      TX_TYPE.ADD_TASK_CATEGORY,
      txContent,
      targetBlockNumber
    );
    Exec.txExecutor(db, reqId, Ipc, tx);
    sendTx(tx);
  } catch (err) {
    sender("task/addTaskCategory", reqId, false);
    throw err;
  }
});

register(
  "task/deleteTaskCategory",
  async (event, reqId, taskId, categoryId) => {
    try {
      const txContent = new DeleteTaskCategoryTxContent(taskId, categoryId);
      const targetBlockNumber = getLastBlockNumber(currentUserId) + 1;
      const tx = Exec.makeTransaction(
        TX_TYPE.DELETE_TASK_CATEGORY,
        txContent,
        targetBlockNumber
      );
      Exec.txExecutor(db, reqId, Ipc, tx);
      sendTx(tx);
    } catch (err) {
      sender("task/deleteTaskCategory", reqId, false);
      throw err;
    }
  }
);

register(
  "task/updateTaskRepeatPeriod",
  async (event, reqId, taskId, repeatPeriod) => {
    try {
      const txContent = new UpdateTaskRepeatPeriodTxContent(
        taskId,
        repeatPeriod
      );
      const targetBlockNumber = getLastBlockNumber(currentUserId) + 1;
      const tx = Exec.makeTransaction(
        TX_TYPE.UPDATE_TASK_REPEAT_PERIOD,
        txContent,
        targetBlockNumber
      );
      Exec.txExecutor(db, reqId, Ipc, tx);
      sendTx(tx);
    } catch (err) {
      sender("task/updateTaskRepeatPeriod", reqId, false);
      throw err;
    }
  }
);

register("task/createSubtask", async (event, reqId, subtask, taskId) => {
  try {
    const preResult = await createSubtaskPre();
    const txContent = new CreateSubtaskTxContent(
      taskId,
      preResult.sid,
      subtask.title,
      subtask.created_at,
      subtask.done_at,
      subtask.due_date,
      subtask.done
    );
    const targetBlockNumber = getLastBlockNumber(currentUserId) + 1;
    const tx = Exec.makeTransaction(
      TX_TYPE.CREATE_SUBTASK,
      txContent,
      targetBlockNumber
    );
    Exec.txExecutor(db, reqId, Ipc, tx);
    sendTx(tx);
  } catch (err) {
    sender("task/createSubtask", reqId, false);
    throw err;
  }
});

register("task/deleteSubtask", async (event, reqId, taskId, subtaskId) => {
  try {
    const txContent = new DeleteSubtaskTxContent(taskId, subtaskId);
    const targetBlockNumber = getLastBlockNumber(currentUserId) + 1;
    const tx = Exec.makeTransaction(
      TX_TYPE.DELETE_SUBTASK,
      txContent,
      targetBlockNumber
    );
    Exec.txExecutor(db, reqId, Ipc, tx);
    sendTx(tx);
  } catch (err) {
    sender("task/deleteSubtask", reqId, false);
    throw err;
  }
});

register(
  "task/updateSubtaskTitle",
  async (event, reqId, taskId, subtaskId, title) => {
    try {
      const txContent = new UpdateSubtaskTitleTxContent(
        taskId,
        subtaskId,
        title
      );
      const targetBlockNumber = getLastBlockNumber(currentUserId) + 1;
      const tx = Exec.makeTransaction(
        TX_TYPE.UPDATE_SUBTASK_TITLE,
        txContent,
        targetBlockNumber
      );
      Exec.txExecutor(db, reqId, Ipc, tx);
      sendTx(tx);
    } catch (err) {
      sender("task/updateSubtaskTitle", reqId, false);
      throw err;
    }
  }
);

register(
  "task/updateSubtaskDueDate",
  async (event, reqId, taskId, subtaskId, dueDate) => {
    try {
      const txContent = new UpdateSubtaskDueDateTxContent(
        taskId,
        subtaskId,
        dueDate
      );
      const targetBlockNumber = getLastBlockNumber(currentUserId) + 1;
      const tx = Exec.makeTransaction(
        TX_TYPE.UPDATE_SUBTASK_DUE_DATE,
        txContent,
        targetBlockNumber
      );
      Exec.txExecutor(db, reqId, Ipc, tx);
      sendTx(tx);
    } catch (err) {
      sender("task/updateSubtaskDueDate", reqId, false);
      throw err;
    }
  }
);

register(
  "task/updateSubtaskDone",
  async (event, reqId, taskId, subtaskId, done, doneAt) => {
    try {
      const txContent = new UpdateSubtaskDoneTxContent(
        taskId,
        subtaskId,
        done,
        doneAt
      );
      const targetBlockNumber = getLastBlockNumber(currentUserId) + 1;
      const tx = Exec.makeTransaction(
        TX_TYPE.UPDATE_SUBTASK_DONE,
        txContent,
        targetBlockNumber
      );
      Exec.txExecutor(db, reqId, Ipc, tx);
      sendTx(tx);
    } catch (err) {
      sender("task/updateSubtaskDone", reqId, false);
      throw err;
    }
  }
);

register("category/getCategoryList", async (event, reqId) => {
  try {
    let result = await db.all("SELECT * FROM categories;");
    sender("category/getCategoryList", reqId, true, result);
  } catch (err) {
    sender("category/getCategoryList", reqId, false);
    throw err;
  }
});

register("category/createCategory", async (event, reqId, category) => {
  try {
    let preResult = await createCategoryPre();
    const txContent = new CreateCategoryTxContent(
      preResult.cid,
      category.title,
      category.secret,
      category.locked,
      category.color
    );
    const targetBlockNumber = getLastBlockNumber(currentUserId) + 1;
    const tx = Exec.makeTransaction(
      TX_TYPE.CREATE_CATEGORY,
      txContent,
      targetBlockNumber
    );
    Exec.txExecutor(db, reqId, Ipc, tx);
    sendTx(tx);
  } catch (err) {
    sender("category/createCategory", reqId, false);
    throw err;
  }
});

register("category/deleteCategory", async (event, reqId, categoryId) => {
  try {
    const txContent = new DeleteCategoryTxContent(categoryId);
    const targetBlockNumber = getLastBlockNumber(currentUserId) + 1;
    const tx = Exec.makeTransaction(
      TX_TYPE.DELETE_CATEGORY,
      txContent,
      targetBlockNumber
    );
    Exec.txExecutor(db, reqId, Ipc, tx);
    sendTx(tx);
  } catch (err) {
    sender("category/deleteCategory", reqId, false);
    throw err;
  }
});

register(
  "category/updateCategoryTitle",
  async (event, reqId, categoryId, title) => {
    try {
      let result = await db.run(
        "UPDATE categories SET title = ? WHERE cid = ?",
        title,
        categoryId
      );
      sender("category/updateCategoryTitle", reqId, true, result);
    } catch (err) {
      sender("category/updateCategoryTitle", reqId, false);
      throw err;
    }
  }
);

register("category/getCategoryTasks", async (event, reqId, categoryId) => {
  try {
    let result = await db.all(
      "SELECT * FROM tasks_categories WHERE cid = ?",
      categoryId
    );
    sender("category/getCategoryTasks", reqId, true, result);
  } catch (err) {
    sender("category/getCategoryTasks", reqId, false);
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

register(
  "category/checkCategoryPassword",
  async (event, reqId, hashedPassword) => {
    try {
      // TODO :: change to comparison with user password
      let results = await rootDB.all(
        "SELECT * FROM users WHERE auth_hashed_pw = ?",
        hashedPassword
      );
      let ok = results.length > 0;
      sender("category/checkCategoryPassword", reqId, true, ok);
    } catch (err) {
      sender("category/checkCategoryPassword", reqId, false);
      throw err;
    }
  }
);

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
  setLastBlockNumber,
  setLastBlockNumberWithoutUserId: (lastBlockNumber_) => {
    setLastBlockNumber(currentUserId, lastBlockNumber_);
  },
  getLastBlockNumber,
  setWaitingBlockNumber,
};

module.exports = Ipc;
