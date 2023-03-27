const WebsocketContext = require("../contexts/websocket.context");

class WebsocketService {
  constructor() {
    this.userWebsocketContexts = new Map();

    /** @type {ServiceGroup} */
    this.serviceGroup = null;
  }

  /**
   * @param serviceGroup {ServiceGroup}
   */
  inject(serviceGroup) {
    this.serviceGroup = serviceGroup;
  }

  /**
   *
   * @param userId {string}
   * @returns {Promise<WebsocketContext>}
   */
  async getUserWebsocketContext(userId) {
    if (userId == null) throw new Error("User ID is null");
    let context = this.userWebsocketContexts.get(userId);
    if (context == null) {
      context = new WebsocketContext(userId, this.serviceGroup);
      this.userWebsocketContexts.set(userId, context);
    }
    return context;
  }
}

module.exports = WebsocketService;
