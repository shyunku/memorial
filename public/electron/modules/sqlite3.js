const sqlite3 = require("sqlite3");
const fs = require("fs");
const path = require("path");
const url = require("url");
const packageJson = require("../../../package.json");
const FileSystem = require("./filesystem");

let currentDatabaseUserId = null;
let db = null;
let rootDB = null;

let buildLevel = null;
let userDataPath = null;

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
    `IpcMain ${console.wrap(`<-[GET]->`, console.BLUE)} ${console.wrap(
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
    `IpcMain ${console.wrap(`--[RUN]->`, console.BLUE)} ${console.wrap(
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
    `IpcMain ${console.wrap(`<-[ALL]->`, console.BLUE)} ${console.wrap(
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
  return new Promise((resolve, reject) => {
    _db.run("BEGIN", (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function _commit(_db) {
  return new Promise((resolve, reject) => {
    _db.run("COMMIT", (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function _rollback(_db) {
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
  }),
  getContext: async () => {
    if (db == null) await getConnection();
    return {
      get: (query, ...args) => _get(db, query, ...args),
      run: (query, ...args) => _run(db, query, ...args),
      all: (query, ...args) => _all(db, query, ...args),
      begin: () => _begin(db),
      commit: () => _commit(db),
      rollback: () => _rollback(db),
    };
  },
  isReadyForOperateUser: (userId) => db != null && currentDatabaseUserId == userId,
  setSystemInfo,
};
