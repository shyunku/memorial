const packageJson = require("../../../package.json");
const path = require("path");
const sqlite3 = require("sqlite3");
const FileSystem = require("../modules/filesystem");
const fs = require("fs");

const color = console.RGB(78, 119, 138);

class DatabaseContext {
  constructor(userId) {
    this.userId = userId;
    this.db = null;
  }

  async initialize(asRoot = false) {
    if (asRoot) {
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
    } else {
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
  }

  // TODO :: delete this with react handler
  async isReady() {
    return true;
  }

  async clear(db) {
    await db.begin();
    try {
      const tables = await db.all(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"
      );
      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];
        await db.run(`DELETE FROM ${table.name};`);
      }
      await db.commit();
    } catch (err) {
      await db.rollback();
      throw err;
    }
  }

  get(_db, query, ...args) {
    console.system(
      `${coloredIpcMain} ${console.wrap(
        `<-[GET]->`,
        console.BLUE
      )} ${console.wrap("sqlite3: " + query, console.YELLOW)} ${args.join(
        ", "
      )}`
    );
    let params = Array.isArray(args?.[0]) ? args[0] : args;
    return new Promise((resolve, reject) => {
      _db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  run(_db, query, ...args) {
    console.system(
      `${coloredIpcMain} ${console.wrap(
        `--[RUN]->`,
        console.BLUE
      )} ${console.wrap("sqlite3: " + query, console.YELLOW)} ${args.join(
        ", "
      )}`
    );
    let params = Array.isArray(args?.[0]) ? args[0] : args;
    return new Promise((resolve, reject) => {
      _db.run(query, params, function (err) {
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

  /**
   *
   * @param query
   * @param args
   * @returns {Promise<any[]>}
   */
  all(query, ...args) {
    console.system(
      `${coloredIpcMain} ${console.wrap(
        `<-[ALL]->`,
        console.BLUE
      )} ${console.wrap("sqlite3: " + query, console.YELLOW)} ${args.join(
        ", "
      )}`
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
      `${coloredIpcMain} ${console.wrap(
        `--[BEG]->`,
        console.BLUE
      )} ${console.wrap("sqlite3: begin transaction;", console.ORANGE)}`
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
      `${coloredIpcMain} ${console.wrap(
        `--[COM]->`,
        console.BLUE
      )} ${console.wrap("sqlite3: commit transactions", console.ORANGE)}`
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
      `${coloredIpcMain} ${console.wrap(
        `--[ROL]-|`,
        console.BLUE
      )} ${console.wrap("sqlite3: rollback transactions", console.ORANGE)}`
    );
    return new Promise((resolve, reject) => {
      this.db.run("ROLLBACK", (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async finalize() {
    new Promise((resolve, reject) =>
      this.db.close((err) => {
        if (err) reject(err);
        db = null;
        resolve();
      })
    );
  }
}

module.exports = DatabaseContext;
