const FileSystem = require("../modules/filesystem");
const packageJson = require("../../../package.json");
const path = require("path");
const fs = require("fs");
const DatabaseContext = require("../contexts/database.context");

class DatabaseService {
  constructor() {
    this.rootDatabaseContext = null;
    this.userDatabaseContexts = new Map();

    /** @type {WebsocketService} */
    this.websocketService = null;

    /** @type {ServiceGroup} */
    this.serviceGroup = null;
  }

  /**
   * @param serviceGroup {ServiceGroup}
   */
  inject(serviceGroup) {
    this.websocketService = serviceGroup.websocketService;
    this.serviceGroup = serviceGroup;
  }

  /**
   * @returns {Promise<DatabaseContext>}
   */
  async getRootDatabaseContext() {
    if (this.rootDatabaseContext == null) {
      // create new root db context
      this.rootDatabaseContext = new DatabaseContext(null, this.serviceGroup);
      await this.rootDatabaseContext.initializeAsRoot();
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
      context = new DatabaseContext(userId, this.serviceGroup);
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

  async deleteUserDatabase(userId) {
    if (userId == null) throw new Error("User ID is not valid.");
    console.info("Deleting User Database... [User ID: " + userId + "]");

    const userDataPath = FileSystem.getUserDataPath();
    const schemeVersion = "v" + packageJson.config["scheme_version"];
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
    const userDataPath = FileSystem.getUserDataPath();
    let datafileDirPath = path.join(userDataPath, "datafiles");

    if (rootSchemeVersion !== "v1") {
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
}

module.exports = DatabaseService;
