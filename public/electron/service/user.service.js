class UserService {
  constructor() {
    this.userId = null;
  }

  /**
   * @param serviceGroup {ServiceGroup}
   */
  inject(serviceGroup) {}

  setCurrent(userId) {
    this.userId = userId;
  }

  getCurrent() {
    return this.userId;
  }
}

module.exports = UserService;
