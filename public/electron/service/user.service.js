class UserService {
  constructor() {
    this.userId = null;
  }

  setCurrent(userId) {
    this.userId = userId;
  }

  getCurrent() {
    return this.userId;
  }
}

module.exports = UserService;
