const { v4 } = require("uuid");
const {
  reqIdTag,
  getWebsocketFinalEndpoint,
  getServerFinalEndpoint,
} = require("../modules/util");
const WebSocket = require("ws");
const Request = require("../core/request");
const { getCommonCloseReasonByCode } = require("../util/WebsocketUtil");
const Block = require("../objects/Block");
const TransactionRequest = require("../objects/TransactionRequest");
const { jsonUnmarshal } = require("../util/TxUtil");

const color = console.RGB(190, 75, 255);
const coloredSocket = console.wrap("Websock", color);

class WebsocketContext {
  /**
   * @param userId {string}
   * @param serviceGroup {ServiceGroup}
   */
  constructor(userId, serviceGroup) {
    this.userId = userId;

    this.ipcService = serviceGroup.ipcService;
    this.databaseService = serviceGroup.databaseService;
    this.userService = serviceGroup.userService;
    this.syncerService = serviceGroup.syncerService;

    /** @type {WebSocket} */
    this.socket = null;

    this.queue = {};
    this.socketHandlers = {};
    this.messageHandlers = {};
    this.alreadyAuthorized = false;

    this.reconnectTimeoutThread = null;
    this.reconnectTimeout = 500;

    for (const reqId in this.queue) {
      const { timeoutHandler } = this.queue[reqId];
      clearTimeout(timeoutHandler);
    }
  }

  /**
   * @param accessToken {string}
   * @param refreshToken {string}
   * @param reconnect {boolean}
   * @returns {Promise<void>}
   */
  async connect(accessToken, refreshToken, reconnect = false) {
    const websocketFinalEndpoint = getWebsocketFinalEndpoint();

    if (!reconnect && this.socket != null) {
      clearTimeout(this.reconnectTimeoutThread);
      console.warn("Socket is already connected. Disconnecting previous...");
      this.disconnect(1000, "Reorganize socket connection");
    }

    // recalculate next reconnect timeout
    if (reconnect) {
      this.reconnectTimeout = this.reconnectTimeout * 2;
      if (this.reconnectTimeout > 10000) this.reconnectTimeout = 10000;
    } else {
      this.reconnectTimeout = 500;
    }

    if (reconnect === false && this.alreadyAuthorized === true) {
      this.alreadyAuthorized = false;
    }

    const updatedAccessToken = await this.testAuthTokenAndRefresh(
      accessToken,
      refreshToken
    );

    // set self-signed certificate false
    console.system(
      console.wrap(
        `Websocket connecting to ${websocketFinalEndpoint}`,
        console.ORANGE
      )
    );
    this.socket = new WebSocket(websocketFinalEndpoint, {
      rejectUnauthorized: false,
      headers: {
        Authorization: `Bearer ${updatedAccessToken}`,
      },
    });

    await this.connectHandler(accessToken, refreshToken);

    /* ---------------------------------------- Default ---------------------------------------- */
    this.alreadyAuthorized = true;
  }

  /**
   * @param accessToken {string}
   * @param refreshToken {string}
   */
  async connectHandler(accessToken, refreshToken) {
    const websocketFinalEndpoint = getWebsocketFinalEndpoint();
    const syncer = await this.syncerService.getUserSyncerContext(this.userId);

    this.on("message", (...arg) => {
      try {
        const [buffer] = arg;
        let raw = buffer.toString();
        const data = JSON.parse(raw);

        // find handlers
        let handlers = this.messageHandlers;
        if (handlers != null && data.topic != null) {
          // formalized data
          const reqId = data.reqId;
          if (reqId == null) {
            console.warn(`Request ID not present for message: ${data.topic}`);
            return;
          }

          // find on queue
          const queueItem = this.queue[reqId];
          if (queueItem != null) {
            clearTimeout(queueItem.timeoutHandler);
            if (data.success) {
              queueItem?.callback(data.data);
            } else {
              queueItem.errorHandler(new Error(data.err_message));
            }

            delete this.queue[reqId];
            return;
          }

          if (
            handlers[data.topic] != null &&
            typeof handlers[data.topic] === "function"
          ) {
            const handler = handlers[data?.topic];
            handler(data);
          } else {
            console.warn(`Unhandled message from websocket: ${data.topic}`);
          }
        } else {
          // raw data
          console.warn(`Unhandled raw message from websocket:`, data);
        }
      } catch (err) {
        console.error(err);
      }
    });

    this.on("open", async () => {
      console.system(
        console.wrap(
          `Websocket connected to (${websocketFinalEndpoint})`,
          console.CYAN
        )
      );
      this.ipcService.emiter("socket/connected", null, null);
      const syncer = await this.syncerService.getUserSyncerContext(this.userId);
      if (syncer.stateListenReady) {
        await this.requestLastRemoteBlock();
      }
    });

    this.on("error", (err) => {
      console.error(`Socket error occurred`, err);
      if (err.message.includes("401")) {
        this.ipcService.sender("system/socketError", null, true, 401);
      }
    });

    this.on("close", (code) => {
      const commonReason = getCommonCloseReasonByCode(code);
      console.warn(`Disconnect with socket (${code}), reason: ${commonReason}`);
      this.ipcService.emiter("socket/disconnected", null, { code });

      // reconnect
      console.info(`Reconnecting socket in ${this.reconnectTimeout}ms...`);
      this.reconnectTimeoutThread = setTimeout(async () => {
        await this.connect(accessToken, refreshToken, true);
      }, this.reconnectTimeout);
    });

    this.onMessage("test", ({ data }) => {
      console.debug(data);
    });

    this.onMessage("broadcast_transaction", ({ data: block }) => {
      syncer.saveBlockAndExecute(block);
    });

    this.onMessage("last_block_number", ({ data: lastRemoteBlockNumber }) => {
      syncer.setRemoteLastBlockNumber(lastRemoteBlockNumber);
    });

    this.onMessage("delete_transaction_after", ({ data: blockNumber }) => {
      syncer.handleDeleteTransactionsAfter(blockNumber);
    });
  }

  async requestLastRemoteBlock() {
    try {
      let lastRemoteBlock = await this.sendSync("lastRemoteBlock", null, 10000);
      await this.handleLastRemoteBlock(lastRemoteBlock);
    } catch (err) {
      console.error(`Waiting block number error`, err);
    }
  }

  /**
   * @param code {number}
   * @param reason {string}
   */
  disconnect(code, reason) {
    if (this.socket != null) {
      this.off("close");
      this.socket.close(code, reason);
      this.socket = null;
    }

    this.reconnectTimeout = 500;
    this.queue = {};
    this.messageHandlers = {};
    this.socketHandlers = {};

    clearTimeout(this.reconnectTimeoutThread);
  }

  connected() {
    return this.socket != null && this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * @param accessToken {string}
   * @param refreshToken {string}
   * @returns {Promise<string>}
   */
  async testAuthTokenAndRefresh(accessToken, refreshToken) {
    const appServerFinalEndpoint = getServerFinalEndpoint();
    let accessToken_ = accessToken;
    let refreshToken_ = refreshToken;

    const rootDB = await this.databaseService.getRootDatabaseContext();

    try {
      if (!this.alreadyAuthorized) {
        await Request.post(appServerFinalEndpoint, "/token/test", null, {
          headers: {
            Authorization: `Bearer ${accessToken_}`,
          },
        });
      }
    } catch (err) {
      try {
        let [user] = await rootDB.all(
          `SELECT * FROM users WHERE uid = ?;`,
          this.userId
        );
        if (user == null) throw new Error("User not found");

        if (accessToken_ == null) accessToken_ = user.access_token ?? null;
        if (refreshToken_ == null) refreshToken_ = user.refresh_token ?? null;
      } catch (err) {
        console.error(err);
      }

      // if error is 401, then try refresh token
      console.debug(err?.response?.status, err?.response?.data, refreshToken_);
      if (
        err?.response?.status === 401 &&
        refreshToken_ != null &&
        refreshToken_ !== ""
      ) {
        try {
          console.info(
            `Trying to refresh access/refresh token with recent refresh token...`,
            refreshToken_
          );
          let result = await Request.post(
            appServerFinalEndpoint,
            "/auth/refreshToken",
            null,
            {
              headers: {
                Authorization: `Bearer ${accessToken_}`,
                "X-Refresh-Token": refreshToken_,
              },
              withCredentials: true,
            }
          );
          let { access_token, refresh_token } = result;

          accessToken_ = access_token.token;
          refreshToken_ = refresh_token.token;

          // register updated tokens on local
          await rootDB.run(
            `UPDATE users SET access_token = ?, refresh_token = ? WHERE uid = ?;`,
            [accessToken_, refreshToken_, this.userId]
          );

          // update access token & refresh token to ipc
          this.ipcService.sender("auth/tokenUpdated", null, true, {
            accessToken: accessToken_,
            refreshToken: refreshToken_,
          });
        } catch (err) {
          console.error(err);
          console.log(err?.response?.data);

          // refresh failed
          throw new Error(401);
        }
      } else {
        console.debug(err?.response?.data);
        if (err?.response?.data == null) {
          console.error(err);
        }
        if (err?.response?.status == null) {
          console.error(err);
        }
        throw new Error(err?.response?.status ?? "unknown error");
      }
    }
    this.alreadyAuthorized = true;
    return accessToken_;
  }

  async handleLastRemoteBlock(lastRemoteBlock) {
    const { number: remoteLastBlockNumber } = lastRemoteBlock;

    const syncer = await this.syncerService.getUserSyncerContext(this.userId);
    const db = await this.databaseService.getUserDatabaseContext(this.userId);

    console.info(`Remote Last block number: ${remoteLastBlockNumber}`);
    syncer.setRemoteLastBlockNumber(remoteLastBlockNumber);

    // local last block number
    let localLastBlockNumber = await syncer.getLocalLastBlockNumber();
    console.info(`Local Last block number: ${localLastBlockNumber}`);
    let commonBlockNumber = Math.min(
      localLastBlockNumber,
      remoteLastBlockNumber
    );

    if (commonBlockNumber === 0) {
      const remoteZeroBlockHash = await syncer.getRemoteBlockHash(0);
      // test local empty hash
      let zeroBlock = Block.emptyBlock();
      if (zeroBlock.hash !== remoteZeroBlockHash) {
        console.error(
          `Initial hash mismatch, local: ${zeroBlock.hash}, remote: ${remoteZeroBlockHash}`
        );
        throw new Error("Initial hash mismatch");
      } else {
        console.debug(
          `Initial hash matched, local: ${zeroBlock.hash}, remote: ${remoteZeroBlockHash}`
        );
      }
    } else if (commonBlockNumber > 0) {
      let lastCommonLocalBlockHash = await syncer.getLocalBlockHash(
        commonBlockNumber
      );
      let lastCommonRemoteBlockHash = await syncer.getRemoteBlockHash(
        commonBlockNumber
      );

      // Mismatched occurred :: check mismatch of blockchain
      if (lastCommonLocalBlockHash !== lastCommonRemoteBlockHash) {
        // fuzzy state :: don't check mismatch, just sync with latest (v0.2.2)
        const justSync = true;

        if (justSync) {
          console.warn(
            `Mismatch block hash detected at ${commonBlockNumber},` +
              ` local: ${lastCommonLocalBlockHash}, remote: ${lastCommonRemoteBlockHash}`
          );
          // last common mismatch, need to find un-dirty block
          let oldestLocalBlockNumber = await syncer.getOldestLocalBlockNumber();
          if (oldestLocalBlockNumber == null) {
            throw new Error("Cannot find oldest local block number");
          }

          console.info(
            `finding mismatch start block number in (${oldestLocalBlockNumber} ~ ${commonBlockNumber})`
          );
          const mismatchStartBlockNumber =
            await syncer.findBlockHashMismatchStartNumber(
              oldestLocalBlockNumber,
              commonBlockNumber
            );
          if (mismatchStartBlockNumber == null) {
            throw new Error("Cannot find mismatch start block number");
          }

          // my latest block
          const localLastBlock = await syncer.getLocalBlock(
            localLastBlockNumber
          );
          const remoteLastBlock = await syncer.getRemoteBlock(
            remoteLastBlockNumber
          );

          const localLastBlockTime = localLastBlock.timestamp;
          const remoteLastBlockTime = remoteLastBlock.tx.timestamp;

          if (localLastBlockTime > remoteLastBlockTime) {
            console.warn(
              `Local block is newer than remote, so choose local blocks to upload`
            );
            // overwrite server with local blocks
            await syncer.overwriteRemoteStateWithLocal(
              mismatchStartBlockNumber,
              localLastBlockNumber
            );
          } else if (localLastBlockTime < remoteLastBlockTime) {
            console.warn(
              `Remote block is newer than local, so choose remote blocks to upload`
            );
            // overwrite local with remote blocks
            await syncer.overwriteLocalStateWithRemote(remoteLastBlockNumber);
          } else {
            // blocks uploaded at same time, choose longer one
            if (localLastBlockNumber > remoteLastBlockNumber) {
              console.warn(
                `Local chain is longer than remote, so choose local blocks to upload`
              );
              // overwrite server with local blocks
              await syncer.overwriteRemoteStateWithLocal(
                mismatchStartBlockNumber,
                localLastBlockNumber
              );
            } else {
              console.warn(
                `Remote chain is longer or same as local, so choose remote blocks to upload`
              );
              // overwrite local with remote blocks
              await syncer.overwriteLocalStateWithRemote(remoteLastBlockNumber);
            }
          }
        } else {
          console.warn(
            `Mismatch block hash detected at ${commonBlockNumber},` +
              ` local: ${lastCommonLocalBlockHash}, remote: ${lastCommonRemoteBlockHash}`
          );
          // last common mismatch, need to find un-dirty block
          let oldestLocalBlockNumber = await syncer.getOldestLocalBlockNumber();
          if (oldestLocalBlockNumber == null) {
            throw new Error("Cannot find oldest local block number");
          }

          console.info(
            `finding mismatch start block number in (${oldestLocalBlockNumber} ~ ${commonBlockNumber})`
          );
          const mismatchStartBlockNumber =
            await syncer.findBlockHashMismatchStartNumber(
              oldestLocalBlockNumber,
              commonBlockNumber
            );
          if (mismatchStartBlockNumber == null) {
            throw new Error("Cannot find mismatch start block number");
          }

          // recover mismatch blocks
          this.ipcService.sender("system/mismatchTxHashFound", null, true, {
            mismatchStartBlockNumber,
            mismatchEndBlockNumber: commonBlockNumber,
            lossAfterAcceptTheirs:
              localLastBlockNumber >= mismatchStartBlockNumber
                ? localLastBlockNumber - mismatchStartBlockNumber + 1
                : 0,
            lossAfterAcceptMine:
              remoteLastBlockNumber >= mismatchStartBlockNumber
                ? remoteLastBlockNumber - mismatchStartBlockNumber + 1
                : 0,
          });
          throw new Error(
            `Mismatch block hash found at block number ${mismatchStartBlockNumber}~${commonBlockNumber}`
          );
        }
      }
    }

    if (localLastBlockNumber < remoteLastBlockNumber) {
      // sync blocks needed (local is behind)
      console.info(`Local block number is behind remote, syncing...`);
      let txCountToSync = remoteLastBlockNumber - localLastBlockNumber;
      const snapSyncTolerance = 0; // originally 20, but disabled (for a while)
      if (txCountToSync > snapSyncTolerance) {
        // snap sync
        console.debug(
          `Too many (${txCountToSync}) blocks to sync, so try Snap-Sync.`
        );
        // await syncer.snapSync(remoteLastBlockNumber);
        await syncer.applySnapshot(remoteLastBlockNumber); // this is fastest (maybe?)
      } else {
        // full sync
        console.debug(`Syncing ${txCountToSync} blocks with Full-Sync.`);
        await syncer.fullSync(localLastBlockNumber + 1, remoteLastBlockNumber);
      }
    } else if (localLastBlockNumber > remoteLastBlockNumber) {
      // commit blocks needed (local is ahead)
      console.info(`Local block number is ahead remote, waiting...`);
      await syncer.commitTransactions(
        remoteLastBlockNumber + 1,
        localLastBlockNumber
      );
    } else {
      // no sync needed (already synced)
      console.info(
        `Local block number is already synced with remote as ${localLastBlockNumber}`
      );
    }
  }

  /* ------------------------- Internal ------------------------- */
  /**
   * @param topic {string}
   * @param data? {any}
   * @param timeout? {number}
   * @returns {Promise<unknown>}
   */
  async sendSync(topic, data = null, timeout = 3000) {
    return new Promise((resolve, reject) => {
      const reqId = v4();
      const packet = { topic, data, reqId };
      const callback = (data) => {
        let dataStr = JSON.stringify(data);
        if (dataStr.length > 5000) {
          dataStr = dataStr.substring(0, 5000) + "...";
        }
        console.info(
          `${coloredSocket} ${console.wrap(
            `<-${reqIdTag(reqId)}--`,
            console.GREEN
          )} ${console.wrap(topic, console.MAGENTA)}`,
          dataStr
        );
        resolve(data);
      };
      const errorHandler = (err) => {
        console.info(
          `${coloredSocket} ${console.wrap(
            `<-${reqIdTag(reqId)}--`,
            console.RED
          )} ${console.wrap(topic, console.MAGENTA)} ${
            err?.message ?? "unknown error"
          }`
        );
        reject(err);
      };

      let timeoutHandler = setTimeout(() => {
        console.info(
          `${coloredSocket} ${console.wrap(
            `|-${reqIdTag(reqId)}--`,
            console.ORANGE
          )} ${console.wrap(topic, console.MAGENTA)}`
        );
        reject(`Request timeout`);
      }, timeout);

      this.queue[reqId] = { callback, errorHandler, timeoutHandler };

      const packetJson = JSON.stringify(packet);

      try {
        this.socket.send(packetJson);
      } catch (err) {
        console.error(err);
        reject(err);
      }

      console.info(
        `${coloredSocket} ${console.wrap(
          `--${reqIdTag(reqId)}->`,
          console.CYAN
        )} ${console.wrap(topic, console.MAGENTA)}`,
        data
      );
    });
  }

  send(topic, data) {
    if (!this.connected()) {
      console.warn("Socket is not connected, message not sent");
      return;
    }
    const reqId = v4();
    const packet = { topic, data, reqId };
    const packetJson = JSON.stringify(packet);

    try {
      this.socket.send(packetJson);
    } catch (err) {
      console.error(err);
    }

    console.info(
      `${coloredSocket} ${console.wrap(
        `--${reqIdTag(reqId)}->`,
        console.CYAN
      )} ${console.wrap(topic, console.MAGENTA)}`,
      data
    );
  }

  on(topic, callback) {
    const newCallback = (...args) => {
      // console.info(
      //   `${coloredSocket} ${console.wrap(`<-${reqIdTag(reqId)}--`,console.GREEN)} ${console.wrap(topic, console.MAGENTA)} ${data}`
      // );
      return callback(...args);
    };
    if (this.socketHandlers[topic] == null) {
      this.socketHandlers[topic] = [];
    }
    this.socketHandlers[topic].push(newCallback);
    this.socket.on(topic, newCallback);
  }

  off(topic) {
    if (this.socket != null) {
      if (this.socketHandlers[topic] != null) {
        for (const callback of this.socketHandlers[topic]) {
          this.socket.off(topic, callback);
        }
      }
    }
  }

  onMessage(topic, callback) {
    if (this.socket == null) {
      console.warn("Socket is not connected, message couldn't be received");
      return;
    }

    const newCallback = (data) => {
      const success = data?.success;
      const reqId = data?.reqId;

      if (success) {
        console.info(
          `${coloredSocket} ${console.wrap(
            `<-${reqIdTag(reqId)}--`,
            console.GREEN
          )} ${console.wrap(topic, console.MAGENTA)}`,
          data?.data
        );
      } else {
        console.info(
          `${coloredSocket} ${console.wrap(
            `<-${reqIdTag(reqId)}--`,
            console.RED
          )} ${console.wrap(topic, console.MAGENTA)} ${
            data?.err_message ?? "unknown fail error"
          }`
        );
      }

      if (success) {
        return callback(data);
      }
    };

    if (this.messageHandlers == null) this.messageHandlers = {};
    this.messageHandlers[topic] = newCallback;
  }
}

module.exports = WebsocketContext;
