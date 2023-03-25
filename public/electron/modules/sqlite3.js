const sqlite3 = require("sqlite3");
const fs = require("fs");
const path = require("path");
const url = require("url");
const packageJson = require("../../../package.json");
const FileSystem = require("./filesystem");
const { v4 } = require("uuid");
const { makeTransaction, TX_TYPE, txExecutor } = require("../user_modules/executeRouter");
const { InitializeStateTxContent } = require("../executors/initializeState.exec");

let currentDatabaseUserId = null;
let db = null;
let rootDB = null;

let buildLevel = null;
let userDataPath = null;

const color = console.RGB(78, 119, 138);
const coloredIpcMain = console.wrap("IpcMain", color);

function setSystemInfo(_buildLevel, _userDataPath) {
  buildLevel = _buildLevel;
  userDataPath = _userDataPath;
}

function initializeRoot() {
  console.info("Initializing Root Database...");

  const appResourcePath = FileSystem.getAppResourcesPath(buildLevel);
  const rootSchemeVersion = "v" + packageJson.config["root_scheme_version"];

  let datafileDirPath = path.join(userDataPath, "datafiles");

  let rootDatabaseTemplatePath = path.join(appResourcePath, "root.sqlite3");
  let rootDatabaseFileName = `root-${rootSchemeVersion}.sqlite3`;
  let rootDatabaseFilePath = path.join(datafileDirPath, rootDatabaseFileName);

  if (!fs.existsSync(datafileDirPath)) {
    console.warn(`Datafile directory doesn't exists, newly create.`);
    fs.mkdirSync(datafileDirPath);
  }

  if (!fs.existsSync(rootDatabaseFilePath)) {
    console.warn(
      `Root Database file (${rootSchemeVersion}) doesn't exists, newly create (${rootDatabaseTemplatePath} -> ${rootDatabaseFilePath})`
    );
    fs.copyFileSync(rootDatabaseTemplatePath, rootDatabaseFilePath);
  }

  rootDB = new sqlite3.Database(rootDatabaseFilePath, (err) => {
    if (err) {
      console.error(`Error occurred while opening root database`);
      console.error(err);
      return;
    }

    rootDB.run("PRAGMA synchronous = OFF;");
    rootDB.run("PRAGMA foreign_keys = ON;");
    rootDB.run("PRAGMA check_constraints = ON;");
    console.info(`Root Database successfully connected.`);
  });
}

function migratableDatabaseExists() {
  const rootSchemeVersion = "v" + packageJson.config["root_scheme_version"];
  let datafileDirPath = path.join(userDataPath, "datafiles");

  if (rootSchemeVersion != "v1") {
    console.warn(
      `Elder version of database scheme doesn't support migration. (current: ${rootSchemeVersion}, target: v1)`
    );
    return false;
  }

  let migratableDatabaseFilePath = path.join(datafileDirPath, "v1", "database.sqlite3");
  if (fs.existsSync(migratableDatabaseFilePath)) {
    console.info(`Migratable Database file exists: ${migratableDatabaseFilePath}`);
    return true;
  }

  return false;
}

async function migrateOldDatabase(socket, db, Ipc) {
  const rootSchemeVersion = "v" + packageJson.config["root_scheme_version"];
  let datafileDirPath = path.join(userDataPath, "datafiles");

  if (rootSchemeVersion != "v1") {
    throw new Error("Elder version of database scheme doesn't support migration.");
  }

  let migratableDatabaseFilePath = path.join(datafileDirPath, "v1", "database.sqlite3");
  if (!fs.existsSync(migratableDatabaseFilePath)) {
    throw new Error("Migratable Database file doesn't exists.");
  }

  return new Promise((resolve, reject) => {
    let oldDB = new sqlite3.Database(migratableDatabaseFilePath, async (err) => {
      if (err) {
        console.error(`Error occurred while opening old database`);
        reject(err);
      }

      oldDB.run("PRAGMA synchronous = OFF;");
      oldDB.run("PRAGMA foreign_keys = ON;");
      oldDB.run("PRAGMA check_constraints = ON;");
      console.info(`Old Database successfully connected.`);

      // migration start!
      try {
        let tasks = {};
        let categories = {};

        let taskPromise = new Promise((res, rej) => {
          oldDB.all("SELECT * FROM tasks", (err, rows) => {
            if (err) rej(err);
            res(rows);
          });
        });
        let subtasksPromise = new Promise((res, rej) => {
          oldDB.all("SELECT * FROM subtasks", (err, rows) => {
            if (err) rej(err);
            res(rows);
          });
        });
        let categoriesPromise = new Promise((res, rej) => {
          oldDB.all("SELECT * FROM categories", (err, rows) => {
            if (err) rej(err);
            res(rows);
          });
        });
        let taskCategoriesPromise = new Promise((res, rej) => {
          oldDB.all("SELECT * FROM tasks_categories", (err, rows) => {
            if (err) rej(err);
            res(rows);
          });
        });

        let oldTasks = await taskPromise;
        let oldSubtasks = await subtasksPromise;
        let oldCategories = await categoriesPromise;
        let oldTaskCategories = await taskCategoriesPromise;

        // disconnect old database
        oldDB.close();

        let taskIdRemapping = {};
        let categoryIdRemapping = {};
        let subtaskIdRemapping = {};

        for (let oldTask of oldTasks) {
          let newId = v4();
          taskIdRemapping[oldTask.tid] = newId;

          let task = {
            tid: newId,
            title: oldTask.title,
            createdAt: oldTask.created_at,
            doneAt: oldTask.done_at,
            memo: oldTask.memo,
            done: oldTask.done == true,
            dueDate: oldTask.due_date,
            dueTime: oldTask.due_time,
            next: null,
            repeatPeriod: oldTask.repeat_period,
            repeatStartAt: oldTask.repeat_start_at,
            subtasks: {},
            categories: {},
          };
          tasks[newId] = task;
        }

        // mapping next
        for (let oldTask of oldTasks) {
          let newId = taskIdRemapping[oldTask.tid];
          let task = tasks[newId];
          if (oldTask.next != null) {
            task.next = taskIdRemapping[oldTask.next];
            if (task.next == null) {
              throw new Error(`Next task of ${newId} is not found, original: ${oldTask.next}`);
            }
          }
        }

        for (let oldSubtask of oldSubtasks) {
          let newId = v4();
          subtaskIdRemapping[oldSubtask.sid] = newId;
          let subtask = {
            sid: newId,
            title: oldSubtask.title,
            createdAt: oldSubtask.created_at,
            doneAt: oldSubtask.done_at,
            dueDate: oldSubtask.due_date,
            done: oldSubtask.done == true,
          };
          let parentTaskNewId = taskIdRemapping[oldSubtask.tid];
          if (parentTaskNewId == null) {
            console.warn(`Parent task Id of ${oldSubtask.tid} is not found`);
            continue;
          }
          let parentTask = tasks[parentTaskNewId];
          if (parentTask == null) {
            throw new Error(`Parent task of ${newId} is not found, original: ${oldSubtask.tid}`);
          }
          parentTask.subtasks[newId] = subtask;
        }

        for (let oldCategory of oldCategories) {
          let newId = v4();
          categoryIdRemapping[oldCategory.cid] = newId;
          let category = {
            cid: newId,
            title: oldCategory.title,
            secret: oldCategory.secret == true,
            locked: oldCategory.secret == true,
            color: oldCategory.color,
          };
          categories[newId] = category;
        }

        for (let oldTaskCategory of oldTaskCategories) {
          let taskNewId = taskIdRemapping[oldTaskCategory.tid];
          let categoryNewId = categoryIdRemapping[oldTaskCategory.cid];
          if (taskNewId == null) {
            throw new Error(`Task Id of ${oldTaskCategory.tid} is not found`);
          }
          if (categoryNewId == null) {
            throw new Error(`Category Id of ${oldTaskCategory.cid} is not found`);
          }
          let task = tasks[taskNewId];
          let category = categories[categoryNewId];
          if (task == null) {
            throw new Error(`Task of ${taskNewId} is not found, original: ${oldTaskCategory.tid}`);
          }
          if (category == null) {
            throw new Error(`Category of ${categoryNewId} is not found, original: ${oldTaskCategory.cid}`);
          }
          task.categories[categoryNewId] = true;
        }

        let txContent = new InitializeStateTxContent(tasks, categories);

        // send migration result to socket
        if (socket.connected()) {
          let tx = makeTransaction(TX_TYPE.INITIALIZE, txContent, 1);
          await txExecutor(db, null, Ipc, tx);
          await socket.emitSync("transaction", tx, 15000);

          // backup or delete old database?
          fs.renameSync(migratableDatabaseFilePath, migratableDatabaseFilePath + ".bak");
          resolve();
        } else {
          throw new Error("Socket is not connected.");
        }
      } catch (err) {
        reject(err);
      }
    });
  });
}

function isReadyForOperateUser(userId) {
  return db != null && currentDatabaseUserId == userId;
}

async function deleteDatabase(userId) {
  if (userId == null) throw new Error("User ID is not valid.");
  console.info("Deleting User Database... [User ID: " + userId + "]");

  const schemeVersion = "v" + packageJson.config["scheme_version"];

  if (userId == null || userId == "") {
    console.error("User ID is not valid.");
    process.exit(-1);
  }

  let datafileDirPath = path.join(userDataPath, "datafiles");

  let databaseDirPath = path.join(datafileDirPath, schemeVersion);
  let databaseFileName = `user-${userId}.sqlite3`;
  let databaseFilePath = path.join(databaseDirPath, databaseFileName);

  if (fs.existsSync(databaseFilePath)) {
    fs.unlinkSync(databaseFilePath);
  }
}

async function initialize(userId) {
  if (userId == null) throw new Error("User ID is not valid.");
  console.info("Initializing User Database... [User ID: " + userId + "]");

  const appResourcePath = FileSystem.getAppResourcesPath(buildLevel);
  const schemeVersion = "v" + packageJson.config["scheme_version"];

  if (userId == null || userId == "") {
    console.error("User ID is not valid.");
    process.exit(-1);
  }

  let datafileDirPath = path.join(userDataPath, "datafiles");

  let databaseDirPath = path.join(datafileDirPath, schemeVersion);
  let databaseFileName = `user-${userId}.sqlite3`;
  let databaseFilePath = path.join(databaseDirPath, databaseFileName);
  let databaseTemplatePath = path.join(appResourcePath, "template.sqlite3");

  if (!fs.existsSync(datafileDirPath)) {
    console.warn(`Datafile directory doesn't exists, newly create.`);
    fs.mkdirSync(datafileDirPath);
  }

  if (!fs.existsSync(databaseDirPath)) {
    console.warn(`Database directory (${schemeVersion}) doesn't exists, newly create`);
    fs.mkdirSync(databaseDirPath);
  }

  if (!fs.existsSync(databaseFilePath)) {
    console.warn(
      `Database file (${schemeVersion}) doesn't exists, newly create (${databaseTemplatePath} -> ${databaseFilePath})`
    );

    // copy template db to destination
    fs.copyFileSync(databaseTemplatePath, databaseFilePath);
  }

  if (db != null) {
    db.close();
    currentDatabaseUserId = null;
  }

  currentDatabaseUserId = userId;

  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(databaseFilePath, (err) => {
      if (err) {
        console.error(`Error occurred while opening database`);
        console.error(err);
        reject(err);
        return;
      }

      // Process doesn't wait while database writer changes transactions (if level = OFF)
      db.run("PRAGMA synchronous = OFF;");
      db.run("PRAGMA foreign_keys = ON;");
      db.run("PRAGMA check_constraints = ON;");
      console.info(`Database successfully connected.`);
      resolve(db);
    });
  });
}

function getRootConnection() {
  return rootDB;
}

async function getConnection(userId) {
  if (userId == null) throw new Error("User ID is not valid.");
  if (userId != currentDatabaseUserId) {
    if (db != null) db.close();
    db = null;
    currentDatabaseUserId = null;
  }

  if (db == null) {
    const schemeVersion = "v" + packageJson.config["scheme_version"];
    let datafileDirPath = path.join(userDataPath, "datafiles");
    let databaseDirPath = path.join(datafileDirPath, schemeVersion);
    let databaseFileName = `user-${userId}.sqlite3`;
    let databaseFilePath = path.join(databaseDirPath, databaseFileName);

    return new Promise((resolve, reject) => {
      db = new sqlite3.Database(databaseFilePath, (err) => {
        if (err) {
          console.error(`Error occurred while opening database`);
          console.error(err);
          reject(err);
          return;
        }

        db.run("PRAGMA synchronous = OFF;");
        db.run("PRAGMA foreign_keys = ON;");
        db.run("PRAGMA check_constraints = ON;");
        console.info(`Database successfully connected.`);
        resolve(db);
      });
    });
  } else {
    return db;
  }
}

function _get(_db, query, ...args) {
  console.system(
    `${coloredIpcMain} ${console.wrap(`<-[GET]->`, console.BLUE)} ${console.wrap(
      "sqlite3: " + query,
      console.YELLOW
    )} ${args.join(", ")}`
  );
  let params = Array.isArray(args?.[0]) ? args[0] : args;
  return new Promise((resolve, reject) => {
    _db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function _run(_db, query, ...args) {
  console.system(
    `${coloredIpcMain} ${console.wrap(`--[RUN]->`, console.BLUE)} ${console.wrap(
      "sqlite3: " + query,
      console.YELLOW
    )} ${args.join(", ")}`
  );
  let params = Array.isArray(args?.[0]) ? args[0] : args;
  return new Promise((resolve, reject) => {
    _db.run(query, params, function (err) {
      if (err) {
        console.system(
          `IpcMain ${console.wrap(`X-[RES]--`, console.RED)} ${console.wrap(`sqlite3`, console.RED)} Run failed: ${err}`
        );
        reject(err);
      } else {
        console.system(
          `IpcMain ${console.wrap(`<-[RES]--`, console.BLUE)} ${console.wrap(
            `[${this.changes ?? "-"} row(s) affected]`,
            console.GREEN
          )}`
        );
        resolve(this);
      }
    });
  });
}

function _all(_db, query, ...args) {
  console.system(
    `${coloredIpcMain} ${console.wrap(`<-[ALL]->`, console.BLUE)} ${console.wrap(
      "sqlite3: " + query,
      console.YELLOW
    )} ${args.join(", ")}`
  );
  let params = Array.isArray(args?.[0]) ? args[0] : args;
  return new Promise((resolve, reject) => {
    _db.all(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function _begin(_db) {
  console.system(
    `${coloredIpcMain} ${console.wrap(`--[BEG]->`, console.BLUE)} ${console.wrap(
      "sqlite3: begin transaction;",
      console.ORANGE
    )}`
  );
  return new Promise((resolve, reject) => {
    _db.run("BEGIN", (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function _commit(_db) {
  console.system(
    `${coloredIpcMain} ${console.wrap(`--[COM]->`, console.BLUE)} ${console.wrap(
      "sqlite3: commit transactions",
      console.YELLOW
    )}`
  );
  return new Promise((resolve, reject) => {
    _db.run("COMMIT", (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function _rollback(_db) {
  console.system(
    `${coloredIpcMain} ${console.wrap(`--[ROL]-|`, console.BLUE)} ${console.wrap(
      "sqlite3: rollback transactions",
      console.ORANGE
    )}`
  );
  return new Promise((resolve, reject) => {
    _db.run("ROLLBACK", (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

module.exports = {
  initializeRoot,
  initialize,
  getRootConnection,
  getConnection,
  getRootContext: () => ({
    get: (query, ...args) => _get(rootDB, query, ...args),
    run: (query, ...args) => _run(rootDB, query, ...args),
    all: (query, ...args) => _all(rootDB, query, ...args),
    begin: () => _begin(rootDB),
    commit: () => _commit(rootDB),
    rollback: () => _rollback(rootDB),
    close: () =>
      new Promise((resolve, reject) =>
        rootDB.close((err) => {
          if (err) reject(err);
          rootDB = null;
          currentDatabaseUserId = null;
          resolve();
        })
      ),
  }),
  getContext: async (userId) => {
    if (isReadyForOperateUser(userId)) await getConnection(userId);
    return {
      get: (query, ...args) => _get(db, query, ...args),
      run: (query, ...args) => _run(db, query, ...args),
      all: (query, ...args) => _all(db, query, ...args),
      begin: () => _begin(db),
      commit: () => _commit(db),
      rollback: () => _rollback(db),
      close: () =>
        new Promise((resolve, reject) =>
          db.close((err) => {
            if (err) reject(err);
            db = null;
            currentDatabaseUserId = null;
            resolve();
          })
        ),
    };
  },
  isReadyForOperateUser,
  setSystemInfo,
  migratableDatabaseExists,
  migrateOldDatabase,
  deleteDatabase,
};
