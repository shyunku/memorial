const WindowService = require("../service/window.service");
const SessionService = require("../service/session.service");
const UserService = require("../service/user.service");
const IpcService = require("../service/ipc.service");
// const SocketService = require("../service/socket.service");
const WebsocketService = require("../service/websocket.service");
const DatabaseService = require("../service/database.service");
const SyncerService = require("../service/syncer.service");
const ExecutorService = require("../service/executor.service");
const UpdaterService = require("../service/updater.service");
const TransitionService = require("../service/transition.service");

const WindowConfigure = require("../configures/window.config");
const SessionConfigure = require("../configures/session.config");
const IpcConfigure = require("../configures/ipc.config");

class ServiceGroup {
  constructor() {
    this.windowService = new WindowService();
    this.sessionService = new SessionService();
    this.userService = new UserService();
    this.ipcService = new IpcService();
    // this.socketService = new SocketService();
    this.websocketService = new WebsocketService();
    this.databaseService = new DatabaseService();
    this.syncerService = new SyncerService();
    this.executorService = new ExecutorService();
    this.updaterService = new UpdaterService();
    this.transitionService = new TransitionService();
  }

  injectReferences() {
    this.windowService.inject(this);
    this.sessionService.inject(this);
    this.userService.inject(this);
    this.ipcService.inject(this);
    // this.socketService.inject(this);
    this.websocketService.inject(this);
    this.databaseService.inject(this);
    this.syncerService.inject(this);
    this.executorService.inject(this);
    this.updaterService.inject(this);
    this.transitionService.inject(this);
  }

  configureAndRun() {
    WindowConfigure(this.windowService);
    SessionConfigure(this.sessionService);
    IpcConfigure(this.ipcService);
  }
}

module.exports = ServiceGroup;
