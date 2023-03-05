const db = require("../modules/sqlite3").getContext();

class DatbaseManager {
  constructor() {}

  async checkIntegrity() {
    // check database integrity (task linked list, ... etc)
  }

  async initialize() {}
}

module.exports = new DatbaseManager();
