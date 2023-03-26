const FileSystem = require("../modules/filesystem");
const packageJson = require("../../../package.json");
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3");
const {v4} = require("uuid");
const {
  InitializeStateTxContent,
} = require("../executors/initializeState.exec");
const {
  makeTransaction,
  TX_TYPE,
  txExecutor,
} = require("../user_modules/executeRouter");
const DatabaseContext = require("../contexts/database.context");

class DatabaseService {
  constructor() {
    this.rootDatabaseContext = null;
    this.userDatabaseContexts = new Map();
  }

  /**
   * @returns {Promise<DatabaseContext>}
   */
  async getRootDatabaseContext() {
    if (this.rootDatabaseContext == null) {
      // create new root db context
      this.rootDatabaseContext = new DatabaseContext();
      await this.rootDatabaseContext.initialize();
    }
    return this.rootDatabaseContext;
  }

  /**
   * @param userId {string}
   * @returns {Promise<DatabaseContext>}
   */
  async getUserDatabaseContext(userId) {
    if (userId == null) throw new Error("User ID is not valid.");
    let context = this.userDatabaseContexts.get(userId);
    if (context == null) {
      // create new user db context
      context = new DatabaseContext(userId);
      await context.initialize();
      this.userDatabaseContexts.set(userId, context);
    }
    return context;
  }

  async initializeUserDatabase(userId) {
    if (userId == null) throw new Error("User ID is not valid.");
    if (this.userDatabaseContexts.has(userId)) {
      let context = new DatabaseContext(userId);
      await context.initialize();
      this.userDatabaseContexts.set(userId, context);
    }
  }

  async isUserDatabaseReady(userId) {
    if (userId == null) throw new Error("User ID is not valid.");
    const context = await this.getUserDatabaseContext(userId);
    return context.isReady();
  }

  async deleteDatabase(userId) {
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

  doesLegacyDatabaseExists() {
    const rootSchemeVersion = "v" + packageJson.config["root_scheme_version"];
    let datafileDirPath = path.join(userDataPath, "datafiles");

    if (rootSchemeVersion != "v1") {
      console.warn(
        `Elder version of database scheme doesn't support migration. (current: ${rootSchemeVersion}, target: v1)`
      );
      return false;
    }

    let migratableDatabaseFilePath = path.join(
      datafileDirPath,
      "v1",
      "database.sqlite3"
    );
    if (fs.existsSync(migratableDatabaseFilePath)) {
      console.info(
        `Migratable Database file exists: ${migratableDatabaseFilePath}`
      );
      return true;
    }

    return false;
  }

  async migrateLegacyDatabase() {
    const rootSchemeVersion = "v" + packageJson.config["root_scheme_version"];
    let datafileDirPath = path.join(userDataPath, "datafiles");

    if (rootSchemeVersion != "v1") {
      throw new Error(
        "Elder version of database scheme doesn't support migration."
      );
    }

    let migratableDatabaseFilePath = path.join(
      datafileDirPath,
      "v1",
      "database.sqlite3"
    );
    if (!fs.existsSync(migratableDatabaseFilePath)) {
      throw new Error("Migratable Database file doesn't exists.");
    }

    return new Promise((resolve, reject) => {
      let oldDB = new sqlite3.Database(
        migratableDatabaseFilePath,
        async (err) => {
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
                  throw new Error(
                    `Next task of ${newId} is not found, original: ${oldTask.next}`
                  );
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
                console.warn(
                  `Parent task Id of ${oldSubtask.tid} is not found`
                );
                continue;
              }
              let parentTask = tasks[parentTaskNewId];
              if (parentTask == null) {
                throw new Error(
                  `Parent task of ${newId} is not found, original: ${oldSubtask.tid}`
                );
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
                throw new Error(
                  `Task Id of ${oldTaskCategory.tid} is not found`
                );
              }
              if (categoryNewId == null) {
                throw new Error(
                  `Category Id of ${oldTaskCategory.cid} is not found`
                );
              }
              let task = tasks[taskNewId];
              let category = categories[categoryNewId];
              if (task == null) {
                throw new Error(
                  `Task of ${taskNewId} is not found, original: ${oldTaskCategory.tid}`
                );
              }
              if (category == null) {
                throw new Error(
                  `Category of ${categoryNewId} is not found, original: ${oldTaskCategory.cid}`
                );
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
              fs.renameSync(
                migratableDatabaseFilePath,
                migratableDatabaseFilePath + ".bak"
              );
              resolve();
            } else {
              throw new Error("Socket is not connected.");
            }
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  }
}

module.exports = DatabaseService;
