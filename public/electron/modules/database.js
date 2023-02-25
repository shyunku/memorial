const sqlite3 = require("sqlite3");
const fs = require("fs");
const path = require("path");
const url = require("url");
const packageJson = require("../../../package.json");

let db;

module.exports = {
  initialize: function (isWindowsOS, buildLevel, userDataPath, appDataPath) {
    let schemeVersion = "v" + packageJson.config["scheme-version"];
    let datafileDirPath;
    let databaseDirPath;
    let databaseFilePath;
    let databaseTemplatePath;

    switch (buildLevel) {
      case 0:
        datafileDirPath = url.format({
          pathname: path.join(__dirname, "../../../datafiles"),
          slashes: false,
        });

        databaseTemplatePath = path.join(appDataPath, "public", "resources", "template.sqlite3");
        break;
      case 1:
        datafileDirPath = path.join(userDataPath, "datafiles");
        databaseTemplatePath = path.join(appDataPath, "build", "resources", "template.sqlite3");
        break;
      case 2:
        datafileDirPath = path.join(userDataPath, "datafiles");
        databaseTemplatePath = path.join(appDataPath, "../", "resources", "template.sqlite3");
        break;
    }

    databaseDirPath = url.format({
      pathname: path.join(datafileDirPath, schemeVersion),
      slashes: false,
    });

    databaseFilePath = url.format({
      pathname: path.join(databaseDirPath, "database.sqlite3"),
      slashes: false,
    });

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

    db = new sqlite3.Database(databaseFilePath, (err) => {
      if (err) {
        console.error(`Error occurred while opening database`);
        console.error(err);
        return;
      }

      // Process doesn't wait while database writer changes transactions (if level = OFF)
      db.run("PRAGMA synchronous = OFF");
      console.info(`Database successfully connected.`);
    });
  },
  getConnection: function () {
    return db;
  },
  getContext: function () {
    return {
      get: (query, ...args) => {
        let params = Array.isArray(args?.[0]) ? args[0] : args;
        return new Promise((resolve, reject) => {
          db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
      },
      run: (query, ...args) => {
        let params = Array.isArray(args?.[0]) ? args[0] : args;
        return new Promise((resolve, reject) => {
          db.run(query, params, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      },
      all: (query, ...args) => {
        let params = Array.isArray(args?.[0]) ? args[0] : args;
        return new Promise((resolve, reject) => {
          db.all(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
      },
    };
  },
};
