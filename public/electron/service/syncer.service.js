const Exec = require("../user_modules/executeRouter");
const SyncerContext = require("../contexts/syncer.context");

class SyncerService {
  /**
   * @param serviceGroup
   */
  constructor(serviceGroup) {
    this.serviceGroup = serviceGroup;
    this.socketService = serviceGroup.socketService;
    this.ipcService = serviceGroup.ipcService;
    this.dbService = serviceGroup.dbService;

    this.userSyncerContexts = new Map();
  }

  async getUserSyncerContext(userId) {
    if (userId == null) throw new Error("User ID is null");
    let context = this.userSyncerContexts.get(userId);
    if (context == null) {
      context = new SyncerContext(userId, this.serviceGroup);
      this.userSyncerContexts.set(userId, context);
    }
    return context;
  }
}

module.exports = SyncerService;
