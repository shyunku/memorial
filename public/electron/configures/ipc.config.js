/**
 * @param ipcService {IpcService}
 */
const {app, BrowserWindow, powerMonitor} = require("electron");
const Request = require("../core/request");
const sha256 = require("sha256");
const IpcRouter = require("../objects/IpcRouter");
const {
  createTaskPre,
  CreateTaskTxContent,
} = require("../executors/createTask.exec");
const {
  deleteTaskPre,
  DeleteTaskTxContent,
} = require("../executors/deleteTask.exec");
const {
  updateTaskOrderPre,
  UpdateTaskOrderTxContent,
} = require("../executors/updateTaskOrder.exec");
const {
  UpdateTaskTitleTxContent,
} = require("../executors/updateTaskTitle.exec");
const {
  UpdateTaskDueDateTxContent,
} = require("../executors/updateTaskDueDate.exec");
const {UpdateTaskMemoTxContent} = require("../executors/updateTaskMemo.exec");
const {UpdateTaskDoneTxContent} = require("../executors/updateTaskDone.exec");
const {
  AddTaskCategoryTxContent,
} = require("../executors/addTaskCategory.exec");
const {
  DeleteTaskCategoryTxContent,
} = require("../executors/deleteTaskCategory.exec");
const {
  UpdateTaskRepeatPeriodTxContent,
} = require("../executors/updateTaskRepeatPeriod.exec");
const {
  createSubtaskPre,
  CreateSubtaskTxContent,
} = require("../executors/createSubtask.exec");
const {DeleteSubtaskTxContent} = require("../executors/deleteSubtask.exec");
const {
  UpdateSubtaskTitleTxContent,
} = require("../executors/updateSubtaskTitle.exec");
const {
  UpdateSubtaskDueDateTxContent,
} = require("../executors/updateSubtaskDueDate.exec");
const {
  UpdateSubtaskDoneTxContent,
} = require("../executors/updateSubtaskDone.exec");
const {
  createCategoryPre,
  CreateCategoryTxContent,
} = require("../executors/createCategory.exec");
const {DeleteCategoryTxContent} = require("../executors/deleteCategory.exec");
const {getServerFinalEndpoint} = require("../modules/util");
const TX_TYPE = require("../constants/TxType.constants");

/**
 * @param s {IpcService}
 */
module.exports = function (s) {
  const appServerFinalEndpoint = getServerFinalEndpoint();
  /* ---------------------------------------- System ---------------------------------------- */
  s.register("system/terminate_signal", (event, reqId, param) => {
    app.quit();
  });

  s.register("system/relaunch", (event, reqId, param) => {
    app.relaunch();
    app.exit();
  });

  s.register("system/close_window", (event, reqId, param) => {
    let currentWindow = BrowserWindow.fromId(param);
    if (currentWindow) currentWindow.close();
  });

  s.register("system/maximize_window", (event, reqId, param) => {
    let currentWindow = BrowserWindow.fromId(param);
    if (currentWindow) currentWindow.maximize();
  });

  s.register("system/minimize_window", (event, reqId, param) => {
    let currentWindow = BrowserWindow.fromId(param);
    if (currentWindow) currentWindow.minimize();
  });

  s.register("system/restore_window", (event, reqId, param) => {
    let currentWindow = BrowserWindow.fromId(param);
    if (currentWindow) currentWindow.restore();
  });

  s.register("system/isMaximizable", (event, reqId, param) => {
    let currentWindow = BrowserWindow.fromId(param);
    if (currentWindow)
      s.sender("isMaximizable", reqId, true, currentWindow.isMaximizable());
  });

  s.register("system/modal", (event, reqId, ...arg) => {
    Window.createModalWindow(...arg);
  });

  s.register("system/modeless", (event, reqId, ...arg) => {
    Window.createModelessWindow(...arg);
  });

  s.register("system/inner-modal", (event, reqId, route, data) => {
    s.sender("inner-modal", reqId, true, {route, data});
  });

  s.register("system/close-inner-modal", (event, reqId, ...arg) => {
    s.sender("close-inner-modal", reqId, true, ...arg);
  });

  s.register("system/subscribe", (event, reqId, webContentsId, topics) => {
    if (!Array.isArray(topics)) topics = [topics];
    s.addListenersByWebContentsId(topics, webContentsId);
  });

  s.register("system/computer_idle_time", (event, reqId) => {
    const idleTime = powerMonitor.getSystemIdleTime();
    s.emiter("system/computer_idle_time", reqId, idleTime);
  });

  s.register("__callback__", (event, reqId, topic, data) => {
    s.broadcast(topic, data);
  });

  /* ---------------------------------------- Custom ---------------------------------------- */
  s.register("system/setAsHomeWindow", (event, reqId) => {
    try {
      // make home window resizable
      s.windowService.mainWindow.setResizable(true);
      s.windowService.mainWindow.setFullScreenable(true);
      // s.windowService.mainWindow.setSize(1280, 960);
      s.sender("system/setAsHomeWindow", reqId, true);
    } catch (err) {
      s.sender("system/setAsHomeWindow", reqId, false, err);
      throw err;
    }
  });

  s.register("system/setAsLoginWindow", (event, reqId) => {
    try {
      // make login window non-resizable
      s.windowService.mainWindow.setResizable(true);
      s.windowService.mainWindow.setFullScreenable(false);
      s.windowService.mainWindow.setFullScreen(false);
      s.windowService.mainWindow.setSize(1280, 900);
      s.windowService.mainWindow.setResizable(false);
      s.sender("system/setAsLoginWindow", reqId, true);
    } catch (err) {
      s.sender("system/setAsLoginWindow", reqId, false, err);
      throw err;
    }
  });

  s.register("system/lastTxUpdateTime", async (event, reqId) => {
    try {
      const db = await s.getUserDatabaseContext();
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
      s.sender("system/lastTxUpdateTime", reqId, true, lastTxUpdateTime);
    } catch (err) {
      s.sender("system/lastTxUpdateTime", reqId, false, err);
      throw err;
    }
  });

  s.register("system/localLastBlockNumber", async (event, reqId) => {
    try {
      let lastLocalBlockNumber = await s.getUserLastLocalBlockNumber();
      if (lastLocalBlockNumber == null)
        throw new Error("lastBlockNumber is null");
      s.sender("system/localLastBlockNumber", reqId, true, lastLocalBlockNumber);
    } catch (err) {
      throw err;
    }
  });

  s.register("system/remoteLastBlockNumber", async (event, reqId) => {
    try {
      let lastRemoteBlockNumber = await s.getUserLastRemoteBlockNumber();
      if (lastRemoteBlockNumber == null)
        throw new Error("lastBlockNumber is null");
      s.sender(
        "system/remoteLastBlockNumber",
        reqId,
        true,
        lastRemoteBlockNumber
      );
    } catch (err) {
      throw err;
    }
  });

  s.register("system/isDatabaseClear", async (event, reqId) => {
    try {
      const db = await s.getUserDatabaseContext();
      // check if transaction is clear
      let transactions = await db.all("SELECT * FROM transactions;");
      let localClear = transactions.length === 0;
      if (!localClear) {
        s.sender("system/isDatabaseClear", reqId, true, false);
        return;
      }
      // check remote transactions
      const socket = await s.getUserWebsocketContext();
      let lastBlockNumber = await socket.sendSync("lastBlockNumber");
      s.sender("system/isDatabaseClear", reqId, true, lastBlockNumber === 0);
    } catch (err) {
      s.sender("system/isDatabaseClear", reqId, false);
      throw err;
    }
  });

  s.register("system/isLegacyMigrationAvailable", async (event, reqId) => {
    try {
      let legacyDatabaseExists = s.databaseService.doesLegacyDatabaseExists();
      s.sender(
        "system/isLegacyMigrationAvailable",
        reqId,
        true,
        legacyDatabaseExists
      );
    } catch (err) {
      s.sender("system/isLegacyMigrationAvailable", reqId, false);
      throw err;
    }
  });

  s.register("system/migrateLegacyDatabase", async (event, reqId) => {
    try {
      const userId = s.userService.getCurrent();
      let db = await s.databaseService.getUserDatabaseContext(userId);
      await db.migrateLegacyDatabase();
      s.sender("system/migrateLegacyDatabase", reqId, true);
    } catch (err) {
      s.sender("system/migrateLegacyDatabase", reqId, false);
      throw err;
    }
  });

  s.register("system/truncateLegacyDatabase", async (event, reqId) => {
    try {
      await s.databaseService.truncateLegacyDatabase();
      s.sender("system/truncateLegacyDatabase", reqId, true);
    } catch (err) {
      s.sender("system/truncateLegacyDatabase", reqId, false);
      throw err;
    }
  });

  s.register(
    "system/mismatchTxAcceptTheirs",
    async (event, reqId, startNumber, endNumber) => {
      try {
        const newLastBlockNumber = startNumber - 1;
        const syncerCtx = await s.getUserSyncerContext();
        const remoteLastBlockNumber = await syncerCtx.remoteLastBlockNumber();
        await syncerCtx.snapSync(newLastBlockNumber, remoteLastBlockNumber);
        s.sender("system/mismatchTxAcceptTheirs", reqId, true);
      } catch (err) {
        s.sender("system/mismatchTxAcceptTheirs", reqId, false);
        throw err;
      }
    }
  );

  s.register(
    "system/mismatchTxAcceptMine",
    async (event, reqId, startNumber, endNumber) => {
      try {
        // delete all transactions from startNumber to endNumber in remote db
        const socket = await s.getUserWebsocketContext();
        await socket.sendSync("deleteMismatchBlocks", {
          startBlockNumber: startNumber,
          endBlockNumber: endNumber,
        });
        s.sender("system/mismatchTxAcceptMine", reqId, true);
      } catch (err) {
        s.sender("system/mismatchTxAcceptMine", reqId, false);
        throw err;
      }
    }
  );

  s.register("system/initializeState", async (event, reqId) => {
    try {
      // initialize state
      const syncerCtx = await s.getUserSyncerContext();
      await syncerCtx.applySnapshot(0);
      // get remote last block number
      const remoteLastBlockNumber = await syncerCtx.getRemoteLastBlockNumber();
      // sync to remote last block number
      await syncerCtx.fullSync(1, remoteLastBlockNumber);
      s.sender("system/initializeState", reqId, true);
    } catch (err) {
      s.sender("system/initializeState", reqId, false);
      throw err;
    }
  });

  s.register("auth/sendGoogleOauthResult", async (event, reqId, data) => {
    try {
      const rootDB = await s.databaseService.getRootDatabaseContext();
      let {googleUserInfo} = data;
      let {email: google_email, picture: google_profile_image_url} =
        googleUserInfo;
      let user;

      // check if user exists already
      let isSignupNeeded;
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

      s.sender("auth/sendGoogleOauthResult", reqId, true, {
        isSignupNeeded,
        user,
      });
    } catch (err) {
      s.sender("auth/sendGoogleOauthResult", reqId, false);
      throw err;
    }
  });

  s.register(
    "auth/registerAuthInfoSync",
    async (event, reqId, userId, accessToken, refreshToken) => {
      try {
        if (userId == null) throw new Error("userId is null");
        if (accessToken == null) throw new Error("accessToken is null");
        if (refreshToken == null) throw new Error("refreshToken is null");

        const rootDB = await s.databaseService.getRootDatabaseContext();

        // check if user exists already
        let users = await rootDB.all(
          "SELECT * FROM users WHERE uid = ?;",
          userId
        );
        if (users.length === 0) {
          // retry
          s.sender("auth/registerAuthInfoSync", reqId, false, "NOT_IN_LOCAL");
          return;
        }

        await rootDB.run(
          "UPDATE users SET access_token = ?, refresh_token = ? WHERE uid = ?;",
          accessToken,
          refreshToken,
          userId
        );
        s.sender("auth/registerAuthInfoSync", reqId, true);
      } catch (err) {
        s.sender("auth/registerAuthInfoSync", reqId, false, err.message);
        throw err;
      }
    }
  );

  s.register("auth/deleteAuthInfo", async (event, reqId, userId) => {
    try {
      const rootDB = await s.databaseService.getRootDatabaseContext();
      await rootDB.run(
        "UPDATE users SET access_token = NULL, refresh_token = NULL WHERE uid = ?;",
        [userId]
      );
      s.sender("auth/deleteAuthInfo", reqId, true);
    } catch (err) {
      s.sender("auth/deleteAuthInfo", reqId, false);
      throw err;
    }
  });

  s.register("auth/loadAuthInfoSync", async (event, reqId, userId) => {
    try {
      const rootDB = await s.databaseService.getRootDatabaseContext();
      let users = await rootDB.all("SELECT * FROM users WHERE uid = ?;", [
        userId,
      ]);
      if (users.length === 0) throw new Error("user not found");
      let [user] = users;
      s.sender("auth/loadAuthInfoSync", reqId, true, {
        accessToken: user.access_token,
        refreshToken: user.refresh_token,
      });
    } catch (err) {
      s.sender("auth/loadAuthInfoSync", reqId, false);
      throw err;
    }
  });

  s.register("auth/isDatabaseReady", async (event, reqId, userId) => {
    try {
      let ready = await s.databaseService.isUserDatabaseReady(userId);
      s.sender("auth/isDatabaseReady", reqId, true, ready);
    } catch (err) {
      s.sender("auth/isDatabaseReady", reqId, false);
      throw err;
    }
  });

  s.register("auth/initializeDatabase", async (event, reqId, userId) => {
    try {
      await s.databaseService.initializeUserDatabase(userId);
      s.sender("auth/initializeDatabase", reqId, true);
    } catch (err) {
      s.sender("auth/initializeDatabase", reqId, false);
      throw err;
    }
  });

  s.register(
    "auth/signUpWithGoogleAuth",
    async (event, reqId, signupRequest) => {
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
          s.sender(
            "auth/signUpWithGoogleAuth",
            reqId,
            false,
            err?.response?.status
          );
          return;
        }

        const rootDB = await s.databaseService.getRootDatabaseContext();

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

        s.sender("auth/signUpWithGoogleAuth", reqId, true, {
          user: result,
        });
      } catch (err) {
        s.sender("auth/signUpWithGoogleAuth", reqId, false);
        throw err;
      }
    }
  );

  s.register("auth/signUp", async (event, reqId, signupRequest) => {
    try {
      let result;
      try {
        result = await Request.post(appServerFinalEndpoint, "/auth/signup", {
          username: signupRequest.username,
          auth_id: signupRequest.authId,
          encrypted_password: sha256(signupRequest.encryptedPassword),
        });
      } catch (err) {
        s.sender("auth/signUp", reqId, false, err?.response?.status);
        return;
      }

      const uid = result.uid;

      const rootDB = await s.databaseService.getRootDatabaseContext();
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
      } else {
        // user already exists in local db
        let [user] = users;
        if (user.auth_id != null && user.auth_encrypted_pw != null) {
          // already exists in local (but not was in server)
          console.warn(
            "auth/signUp: already exists in local (but newly created in server)"
          );
          if (
            user.auth_id !== signupRequest.authId ||
            user.auth_encrypted_pw !== signupRequest.encryptedPassword
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
          s.sender("auth/signUp", reqId, false, "TRY_TO_BIND_GOOGLE");
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

      s.sender("auth/signUp", reqId, true);
    } catch (err) {
      s.sender("auth/signUp", reqId, false);
      throw err;
    }
  });

  s.register("auth/login", async (event, reqId, signinRequest) => {
    let canLoginWithLocal = false;
    try {
      const rootDB = await s.databaseService.getRootDatabaseContext();

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
        console.debug(err?.response?.data);

        let data = {
          serverStatus: err?.response?.status,
          canLoginWithLocal,
        };

        try {
          if (canLoginWithLocal) {
            let userData = localUsers[0];
            let {uid, username, google_email: googleEmail} = userData;
            data.localUser = {uid, username, googleEmail};
          }
        } catch (err) {
          console.error(err);
        }

        s.sender("auth/login", reqId, false, data);
        return;
      }

      let {auth, user} = result;
      let {access_token, refresh_token} = auth;
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
      s.sender("auth/login", reqId, true, result);
    } catch (err) {
      s.sender("auth/login", reqId, false, {canLoginWithLocal});
      throw err;
    }
  });

  s.register(
    "socket/connect",
    async (event, reqId, userId, accessToken, refreshToken) => {
      try {
        s.userService.setCurrent(userId);
        const db = await s.databaseService.getUserDatabaseContext(userId);

        // find last block number
        let transactions = await db.all(
          "SELECT * FROM transactions ORDER BY block_number DESC LIMIT 1;"
        );

        if (transactions.length > 0) {
          let [transaction] = transactions;
          s.sender(
            "system/lastTxUpdateTime",
            null,
            true,
            transaction.timestamp
          );
        }

        const socketCtx = await s.websocketService.getUserWebsocketContext(
          userId
        );
        await socketCtx.connect(accessToken, refreshToken);
        s.sender("socket/connect", reqId, true);
      } catch (err) {
        s.sender("socket/connect", reqId, false, err);
        throw err;
      }
    }
  );

  s.register("socket/disconnect", async (event, reqId) => {
    try {
      const socket = await s.getUserWebsocketContext();
      socket.disconnect();
      s.sender("socket/disconnect", reqId, true);
    } catch (err) {
      s.sender("socket/disconnect", reqId, false);
      throw err;
    }
  });

  s.register("task/getAllTaskList", async (event, reqId) => {
    try {
      const db = await s.getUserDatabaseContext();
      let tasks = await db.all("SELECT * FROM tasks;");
      s.sender("task/getAllTaskList", reqId, true, tasks);
    } catch (err) {
      s.sender("task/getAllTaskList", reqId, false);
      throw err;
    }
  });

  s.register("task/getAllSubtaskList", async (event, reqId) => {
    try {
      const db = await s.getUserDatabaseContext();
      let tasks = await db.all("SELECT * FROM subtasks;");
      s.sender("task/getAllSubtaskList", reqId, true, tasks);
    } catch (err) {
      s.sender("task/getAllSubtaskList", reqId, false);
      throw err;
    }
  });

  // 3 -> 5 (add 4)
  // 3.next = 4
  s.register("task/addTask", async (event, reqId, task) => {
    try {
      const db = await s.getUserDatabaseContext();
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
      const targetBlockNumber = (await s.getUserLastLocalBlockNumber()) + 1;
      const tx = s.executorService.makeTransaction(
        TX_TYPE.CREATE_TASK,
        txContent,
        targetBlockNumber
      );
      await s.executorService.applyTransaction(reqId, tx);
      const syncerCtx = await s.getUserSyncerContext();
      await syncerCtx.sendTransaction(tx);
    } catch (err) {
      s.sender("task/addTask", reqId, false);
      throw err;
    }
  });

  // 3 -> 4 -> 5 (delete 4)
  // 3.next = 5
  s.register("task/deleteTask", async (event, reqId, taskId) => {
    try {
      const db = await s.getUserDatabaseContext();
      let preResult = await deleteTaskPre(db, taskId);
      const txContent = new DeleteTaskTxContent(taskId, preResult.prevTaskId);
      const targetBlockNumber = (await s.getUserLastLocalBlockNumber()) + 1;
      const tx = s.executorService.makeTransaction(
        TX_TYPE.DELETE_TASK,
        txContent,
        targetBlockNumber
      );
      await s.executorService.applyTransaction(reqId, tx);
      const syncerCtx = await s.getUserSyncerContext();
      await syncerCtx.sendTransaction(tx);
    } catch (err) {
      s.sender("task/deleteTask", reqId, false);
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
  s.register(
    "task/updateTaskOrder",
    async (event, reqId, taskId, targetTaskId, afterTarget) => {
      try {
        const db = await s.getUserDatabaseContext();
        let preResult = await updateTaskOrderPre(db, taskId, targetTaskId);
        const txContent = new UpdateTaskOrderTxContent(
          taskId,
          targetTaskId,
          afterTarget,
          preResult.prevTaskId,
          preResult.targetPrevTaskId
        );
        const targetBlockNumber = (await s.getUserLastLocalBlockNumber()) + 1;
        const tx = s.executorService.makeTransaction(
          TX_TYPE.UPDATE_TASK_ORDER,
          txContent,
          targetBlockNumber
        );
        await s.executorService.applyTransaction(reqId, tx);
        const syncerCtx = await s.getUserSyncerContext();
        await syncerCtx.sendTransaction(tx);
      } catch (err) {
        s.sender("task/updateTaskOrder", reqId, false);
        console.error(err);
      }
    }
  );

  s.register("task/updateTaskTitle", async (event, reqId, taskId, title) => {
    try {
      const txContent = new UpdateTaskTitleTxContent(taskId, title);
      const targetBlockNumber = (await s.getUserLastLocalBlockNumber()) + 1;
      const tx = s.executorService.makeTransaction(
        TX_TYPE.UPDATE_TASK_TITLE,
        txContent,
        targetBlockNumber
      );
      await s.executorService.applyTransaction(reqId, tx);
      const syncerCtx = await s.getUserSyncerContext();
      await syncerCtx.sendTransaction(tx);
    } catch (err) {
      s.sender("task/updateTaskTitle", reqId, false);
      throw err;
    }
  });

  s.register(
    "task/updateTaskDueDate",
    async (event, reqId, taskId, dueDate) => {
      try {
        const txContent = new UpdateTaskDueDateTxContent(taskId, dueDate);
        const targetBlockNumber = (await s.getUserLastLocalBlockNumber()) + 1;
        const tx = s.executorService.makeTransaction(
          TX_TYPE.UPDATE_TASK_DUE_DATE,
          txContent,
          targetBlockNumber
        );
        await s.executorService.applyTransaction(reqId, tx);
        const syncerCtx = await s.getUserSyncerContext();
        await syncerCtx.sendTransaction(tx);
      } catch (err) {
        s.sender("task/updateTaskDueDate", reqId, false);
        throw err;
      }
    }
  );

  s.register("task/updateTaskMemo", async (event, reqId, taskId, memo) => {
    try {
      const txContent = new UpdateTaskMemoTxContent(taskId, memo);
      const targetBlockNumber = (await s.getUserLastLocalBlockNumber()) + 1;
      const tx = s.executorService.makeTransaction(
        TX_TYPE.UPDATE_TASK_MEMO,
        txContent,
        targetBlockNumber
      );
      await s.executorService.applyTransaction(reqId, tx);
      const syncerCtx = await s.getUserSyncerContext();
      await syncerCtx.sendTransaction(tx);
    } catch (err) {
      s.sender("task/updateTaskMemo", reqId, false);
      throw err;
    }
  });

  s.register(
    "task/updateTaskDone",
    async (event, reqId, taskId, done, doneAt) => {
      try {
        const txContent = new UpdateTaskDoneTxContent(taskId, done, doneAt);
        const targetBlockNumber = (await s.getUserLastLocalBlockNumber()) + 1;
        const tx = s.executorService.makeTransaction(
          TX_TYPE.UPDATE_TASK_DONE,
          txContent,
          targetBlockNumber
        );
        await s.executorService.applyTransaction(reqId, tx);
        const syncerCtx = await s.getUserSyncerContext();
        await syncerCtx.sendTransaction(tx);
      } catch (err) {
        s.sender("task/updateTaskDone", reqId, false);
        throw err;
      }
    }
  );

  s.register(
    "task/addTaskCategory",
    async (event, reqId, taskId, categoryId) => {
      try {
        const txContent = new AddTaskCategoryTxContent(taskId, categoryId);
        const targetBlockNumber = (await s.getUserLastLocalBlockNumber()) + 1;
        const tx = s.executorService.makeTransaction(
          TX_TYPE.ADD_TASK_CATEGORY,
          txContent,
          targetBlockNumber
        );
        await s.executorService.applyTransaction(reqId, tx);
        const syncerCtx = await s.getUserSyncerContext();
        await syncerCtx.sendTransaction(tx);
      } catch (err) {
        s.sender("task/addTaskCategory", reqId, false);
        throw err;
      }
    }
  );

  s.register(
    "task/deleteTaskCategory",
    async (event, reqId, taskId, categoryId) => {
      try {
        const txContent = new DeleteTaskCategoryTxContent(taskId, categoryId);
        const targetBlockNumber = (await s.getUserLastLocalBlockNumber()) + 1;
        const tx = s.executorService.makeTransaction(
          TX_TYPE.DELETE_TASK_CATEGORY,
          txContent,
          targetBlockNumber
        );
        await s.executorService.applyTransaction(reqId, tx);
        const syncerCtx = await s.getUserSyncerContext();
        await syncerCtx.sendTransaction(tx);
      } catch (err) {
        s.sender("task/deleteTaskCategory", reqId, false);
        throw err;
      }
    }
  );

  s.register(
    "task/updateTaskRepeatPeriod",
    async (event, reqId, taskId, repeatPeriod) => {
      try {
        const txContent = new UpdateTaskRepeatPeriodTxContent(
          taskId,
          repeatPeriod
        );
        const targetBlockNumber = (await s.getUserLastLocalBlockNumber()) + 1;
        const tx = s.executorService.makeTransaction(
          TX_TYPE.UPDATE_TASK_REPEAT_PERIOD,
          txContent,
          targetBlockNumber
        );
        await s.executorService.applyTransaction(reqId, tx);
        const syncerCtx = await s.getUserSyncerContext();
        await syncerCtx.sendTransaction(tx);
      } catch (err) {
        s.sender("task/updateTaskRepeatPeriod", reqId, false);
        throw err;
      }
    }
  );

  s.register("task/createSubtask", async (event, reqId, subtask, taskId) => {
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
      const targetBlockNumber = (await s.getUserLastLocalBlockNumber()) + 1;
      const tx = s.executorService.makeTransaction(
        TX_TYPE.CREATE_SUBTASK,
        txContent,
        targetBlockNumber
      );
      await s.executorService.applyTransaction(reqId, tx);
      const syncerCtx = await s.getUserSyncerContext();
      await syncerCtx.sendTransaction(tx);
    } catch (err) {
      s.sender("task/createSubtask", reqId, false);
      throw err;
    }
  });

  s.register("task/deleteSubtask", async (event, reqId, taskId, subtaskId) => {
    try {
      const txContent = new DeleteSubtaskTxContent(taskId, subtaskId);
      const targetBlockNumber = (await s.getUserLastLocalBlockNumber()) + 1;
      const tx = s.executorService.makeTransaction(
        TX_TYPE.DELETE_SUBTASK,
        txContent,
        targetBlockNumber
      );
      await s.executorService.applyTransaction(reqId, tx);
      const syncerCtx = await s.getUserSyncerContext();
      await syncerCtx.sendTransaction(tx);
    } catch (err) {
      s.sender("task/deleteSubtask", reqId, false);
      throw err;
    }
  });

  s.register(
    "task/updateSubtaskTitle",
    async (event, reqId, taskId, subtaskId, title) => {
      try {
        const txContent = new UpdateSubtaskTitleTxContent(
          taskId,
          subtaskId,
          title
        );
        const targetBlockNumber = (await s.getUserLastLocalBlockNumber()) + 1;
        const tx = s.executorService.makeTransaction(
          TX_TYPE.UPDATE_SUBTASK_TITLE,
          txContent,
          targetBlockNumber
        );
        await s.executorService.applyTransaction(reqId, tx);
        const syncerCtx = await s.getUserSyncerContext();
        await syncerCtx.sendTransaction(tx);
      } catch (err) {
        s.sender("task/updateSubtaskTitle", reqId, false);
        throw err;
      }
    }
  );

  s.register(
    "task/updateSubtaskDueDate",
    async (event, reqId, taskId, subtaskId, dueDate) => {
      try {
        const txContent = new UpdateSubtaskDueDateTxContent(
          taskId,
          subtaskId,
          dueDate
        );
        const targetBlockNumber = (await s.getUserLastLocalBlockNumber()) + 1;
        const tx = s.executorService.makeTransaction(
          TX_TYPE.UPDATE_SUBTASK_DUE_DATE,
          txContent,
          targetBlockNumber
        );
        await s.executorService.applyTransaction(reqId, tx);
        const syncerCtx = await s.getUserSyncerContext();
        await syncerCtx.sendTransaction(tx);
      } catch (err) {
        s.sender("task/updateSubtaskDueDate", reqId, false);
        throw err;
      }
    }
  );

  s.register(
    "task/updateSubtaskDone",
    async (event, reqId, taskId, subtaskId, done, doneAt) => {
      try {
        const txContent = new UpdateSubtaskDoneTxContent(
          taskId,
          subtaskId,
          done,
          doneAt
        );
        const targetBlockNumber = (await s.getUserLastLocalBlockNumber()) + 1;
        const tx = s.executorService.makeTransaction(
          TX_TYPE.UPDATE_SUBTASK_DONE,
          txContent,
          targetBlockNumber
        );
        await s.executorService.applyTransaction(reqId, tx);
        const syncerCtx = await s.getUserSyncerContext();
        await syncerCtx.sendTransaction(tx);
      } catch (err) {
        s.sender("task/updateSubtaskDone", reqId, false);
        throw err;
      }
    }
  );

  s.register("category/getCategoryList", async (event, reqId) => {
    try {
      const db = await s.getUserDatabaseContext();
      let result = await db.all("SELECT * FROM categories;");
      s.sender("category/getCategoryList", reqId, true, result);
    } catch (err) {
      s.sender("category/getCategoryList", reqId, false);
      throw err;
    }
  });

  s.register("category/createCategory", async (event, reqId, category) => {
    try {
      let preResult = await createCategoryPre();
      const txContent = new CreateCategoryTxContent(
        preResult.cid,
        category.title,
        category.secret,
        category.locked,
        category.color
      );
      const targetBlockNumber = (await s.getUserLastLocalBlockNumber()) + 1;
      const tx = s.executorService.makeTransaction(
        TX_TYPE.CREATE_CATEGORY,
        txContent,
        targetBlockNumber
      );
      await s.executorService.applyTransaction(reqId, tx);
      const syncerCtx = await s.getUserSyncerContext();
      await syncerCtx.sendTransaction(tx);
    } catch (err) {
      s.sender("category/createCategory", reqId, false);
      throw err;
    }
  });

  s.register("category/deleteCategory", async (event, reqId, categoryId) => {
    try {
      const txContent = new DeleteCategoryTxContent(categoryId);
      const targetBlockNumber = (await s.getUserLastLocalBlockNumber()) + 1;
      const tx = s.executorService.makeTransaction(
        TX_TYPE.DELETE_CATEGORY,
        txContent,
        targetBlockNumber
      );
      await s.executorService.applyTransaction(reqId, tx);
      const syncerCtx = await s.getUserSyncerContext();
      await syncerCtx.sendTransaction(tx);
    } catch (err) {
      s.sender("category/deleteCategory", reqId, false);
      throw err;
    }
  });

  s.register(
    "category/updateCategoryTitle",
    async (event, reqId, categoryId, title) => {
      try {
        const db = await s.getUserDatabaseContext();
        let result = await db.run(
          "UPDATE categories SET title = ? WHERE cid = ?",
          title,
          categoryId
        );
        s.sender("category/updateCategoryTitle", reqId, true, result);
      } catch (err) {
        s.sender("category/updateCategoryTitle", reqId, false);
        throw err;
      }
    }
  );

  s.register("category/getCategoryTasks", async (event, reqId, categoryId) => {
    try {
      const db = await s.getUserDatabaseContext();
      let result = await db.all(
        "SELECT * FROM tasks_categories WHERE cid = ?",
        categoryId
      );
      s.sender("category/getCategoryTasks", reqId, true, result);
    } catch (err) {
      s.sender("category/getCategoryTasks", reqId, false);
      throw err;
    }
  });

  s.register(
    "tasks_categories/getTasksCategoriesList",
    async (event, reqId) => {
      try {
        const db = await s.getUserDatabaseContext();
        let result = await db.all("SELECT * FROM tasks_categories;");
        s.sender(
          "tasks_categories/getTasksCategoriesList",
          reqId,
          true,
          result
        );
      } catch (err) {
        s.sender("tasks_categories/getTasksCategoriesList", reqId, false);
        throw err;
      }
    }
  );

  s.register(
    "category/checkCategoryPassword",
    async (event, reqId, hashedPassword) => {
      try {
        const rootDB = await s.getRootDatabaseContext();
        let results = await rootDB.all(
          "SELECT * FROM users WHERE auth_hashed_pw = ?",
          hashedPassword
        );
        let ok = results.length > 0;
        s.sender("category/checkCategoryPassword", reqId, true, ok);
      } catch (err) {
        s.sender("category/checkCategoryPassword", reqId, false);
        throw err;
      }
    }
  );

  /* ---------------------------------------- Test ---------------------------------------- */
  s.register("test_signal", (event, param) => {});
};
