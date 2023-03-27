const SyncerContext = require("../contexts/syncer.context");

class SyncerService {
  constructor() {
    this.serviceGroup = null;
    this.userSyncerContexts = new Map();
  }

  /**
   * @param serviceGroup {ServiceGroup}
   */
  inject(serviceGroup) {
    this.serviceGroup = serviceGroup;
  }

  async getUserSyncerContext(userId) {
    if (userId == null) throw new Error("User ID is null");
    let context = this.userSyncerContexts.get(userId);
    if (context == null) {
      context = new SyncerContext(userId, this.serviceGroup);
      await context.initialize();
      this.userSyncerContexts.set(userId, context);
    }
    return context;
  }

  /**
   * @param userId {string}
   * @param blockNumber {number}
   * @returns {Promise<void>}
   */
  async setLocalLastBlockNumber(userId, blockNumber) {
    const context = await this.getUserSyncerContext(userId);
    if (context == null) throw new Error("Context is null");
    await context.setLocalLastBlockNumber(blockNumber);
  }

  async setRemoteLastBlockNumber(userId, blockNumber) {
    const context = await this.getUserSyncerContext(userId);
    if (context == null) throw new Error("Context is null");
    await context.setRemoteLastBlockNumber(blockNumber);
  }
}

module.exports = SyncerService;
