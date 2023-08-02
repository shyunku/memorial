const packageJson = require("../../../package.json");
const path = require("path");
const sqlite3 = require("sqlite3");
const FileSystem = require("../modules/filesystem");
const fs = require("fs");
const { getBuildLevel } = require("../util/SystemUtil");
const { getUserDataPath } = require("../modules/filesystem");
const { v4 } = require("uuid");
const {
  InitializeStateTxContent,
} = require("../executors/initializeState.exec");
const TX_TYPE = require("../constants/TxType.constants");
const { isFieldsSorted } = require("../util/TxUtil");

const COLOR = console.RGB(78, 119, 138);
const TAG = console.wrap("IpcMain", COLOR);

class DatabaseContext {
  /**
   * @param userId? {string}
   * @param serviceGroup {ServiceGroup}
   */
  constructor(userId, serviceGroup) {
    this.userId = userId;
    /** @type {sqlite3.Database} */
    this.db = null;

    /** @type {WebsocketService} */
    this.websocketService = serviceGroup.websocketService;
    /** @type {ExecutorService} */
    this.executorService = serviceGroup.executorService;
    /** @type {SyncerService} */
    this.syncerService = serviceGroup.syncerService;
  }

  /**
   * @returns {Promise<void>}
   */
  async initializeAsRoot() {
    console.info("Initializing Root Database...");

    const userDataPath = getUserDataPath();
    const appResourcePath = FileSystem.getAppResourcesPath();
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

    this.db = new sqlite3.Database(rootDatabaseFilePath, (err) => {
      if (err) {
        console.error(`Error occurred while opening root database`);
        console.error(err);
        return;
      }

      this.db.run("PRAGMA synchronous = OFF;");
      this.db.run("PRAGMA foreign_keys = ON;");
      this.db.run("PRAGMA check_constraints = ON;");
      console.info(`Root Database successfully connected.`);
    });
  }

  /**
   * @returns {Promise<void>}
   */
  async initialize() {
    console.info(
      "Initializing User Database... [User ID: " + this.userId + "]"
    );

    const userDataPath = getUserDataPath();
    const appResourcePath = FileSystem.getAppResourcesPath();
    const schemeVersion = "v" + packageJson.config["scheme_version"];

    let datafileDirPath = path.join(userDataPath, "datafiles");
    let databaseDirPath = path.join(datafileDirPath, schemeVersion);
    let databaseFileName = `user-${this.userId}.sqlite3`;
    let databaseFilePath = path.join(databaseDirPath, databaseFileName);
    let databaseTemplatePath = path.join(
      appResourcePath,
      `${schemeVersion}-template.sqlite3`
    );

    if (!fs.existsSync(datafileDirPath)) {
      console.warn(`Datafile directory doesn't exists, newly create.`);
      fs.mkdirSync(datafileDirPath);
    }

    if (!fs.existsSync(databaseDirPath)) {
      console.warn(
        `Database directory (${schemeVersion}) doesn't exists, newly create`
      );
      fs.mkdirSync(databaseDirPath);
    }

    if (!fs.existsSync(databaseFilePath)) {
      console.warn(
        `Database file (${schemeVersion}) doesn't exists, newly create (${databaseTemplatePath} -> ${databaseFilePath})`
      );

      // copy template db to destination
      fs.copyFileSync(databaseTemplatePath, databaseFilePath);
    }

    if (this.db != null) {
      this.db.close();
    }

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(databaseFilePath, (err) => {
        if (err) {
          console.error(`Error occurred while opening database`);
          console.error(err);
          reject(err);
          return;
        }

        // Process doesn't wait while database writer changes transactions (if level = OFF)
        this.db.run("PRAGMA synchronous = OFF;");
        this.db.run("PRAGMA foreign_keys = ON;");
        this.db.run("PRAGMA check_constraints = ON;");
        console.info(`Database successfully connected.`);
        resolve();
      });
    });
  }

  // TODO :: delete this with react handler
  async isReady() {
    return true;
  }

  /**
   * @param versionPostfix {number}
   * @returns {Promise<unknown>}
   */
  async migrateLegacyDatabase(versionPostfix) {
    const version = "v" + versionPostfix;
    const socket = await this.websocketService.getUserWebsocketContext(
      this.userId
    );
    const userDataPath = FileSystem.getUserDataPath();
    const rootSchemeVersion = "v" + packageJson.config["root_scheme_version"];
    let datafileDirPath = path.join(userDataPath, "datafiles");

    if (!socket.connected()) {
      throw new Error("User is not connected to server.");
    }

    if (rootSchemeVersion !== "v1") {
      throw new Error(
        "Elder version of database scheme doesn't support migration."
      );
    }

    let legacyDatabaseFilePath = path.join(
      datafileDirPath,
      version,
      `user-${this.userId}.sqlite3`
    );
    if (!fs.existsSync(legacyDatabaseFilePath)) {
      throw new Error("Migratable Database file doesn't exists.");
    }

    return new Promise((resolve, reject) => {
      let oldDB = new sqlite3.Database(legacyDatabaseFilePath, async (err) => {
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
              console.warn(`Parent task Id of ${oldSubtask.tid} is not found`);
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
              createdAt: 0,
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
            let tx = this.executorService.makeTransaction(
              TX_TYPE.INITIALIZE,
              txContent,
              1
            );
            const syncerCtx = await this.syncerService.getUserSyncerContext(
              this.userId
            );
            await syncerCtx.sendTransaction(tx, 15000);

            // backup or delete old database?
            fs.renameSync(
              legacyDatabaseFilePath,
              legacyDatabaseFilePath + ".bak"
            );
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

  /**
   * @param db {sqlite3.Database}
   * @returns {Promise<InitializeStateTxContent>}
   */
  async getDatabaseSnapshot(db = this.db) {
    let tasks = {};
    let categories = {};

    let taskPromise = new Promise((res, rej) => {
      db.all("SELECT * FROM tasks", (err, rows) => {
        if (err) rej(err);
        res(rows);
      });
    });
    let subtasksPromise = new Promise((res, rej) => {
      db.all("SELECT * FROM subtasks", (err, rows) => {
        if (err) rej(err);
        res(rows);
      });
    });
    let categoriesPromise = new Promise((res, rej) => {
      db.all("SELECT * FROM categories", (err, rows) => {
        if (err) rej(err);
        res(rows);
      });
    });
    let taskCategoriesPromise = new Promise((res, rej) => {
      db.all("SELECT * FROM tasks_categories", (err, rows) => {
        if (err) rej(err);
        res(rows);
      });
    });

    let dbTasks = await taskPromise;
    let dbSubtasks = await subtasksPromise;
    let dbCategories = await categoriesPromise;
    let dbTaskCategories = await taskCategoriesPromise;

    for (let dbTask of dbTasks) {
      let task = {
        tid: dbTask.tid,
        title: dbTask.title,
        createdAt: dbTask.created_at,
        doneAt: dbTask.done_at,
        memo: dbTask.memo,
        done: dbTask.done == true,
        dueDate: dbTask.due_date,
        dueTime: dbTask.due_time,
        next: null,
        repeatPeriod: dbTask.repeat_period,
        repeatStartAt: dbTask.repeat_start_at,
        subtasks: {},
        categories: {},
      };
      tasks[dbTask.tid] = task;
    }

    // mapping next
    for (let dbTask of dbTasks) {
      let task = tasks[dbTask.tid];
      if (dbTask.next != null) {
        task.next = tasks[dbTask.next].tid;
      }
    }

    for (let dbSubtask of dbSubtasks) {
      let subtask = {
        sid: dbSubtask.sid,
        title: dbSubtask.title,
        createdAt: dbSubtask.created_at,
        doneAt: dbSubtask.done_at,
        dueDate: dbSubtask.due_date,
        done: dbSubtask.done == true,
      };
      let parentTask = tasks[dbSubtask.tid];
      if (parentTask == null) {
        throw new Error(`Parent task of ${dbSubtask.tid} is not found`);
      }
      parentTask.subtasks[dbSubtask.tid] = subtask;
    }

    for (let dbCategory of dbCategories) {
      let category = {
        cid: dbCategory.cid,
        title: dbCategory.title,
        secret: dbCategory.secret == true,
        locked: dbCategory.secret == true,
        color: dbCategory.color,
        createdAt: dbCategory.created_at,
      };
      categories[dbCategory.cid] = category;
    }

    for (let dbTaskCategory of dbTaskCategories) {
      let task = tasks[dbTaskCategory.tid];
      task.categories[dbTaskCategory.cid] = true;
    }

    return new InitializeStateTxContent(tasks, categories);
  }

  async clear() {
    await this.useForeignKey(false);
    await this.useCheckConstraint(false);
    await this.begin();
    try {
      const tables = await this.all(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
      );
      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        await this.run(`DELETE FROM ${table.name};`);
      }
      await this.commit();
    } catch (err) {
      await this.rollback();
      throw err;
    } finally {
      await this.useForeignKey(true);
      await this.useCheckConstraint(true);
    }
  }

  async clearExceptTransactions() {
    await this.begin();
    try {
      const tables = await this.all(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'transactions';"
      );
      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        await this.run(`DELETE FROM ${table.name};`);
      }
      await this.commit();
    } catch (err) {
      await this.rollback();
      throw err;
    }
  }

  async isClearExceptTransactions() {
    const tables = await this.all(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'transactions';"
    );
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      const count = await this.get(
        `SELECT COUNT(*) AS count FROM ${table.name};`
      );
      if (count.count > 0) {
        console.debug(`table ${table.name} not clear`);
        return false;
      }
    }
    return true;
  }

  get(query, ...args) {
    console.system(
      `${TAG} ${console.wrap(`<-[GET]->`, console.BLUE)} ${console.wrap(
        "sqlite3: " + query,
        console.YELLOW
      )} ${args.join(", ")}`
    );
    let params = Array.isArray(args?.[0]) ? args[0] : args;
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async run(query, ...args) {
    console.system(
      `${TAG} ${console.wrap(`--[RUN]->`, console.BLUE)} ${console.wrap(
        "sqlite3: " + query,
        console.YELLOW
      )} ${args.map((e) => e ?? null).join(", ")}`
    );
    let params = Array.isArray(args?.[0]) ? args[0] : args;
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function (err) {
        if (err) {
          console.system(
            `IpcMain ${console.wrap(`X-[RES]--`, console.RED)} ${console.wrap(
              `sqlite3`,
              console.RED
            )} Run failed: ${err}`
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

  async useForeignKey(use) {
    return await this.run(`PRAGMA foreign_keys = ${use ? "ON" : "OFF"};`);
  }

  async useCheckConstraint(use) {
    return await this.run(`PRAGMA check_constraints = ${use ? "ON" : "OFF"};`);
  }

  /**
   *
   * @param query
   * @param args
   * @returns {Promise<any[]>}
   */
  all(query, ...args) {
    console.system(
      `${TAG} ${console.wrap(`<-[ALL]->`, console.BLUE)} ${console.wrap(
        "sqlite3: " + query,
        console.YELLOW
      )} ${args.map((e) => e ?? null).join(", ")}`
    );
    let params = Array.isArray(args?.[0]) ? args[0] : args;
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  begin() {
    console.system(
      `${TAG} ${console.wrap(`--[BEG]->`, console.BLUE)} ${console.wrap(
        "sqlite3: begin transaction;",
        console.ORANGE
      )}`
    );
    return new Promise((resolve, reject) => {
      this.db.run("BEGIN", (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  commit() {
    console.system(
      `${TAG} ${console.wrap(`--[COM]->`, console.BLUE)} ${console.wrap(
        "sqlite3: commit transactions",
        console.ORANGE
      )}`
    );
    return new Promise((resolve, reject) => {
      this.db.run("COMMIT", (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  rollback() {
    console.system(
      `${TAG} ${console.wrap(`--[ROL]-|`, console.BLUE)} ${console.wrap(
        "sqlite3: rollback transactions",
        console.ORANGE
      )}`
    );
    return new Promise((resolve, reject) => {
      this.db.run("ROLLBACK", (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async close() {
    new Promise((resolve, reject) =>
      this.db.close((err) => {
        if (err) reject(err);
        this.db = null;
        resolve();
      })
    );
  }
}

module.exports = DatabaseContext;
