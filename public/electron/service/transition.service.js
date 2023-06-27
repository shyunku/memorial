const TransitionContext = require("../contexts/transition.context");

class TransitionService {
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

  /**
   * @param userId {string}
   * @returns {Promise<TransitionContext>}
   */
  async getUserTransitionContext(userId) {
    if (userId == null) throw new Error("User ID is null");
    let context = this.userSyncerContexts.get(userId);
    if (context == null) {
      context = new TransitionContext(userId, this.serviceGroup);
      await context.initialize();
      this.userSyncerContexts.set(userId, context);
    }
    return context;
  }
}

module.exports = TransitionService;
