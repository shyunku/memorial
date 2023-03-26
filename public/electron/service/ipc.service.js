const {reqIdTag} = require("../modules/util");
const {ipcMain} = require("electron");
const IpcRouter = require("../util/IpcRouter");
const Request = require("../core/request");

const COLOR = console.RGB(78, 119, 138);
const TAG = console.wrap("IpcMain", COLOR);

const silentTopics = [];

class IpcService {
  constructor() {
    /** @type {WindowService} */
    this.windowService = null;

    /** @type {DatabaseService} */
    this.databaseService = null;

    /** @type {UserService} */
    this.userService = null;

    /** @type {SyncerService} */
    this.syncerService = null;

    /** @type {WebsocketService} */
    this.websocketService = null;

    /** @type {ExecutorService} */
    this.executorService = null;
  }

  /**
   * @param group {ServiceGroup}
   */
  inject(group) {
    this.windowService = group.windowService;
    this.databaseService = group.databaseService;
    this.userService = group.userService;
    this.syncerService = group.syncerService;
    this.websocketService = group.websocketService;
    this.executorService = group.executorService;
  }

  async getUserDatabaseContext() {
    const userId = this.userService.getCurrent();
    if (userId == null) throw new Error("User ID is null");
    return await this.databaseService.getUserDatabaseContext(userId);
  }

  async getUserLastLocalBlockNumber() {
    const userId = this.userService.getCurrent();
    if (userId == null) throw new Error("User ID is null");
    const syncerContext = await this.syncerService.getUserSyncerContext(userId);
    return syncerContext.getLocalLastBlockNumber();
  }

  async getUserLastRemoteBlockNumber() {
    const userId = this.userService.getCurrent();
    if (userId == null) throw new Error("User ID is null");
    const syncerContext = await this.syncerService.getUserSyncerContext(userId);
    return syncerContext.getRemoteLastBlockNumber();
  }

  /**
   * @returns {Promise<WebsocketContext>}
   */
  async getUserWebsocketContext() {
    const userId = this.userService.getCurrent();
    if (userId == null) throw new Error("User ID is null");
    return await this.websocketService.getUserWebsocketContext(userId);
  }

  /**
   * @returns {Promise<SyncerContext>}
   */
  async getUserSyncerContext() {
    const userId = this.userService.getCurrent();
    if (userId == null) throw new Error("User ID is null");
    return await this.syncerService.getUserSyncerContext(userId);
  }

  register(topic, callback, ...arg) {
    const originalCallback = callback;
    callback = async (event, reqId, ...arg) => {
      if (!silentTopics.includes(topic)) {
        let mergedArguments = arg
          .map((param) => console.shorten(param))
          .join(" ");

        console.system(
          `${TAG} ${console.wrap(
            `<-${reqIdTag(reqId)}--`,
            console.GREEN
          )} ${console.wrap(topic, console.MAGENTA)} ${mergedArguments}`
        );
      }
      try {
        return await originalCallback(event, reqId, ...arg);
      } catch (err) {
        console.error(err);
        return null;
      }
    };
    return ipcMain.on(topic, callback, ...arg);
  }

  silentRegister(topic, ...arg) {
    return ipcMain.on(topic, ...arg);
  }

  // send data with success flag
  sender(topic, reqId, success, data = null, ...extra) {
    if (typeof success !== "boolean")
      console.error(
        `[IpcMain]: success flag is not boolean (${console.wrap(
          topic,
          console.MAGENTA
        )})`
      );
    let packagedData = {success, data};
    let sendeeCount = IpcRouter.broadcast(topic, reqId, packagedData, ...extra);

    if (silentTopics.includes(topic)) return;
    console.system(
      `${TAG} ${console.wrap(
        `--${reqIdTag(reqId)}-${success ? ">" : "X"}`,
        success ? console.CYAN : console.RED
      )} ${console.wrap(topic, console.MAGENTA)} ${console.wrap(
        `(${sendeeCount})`,
        console.BLUE
      )} ${JSON.stringify(data)}`
    );
  }

  // send raw data (without success flag)
  emiter(topic, reqId, data) {
    let sendeeCount = IpcRouter.broadcast(topic, reqId, data);

    if (silentTopics.includes(topic)) return;
    console.system(
      `${TAG} --${reqIdTag(reqId)}-> ${console.wrap(
        topic,
        console.MAGENTA
      )} ${console.wrap(`(${sendeeCount})`, console.BLUE)}`,
      data
    );
  }

  fastSender(topic, socketResponse) {
    let success = socketResponse.code === Request.ok;
    let data = socketResponse
      ? success
        ? socketResponse.data
        : socketResponse.code
      : null;

    let packagedData = {success, data};
    let sendeeCount = IpcRouter.broadcast(topic, packagedData);

    if (silentTopics.includes(topic)) return;
    console.system(
      `${TAG} ${console.wrap(
        `--${reqIdTag("NIL")}->`,
        console.CYAN
      )} ${console.wrap(topic, console.MAGENTA)} ${console.wrap(
        `(${sendeeCount})`,
        console.BLUE
      )} ${data}`
    );
  }

  silentSender(topic, success, data) {
    let packagedData = {success, data};
    IpcRouter.broadcast(topic, packagedData);
  }

  fastSilentSender(topic, socketResponse) {
    let success = socketResponse.code === Request.ok;
    let data = socketResponse
      ? success
        ? socketResponse.data
        : socketResponse.code
      : null;

    let packagedData = {success, data};
    IpcRouter.broadcast(topic, packagedData);
  }
}

module.exports = IpcService;
