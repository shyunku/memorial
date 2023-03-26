const { v4 } = require("uuid");
const { reqIdTag } = require("../modules/util");
const WebSocket = require("ws");
const Request = require("../core/request");
const {
  Block,
  snapSyncBlocks,
  fullSyncBlocks,
  TransactionRequest,
  rollbackState,
  saveBlockAndExecute,
} = require("../user_modules/executeRouter");

const color = console.RGB(190, 75, 255);
const coloredSocket = console.wrap("Websock", color);

class WebsocketContext {
  /**
   * @param serviceGroup {ServiceGroup}
   */
  constructor(serviceGroup) {
    this.ipcService = serviceGroup.ipcService;
    this.databaseService = serviceGroup.databaseService;
    this.userService = serviceGroup.userService;

    /** @type {WebSocket} */
    this.socket = null;

    this.queue = {};
    this.messageHandlers = {};
    this.alreadyAuthorized = false;

    this.reconnectTimeoutThread = null;
    this.reconnectTimeout = 500;

    for (const reqId in this.queue) {
      const { callback, timeoutHandler } = this.queue[reqId];
      clearTimeout(timeoutHandler);
    }

    this.socket.on("message", (...arg) => {
      try {
        const [buffer, _] = arg;
        let raw = buffer.toString();
        const data = JSON.parse(raw);

        // find handlers
        let handlers = socket.messageHandlers;
        if (handlers != null && data.topic != null) {
          // formalized data
          const reqId = data.reqId;
          if (reqId == null) {
            console.warn(`Request ID not present for message: ${data.topic}`);
            return;
          }

          // find on queue
          const queueItem = queue[reqId];
          if (queueItem != null) {
            clearTimeout(queueItem.timeoutHandler);
            if (data.success) {
              queueItem?.callback(data.data);
            } else {
              queueItem.errorHandler(new Error(data.err_message));
            }

            delete queue[reqId];
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
  }

  /**
   * @param accessToken {string}
   * @param refreshToken {string}
   * @param reconnect {boolean}
   * @returns {Promise<void>}
   */
  async connect(accessToken, refreshToken, reconnect = false) {
    const rootDB = await this.databaseService.getRootDatabaseContext();
    const userId = this.userService.getCurrent();

    if (userId == null) throw new Error("User ID is null");

    if (!reconnect && this.socket != null) {
      clearTimeout(this.reconnectTimeoutThread);
      console.warn("Socket is already connected. Disconnecting previous...");
      this.socket?.unregister("close");
      this.socket.close(1000, "Reorganize socket connection");
      this.socket = null;
    }

    if (reconnect) {
      this.reconnectTimeout = this.reconnectTimeout * 2;
      if (this.reconnectTimeout > 10000) this.reconnectTimeout = 10000;
    } else {
      this.reconnectTimeout = 500;
    }

    if (reconnect === false && this.alreadyAuthorized === true) {
      this.alreadyAuthorized = false;
    }

    let accessToken_ = accessToken;
    let refreshToken_ = refreshToken;

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
        let users = await rootDB.all(`SELECT * FROM users WHERE uid = ?;`, [
          userId,
        ]);
        if (users.length == 0) throw new Error("User not found");
        let [user] = users;

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
            [accessToken_, refreshToken_, userId]
          );

          // update access token & refresh token to ipc
          sender("auth/tokenUpdated", null, true, {
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

    // set self-signed certificate false
    socket = new WebSocket(appServerSocketFinalEndpoint, {
      rejectUnauthorized: false,
      headers: {
        Authorization: `Bearer ${accessToken_}`,
      },
    });

    /* ---------------------------------------- Default ---------------------------------------- */
    alreadyAuthorized = true;
    console.system(`Websocket connecting to ${appServerSocketFinalEndpoint}`);
    const socketCtx = initializeSocket(socket);
    const { emit, emitSync, on, register, unregister } = socketCtx;
    socket.unregister = unregister;

    const getLocalBlockHash = async (blockNumber) => {
      let transactions = await db.all(
        `SELECT * FROM transactions WHERE block_number = ?;`,
        [blockNumber]
      );
      if (transactions.length == 0) return null;
      let [rawTx] = transactions;
      return rawTx.block_hash;
    };

    const getRemoteBlockHash = async (blockNumber) => {
      let blockHash = await emitSync("blockHashByBlockNumber", {
        blockNumber: blockNumber,
      });
      return blockHash;
    };

    const getOldestLocalBlockNumber = async () => {
      let transactions = await db.all(
        `SELECT * FROM transactions ORDER BY block_number ASC LIMIT 1;`
      );
      if (transactions.length == 0) return null;
      let [tx] = transactions;
      return tx.block_number;
    };

    // find max block number that is equal or less than given block number
    const findLeftMostLocalBlockNumber = async (rightBound) => {
      let [rightMost] = await db.all(
        `SELECT * FROM transactions WHERE block_number <= ? ORDER BY block_number DESC LIMIT 1;`,
        [rightBound]
      );
      return rightMost?.block_number ?? null;
    };

    // find min block number that is equal or greater than given block number
    const findRightMostLocalBlockNumber = async (leftBound) => {
      let [leftMost] = await db.all(
        `SELECT * FROM transactions WHERE block_number >= ? ORDER BY block_number ASC LIMIT 1;`,
        [leftBound]
      );
      return leftMost?.block_number ?? null;
    };

    // Mismatch Finding Algorithm (MFA)
    // find mismatched block number with binary search even if local db has missing area (best: O(logN), worst: O(N))
    const findBlockHashMismatchStartNumber = async (left, right) => {
      if (left > right) return null;
      if (left <= 0) return null;

      const mid = Math.floor((left + right) / 2);

      const localBlockHash = await getLocalBlockHash(mid);
      if (localBlockHash != null) {
        // local db has this transaction
        const remoteBlockHash = await getRemoteBlockHash(mid);
        if (localBlockHash === remoteBlockHash)
          return findBlockHashMismatchStartNumber(mid + 1, right);
        return findBlockHashMismatchStartNumber(left, mid - 1);
      }

      // local db has no transaction here... (maybe truncated)
      // ...leftMost, [missing area], rightMost...
      // ...L3, L2, L1, [missing], R1, R2, R3...
      let leftMost = await findLeftMostLocalBlockNumber(mid - 1);
      let rightMost = await findRightMostLocalBlockNumber(mid + 1);

      console.debug(
        `[MFA] No route on ${mid}, split: [~${leftmost}] | [${rightmost}~]`
      );

      // R1 doesn't exists, find just left side
      if (rightMost == null)
        return await findBlockHashMismatchStartNumber(left, leftMost);
      // L1 doesn't exists, find just right side
      if (leftMost == null)
        return await findBlockHashMismatchStartNumber(rightMost, right);

      // check R1 first
      const firstRightMostMismatch = await findBlockHashMismatchStartNumber(
        rightMost,
        rightMost
      );

      // R1 matched in right most (no need to search left side)
      if (firstRightMostMismatch == null)
        return await findBlockHashMismatchStartNumber(left, leftMost);

      // R1 mismatched and leftMost exists, so check left side (worst case)
      let leftsideMismatch = await findBlockHashMismatchStartNumber(
        left,
        leftMost
      );
      return leftsideMismatch ?? rightMost;
    };

    const handleLastRemoteBlock = async (lastRemoteBlock) => {
      const {
        number: remoteLastBlockNumber,
        tx: rawTx,
        hash: lastRemoteBlockHash,
      } = lastRemoteBlock;
      const waitingBlockNumber = remoteLastBlockNumber + 1;

      console.info(`Remote Waiting block number`, waitingBlockNumber);
      setWaitingBlockNumber(userId, waitingBlockNumber);

      // local last block number
      let lastBlockNumber = getLastBlockNumber(userId);
      let oldestLocalBlockNumber = await getOldestLocalBlockNumber();
      let commonChainLastBlockNumber = Math.min(
        lastBlockNumber,
        remoteLastBlockNumber
      );

      if (commonChainLastBlockNumber === 0) {
        const remoteZeroBlockHash = await getRemoteBlockHash(0);
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
      }

      if (commonChainLastBlockNumber > 0) {
        let lastCommonLocalBlockHash = await getLocalBlockHash(
          commonChainLastBlockNumber
        );
        let lastCommonRemoteBlockHash = await getRemoteBlockHash(
          commonChainLastBlockNumber
        );
        if (lastCommonLocalBlockHash !== lastCommonRemoteBlockHash) {
          console.warn(
            `Mismatch block hash detected at ${commonChainLastBlockNumber},` +
              ` local: ${lastCommonLocalBlockHash}, remote: ${lastCommonRemoteBlockHash}`
          );
          // last common mismatch, need to find un-dirty block
          if (oldestLocalBlockNumber == null) {
            throw new Error("Cannot find oldest local block number");
          }

          console.info(
            `finding mismatch start block number in (${oldestLocalBlockNumber} ~ ${commonChainLastBlockNumber}})`
          );
          const mismatchStartBlockNumber =
            await findBlockHashMismatchStartNumber(
              oldestLocalBlockNumber,
              commonChainLastBlockNumber
            );
          if (mismatchStartBlockNumber == null) {
            throw new Error("Cannot find mismatch start block number");
          }
          console.debug({
            mismatchStartBlockNumber,
            commonChainLastBlockNumber,
            lastBlockNumber,
            remoteLastBlockNumber,
          });
          // recover
          sender("system/mismatchTxHashFound", null, true, {
            mismatchStartBlockNumber,
            mismatchEndBlockNumber: commonChainLastBlockNumber,
            lossAfterAccpetTheirs:
              lastBlockNumber >= mismatchStartBlockNumber
                ? lastBlockNumber - mismatchStartBlockNumber + 1
                : 0,
            lossAfterAccpetMine:
              remoteLastBlockNumber >= mismatchStartBlockNumber
                ? remoteLastBlockNumber - mismatchStartBlockNumber + 1
                : 0,
          });
          throw new Error(
            `Mismatch block hash found at block number ${mismatchStartBlockNumber}~${commonChainLastBlockNumber}`
          );
        }
      }

      if (lastBlockNumber < waitingBlockNumber - 1) {
        console.info(`Local block number is behind remote, syncing...`);
        // sync blocks needed (behind)
        let txCountToSync = remoteLastBlockNumber - lastBlockNumber;
        if (txCountToSync > 20) {
          // snap sync
          console.debug(
            `Too many (${txCountToSync}) blocks to sync, so try Snap-Sync.`
          );
          await snapSyncBlocks(lastBlockNumber + 1, remoteLastBlockNumber);
        } else {
          // full sync
          console.debug(`Syncing ${txCountToSync} blocks with Full-Sync.`);
          await fullSyncBlocks(lastBlockNumber + 1, remoteLastBlockNumber);
        }
      } else if (lastBlockNumber > waitingBlockNumber - 1) {
        // commit blocks needed (ahead)
        console.info(`Local block number is ahead remote, waiting...`);
        let txs = await db.all(
          `SELECT * FROM transactions WHERE block_number >= ? AND block_number <= ?;`,
          [waitingBlockNumber, lastBlockNumber]
        );
        let txRequests = txs.map((tx) => {
          const contentBuffer = Buffer.from(tx.content);
          const stringified = contentBuffer.toString("utf-8");
          const parsedContent = JSON.parse(stringified);
          return new TransactionRequest(
            tx.version,
            tx.type,
            tx.timestamp,
            parsedContent,
            tx.block_number,
            tx.block_hash
          );
        });

        try {
          await emitSync("commitTransactions", txRequests);
        } catch (err) {
          console.warn(`Error occured while committing transactions`);
          console.error(err);
        }
      } else {
        // no sync needed (already synced)
        console.info(
          `Local block number is already synced with remote as ${lastBlockNumber}`
        );
      }
    };

    // rollback state
    const handleDeleteTransactionsAfter = async (blockNumber) => {
      try {
        console.info(`Deleting transactions after block number ${blockNumber}`);

        const newLastBlockNumber = blockNumber - 1;
        await rollbackState(
          socketCtx,
          dbCtx,
          db,
          userId,
          ipc,
          newLastBlockNumber,
          setDb
        );
        sender("system/stateRollbacked", null, true);
      } catch (err) {
        console.error(err);
        sender("system/stateRollbacked", null, false);
      }
    };

    register("open", async () => {
      console.system(
        console.wrap(
          `Websocket connected to (${appServerSocketFinalEndpoint})`,
          console.CYAN
        )
      );
      emiter("socket/connected", null, null);
      // emit("test", "Hello world");
      try {
        let lastRemoteBlock = await emitSync("lastRemoteBlock", null, 5000);
        await handleLastRemoteBlock(lastRemoteBlock);
      } catch (err) {
        console.error(`Waiting block number error`, err);
      }
    });

    register("error", (err) => {
      console.error(`Socket error occurred`, err);
      if (err.message.includes("401")) {
        sender("system/socketError", null, true, 401);
        return;
      }
    });

    register("close", (code) => {
      /**
       1000: 정상 종료
       1001: 엔드포인트가 사라짐
       1002: 프로토콜 오류
       1003: 지원하지 않는 데이터
       1004: 예약됨 (사용하지 않음)
       1005: 정의되지 않은 상태 코드 (내부 사용)
       1006: 연결이 비정상적으로 끊김 (내부 사용)
       1007: 데이터 형식이 일치하지 않음
       1008: 정책 위반
       1009: 메시지가 너무 큼
       1010: 클라이언트가 요구한 확장을 서버가 처리할 수 없음
       1011: 예상치 못한 조건으로 인해 서버가 연결을 종료함
       1015: TLS 핸드셰이크 실패 (내부 사용)
       */
      console.warn("Disconnect with socket, reason: " + code);
      emiter("socket/disconnected", null, { code });

      console.info(`Reconnecting socket in ${reconnectTimeout}ms...`);

      // reconnect
      reconnector = setTimeout(() => {
        connectSocket(
          userId,
          accessToken,
          refreshToken,
          ipc,
          rootDB,
          dbCtx,
          db,
          true,
          resolveSocket,
          setDb
        );
      }, reconnectTimeout);
    });

    on("test", ({ data }) => {
      console.debug(data);
    });

    on("broadcast_transaction", ({ data: block }) => {
      saveBlockAndExecute(block);
    });

    on("waiting_block_number", ({ data: waitingBlockNumber }) => {
      setWaitingBlockNumber(userId, waitingBlockNumber);
    });

    on("delete_transaction_after", ({ data: blockNumber }) => {
      handleDeleteTransactionsAfter(blockNumber);
    });

    resolveSocket?.(socketCtx);
  }

  disconnect() {
    if (socket != null) {
      wsUnregister("close");
      socket.close();
      socket = null;
    }

    clearTimeout(reconnector);
  }

  connected() {
    return socket != null && socket.readyState === WebSocket.OPEN;
  }

  async sendSync(topic, data, timeout = 3000) {
    return new Promise((resolve, reject) => {
      if (socket == null) {
        console.warn("Socket is not connected, message not sent");
        reject("Socket is not connected");
        return;
      }

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

      queue[reqId] = { callback, errorHandler, timeoutHandler };

      const stringifiedPacket = JSON.stringify(packet);

      try {
        socket.send(stringifiedPacket);
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
    if (socket == null) {
      console.warn("Socket is not connected, message not sent");
      return;
    }
    const reqId = v4();
    const packet = { topic, data, reqId };
    const stringifiedPacket = JSON.stringify(packet);

    try {
      socket.send(stringifiedPacket);
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
    const newCalllback = (...args) => {
      // console.info(
      //   `${coloredSocket} ${console.wrap(`<-${reqIdTag(reqId)}--`,console.GREEN)} ${console.wrap(topic, console.MAGENTA)} ${data}`
      // );
      return callback(...args);
    };
    if (socketHandlers[topic] == null) socketHandlers[topic] = [];
    socketHandlers[topic].push(newCalllback);
    socket.on(topic, newCalllback);
  }

  off(topic) {
    if (socket != null) {
      if (socketHandlers[topic] != null) {
        for (const callback of socketHandlers[topic]) {
          socket.off(topic, callback);
        }
      }
    }
  }

  onMessage(topic, callback, timeout = null) {
    if (socket == null) {
      console.warn("Socket is not connected, message not sent");
      return;
    }

    const newCalllback = (data) => {
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
    if (socket.messageHandlers == null) socket.messageHandlers = {};
    socket.messageHandlers[topic] = newCalllback;
  }
}

module.exports = WebsocketContext;
