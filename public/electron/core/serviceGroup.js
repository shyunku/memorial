const WindowService = require("../service/window.service");
const SessionService = require("../service/session.service");
const UserService = require("../service/user.service");
const IpcService = require("../service/ipc.service");
const SocketService = require("../service/socket.service");
const WebsocketService = require("../service/websocket.service");
const DatabaseService = require("../service/database.service");
const SyncerService = require("../service/syncer.service");
const ExecutorService = require("../service/executor.service");

const WindowConfigure = require("../configures/window.config");
const SessionConfigure = require("../configures/session.config");
const IpcConfigure = require("../configures/ipc.config");

class ServiceGroup {
  constructor() {
    this.windowService = new WindowService();
    this.sessionService = new SessionService();
    this.userService = new UserService();
    this.ipcService = new IpcService();
    this.socketService = new SocketService();
    this.websocketService = new WebsocketService();
    this.databaseService = new DatabaseService();
    this.syncerService = new SyncerService();
    this.executorService = new ExecutorService();
  }

  injectReferences() {
    this.ipcService.inject(this);
  }

  configure() {
    WindowConfigure(this.windowService);
    SessionConfigure(this.sessionService);
    IpcConfigure(this.ipcService);
  }
}

module.exports = ServiceGroup;
