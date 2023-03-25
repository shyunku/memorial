const PackageJson = require("../../../package.json");
const WebSocket = require("ws");
const Request = require("../core/request");
const { v4 } = require("uuid");
const { reqIdTag } = require("../modules/util");
const { txExecutor, makeTransaction, Transaction } = require("./executeRouter");

const appServerEndpoint = PackageJson.config.app_server_endpoint;
const appServerApiVersion = PackageJson.config.app_server_api_version;
const appServerFinalEndpoint = `${appServerEndpoint}/${appServerApiVersion}`;

const appServerSocketFinalEndpoint = `${appServerFinalEndpoint.replace(/http/g, "ws")}/websocket/connect`;

let socket;

const color = console.RGB(190, 75, 255);
const coloredSocket = console.wrap("Websock", color);

let queue = {};
let socketHandlers = {};

function initializeSocket(socket) {
  // initialize previous queue
  for (const reqId in queue) {
    const { callback, timeoutHandler } = queue[reqId];
    clearTimeout(timeoutHandler);
  }

  queue = {};
  socketHandlers = {};

  const sendSync = (topic, data, timeout = 3000) => {
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
          `${coloredSocket} ${console.wrap(`<-[${reqIdTag(reqId)}]--`, console.GREEN)} ${console.wrap(
            topic,
            console.MAGENTA
          )}`,
          dataStr
        );
        resolve(data);
      };
      const errorHandler = (err) => {
        console.info(
          `${coloredSocket} ${console.wrap(`<-[${reqIdTag(reqId)}]--`, console.RED)} ${console.wrap(
            topic,
            console.MAGENTA
          )} ${err?.message ?? "unknown error"}`
        );
        reject(err);
      };

      let timeoutHandler = setTimeout(() => {
        console.info(
          `${coloredSocket} ${console.wrap(`|-${reqIdTag(reqId)}--`, console.ORANGE)} ${console.wrap(
            topic,
            console.MAGENTA
          )}`
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
        `${coloredSocket} ${console.wrap(`--${reqIdTag(reqId)}->`, console.CYAN)} ${console.wrap(
          topic,
          console.MAGENTA
        )}`,
        data
      );
    });
  };

  const wsEmiter = (topic, data) => {
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
      `${coloredSocket} ${console.wrap(`--${reqIdTag(reqId)}->`, console.CYAN)} ${console.wrap(
        topic,
        console.MAGENTA
      )}`,
      data
    );
  };

  // websocket handler
  const wsRegister = (topic, callback) => {
    const newCalllback = (...args) => {
      // console.info(
      //   `${coloredSocket} ${console.wrap(`<-${reqIdTag(reqId)}--`,console.GREEN)} ${console.wrap(topic, console.MAGENTA)} ${data}`
      // );
      return callback(...args);
    };
    if (socketHandlers[topic] == null) socketHandlers[topic] = [];
    socketHandlers[topic].push(newCalllback);
    socket.on(topic, newCalllback);
  };

  const wsUnregister = (topic) => {
    if (socketHandlers[topic] != null) {
      for (const callback of socketHandlers[topic]) {
        socket.off(topic, callback);
      }
    }
  };

  // websocket message handler
  const wsMessageRegister = (topic, callback, timeout = null) => {
    if (socket == null) {
      console.warn("Socket is not connected, message not sent");
      return;
    }

    const newCalllback = (data) => {
      const success = data?.success;
      const reqId = data?.reqId;

      if (success) {
        console.info(
          `${coloredSocket} ${console.wrap(`<-${reqIdTag(reqId)}--`, console.GREEN)} ${console.wrap(
            topic,
            console.MAGENTA
          )}`,
          data?.data
        );
      } else {
        console.info(
          `${coloredSocket} ${console.wrap(`<-${reqIdTag(reqId)}--`, console.RED)} ${console.wrap(
            topic,
            console.MAGENTA
          )} ${data?.err_message ?? "unknown fail error"}`
        );
      }

      if (success) {
        return callback(data);
      }
    };
    if (socket.messageHandlers == null) socket.messageHandlers = {};
    socket.messageHandlers[topic] = newCalllback;
  };

  socket.on("message", (...arg) => {
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

        if (handlers[data.topic] != null && typeof handlers[data.topic] === "function") {
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

  const connected = () => {
    return socket != null && socket.readyState === WebSocket.OPEN;
  };

  return {
    emit: wsEmiter,
    on: wsMessageRegister,
    register: wsRegister,
    unregister: wsUnregister,
    emitSync: sendSync,
    connected,
    socket: socket,
  };
}

let alreadyAuthorized = false;
let reconnectTimeout = 500;

const connectSocket = async (userId, accessToken, refreshToken, ipc, rootDB, db, reconnect = false, resolveSocket) => {
  if (userId == null) throw new Error("User ID is required");
  if (accessToken == null) throw new Error("Access token is required");
  if (ipc == null) throw new Error("IPC is required");
  if (!reconnect && socket != null) {
    console.warn("Socket is already connected. Disconnecting previous...");
    socket?.unregister("close");
    socket.close(1000, "Reorganize socket connection");
    socket = null;
  }

  if (reconnect) {
    reconnectTimeout = reconnectTimeout * 2;
    if (reconnectTimeout > 10000) reconnectTimeout = 10000;
  } else {
    reconnectTimeout = 500;
  }

  if (reconnect === false && alreadyAuthorized === true) {
    alreadyAuthorized = false;
  }

  const { sender, emiter, getLastBlockNumber, setLastBlockNumber, setWaitingBlockNumber } = ipc;

  let accessToken_ = accessToken;
  let refreshToken_ = refreshToken;

  try {
    if (!alreadyAuthorized) {
      await Request.post(appServerFinalEndpoint, "/token/test", null, {
        headers: {
          Authorization: `Bearer ${accessToken_}`,
        },
      });
    }
  } catch (err) {
    try {
      let users = await rootDB.all(`SELECT * FROM users WHERE uid = ?;`, [userId]);
      if (users.length == 0) throw new Error("User not found");
      let [user] = users;

      if (accessToken_ == null) accessToken_ = user.access_token ?? null;
      if (refreshToken_ == null) refreshToken_ = user.refresh_token ?? null;
    } catch (err) {
      console.error(err);
    }

    // if error is 401, then try refresh token
    console.debug(err?.response?.status, err?.response?.data, refreshToken_);
    if (err?.response?.status === 401 && refreshToken_ != null) {
      try {
        let result = await Request.post(appServerFinalEndpoint, "/auth/refreshToken", null, {
          headers: {
            Authorization: `Bearer ${accessToken_}`,
            "X-Refresh-Token": refreshToken_,
          },
          withCredentials: true,
        });
        let { access_token, refresh_token } = result;

        accessToken_ = access_token.token;
        refreshToken_ = refresh_token.token;

        // register updated tokens on local
        await rootDB.run(`UPDATE users SET access_token = ?, refresh_token = ? WHERE uid = ?;`, [
          accessToken_,
          refreshToken_,
          userId,
        ]);

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

  socket = new WebSocket(appServerSocketFinalEndpoint, {
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

  const saveBlockAndExecute = async (block) => {
    try {
      let { tx: rawTx, number } = block;
      const tx = new Transaction(rawTx.version, rawTx.type, rawTx.timestamp, rawTx.content, number);
      await txExecutor(db, null, ipc, tx);
      setLastBlockNumber(userId, number);
    } catch (err) {
      throw err;
    }
  };

  const getLocalTxHash = async (blockNumber) => {
    let transactions = await db.all(`SELECT * FROM transactions WHERE block_number = ?;`, [blockNumber]);
    if (transactions.length == 0) return null;
    let [rawTx] = transactions;
    const contentBuffer = Buffer.from(rawTx.content);
    const stringified = contentBuffer.toString("utf-8");
    const parsedContent = JSON.parse(stringified);
    const tx = new Transaction(rawTx.version, rawTx.type, rawTx.timestamp, parsedContent, blockNumber);
    return tx.hash;
  };

  const getOldestLocalBlockNumber = async () => {
    let transactions = await db.all(`SELECT * FROM transactions ORDER BY block_number ASC LIMIT 1;`);
    if (transactions.length == 0) return null;
    let [tx] = transactions;
    return tx.block_number;
  };

  const findTxHashMismatchStartNumber = async (start, end) => {
    let left = start;
    let right = end;
    let mismatchStart = null;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const localTxHash = await getLocalTxHash(mid);
      const remoteTxHash = await emitSync("txHashByBlockNumber", {
        blockNumber: mid,
      });

      if (localTxHash == null) {
        // local db has no transaction here... (maybe truncated)
        // so, we can't find mismatch start number
        return null;
      }

      if (localTxHash === remoteTxHash) {
        left = mid + 1;
      } else {
        mismatchStart = mid;
        right = mid - 1;
      }
    }

    return mismatchStart;
  };

  const handleLastRemoteBlock = async (lastRemoteBlock) => {
    const { number: remoteLastBlockNumber, tx: rawTx } = lastRemoteBlock;
    const waitingBlockNumber = remoteLastBlockNumber + 1;

    console.info(`Remote Waiting block number`, waitingBlockNumber);
    setWaitingBlockNumber(userId, waitingBlockNumber);

    // local last block number
    let lastBlockNumber = getLastBlockNumber(userId);
    let oldestLocalBlockNumber = await getOldestLocalBlockNumber();
    let commonChainLastBlockNumber = Math.min(lastBlockNumber, remoteLastBlockNumber);

    if (commonChainLastBlockNumber > 0) {
      let lastCommonLocalTxHash = await getLocalTxHash(commonChainLastBlockNumber);
      let lastCommonRemoteTxHash = await emitSync("txHashByBlockNumber", {
        blockNumber: commonChainLastBlockNumber,
      });
      if (lastCommonLocalTxHash !== lastCommonRemoteTxHash) {
        console.warn(
          `Mismatch transaction hash detected at ${commonChainLastBlockNumber}, finding mismatch start block number...`
        );
        // last common mismatch, need to find un-dirty block
        if (oldestLocalBlockNumber == null) {
          throw new Error("Cannot find oldest local block number");
        }

        const mismatchStartBlockNumber = await findTxHashMismatchStartNumber(
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
            lastBlockNumber >= mismatchStartBlockNumber ? lastBlockNumber - mismatchStartBlockNumber + 1 : 0,
          lossAfterAccpetMine:
            remoteLastBlockNumber >= mismatchStartBlockNumber
              ? remoteLastBlockNumber - mismatchStartBlockNumber + 1
              : 0,
        });
        throw new Error(
          `Mismatch tx hash found at block number ${mismatchStartBlockNumber}~${commonChainLastBlockNumber}`
        );
      }
    }

    if (lastBlockNumber < waitingBlockNumber - 1) {
      // sync blocks needed (behind)
      // TODO :: if behind blocks are too much, then sync recent 1 block and save state.
      let txCountToSync = remoteLastBlockNumber - lastBlockNumber;

      if (txCountToSync > 10) {
        // TODO :: implement this
        // consider mismatch finding algorithm is tracking from oldest block
        // so, if you just sync recent 1 block, you can't find mismatch start block number in some cases
      }

      console.info(`Local block number is behind remote, syncing...`);
      let result = await emitSync("syncBlocks", {
        startBlockNumber: lastBlockNumber + 1,
        endBlockNumber: remoteLastBlockNumber,
      });

      const blocks = result;
      const sortedBlocks = blocks.sort((a, b) => a.number - b.number);
      let syncingLastBlock = null;
      try {
        for (let block of sortedBlocks) {
          syncingLastBlock = block.number;
          await saveBlockAndExecute(block);
        }
      } catch (err) {
        console.warn(`Error occured while syncing blocks, error occured at block number ${syncingLastBlock}`);
        console.error(err);
      }
    } else if (lastBlockNumber > waitingBlockNumber - 1) {
      // commit blocks needed (ahead)
      console.info(`Local block number is ahead remote, waiting...`);
      let txs = await db.all(`SELECT * FROM transactions WHERE block_number >= ? AND block_number <= ?;`, [
        waitingBlockNumber,
        lastBlockNumber,
      ]);
      let txRequests = txs.map((tx) => {
        const contentBuffer = Buffer.from(tx.content);
        const stringified = contentBuffer.toString("utf-8");
        const parsedContent = JSON.parse(stringified);
        return new Transaction(tx.version, tx.type, tx.timestamp, parsedContent, tx.block_number);
      });

      try {
        await emitSync("commitTransactions", txRequests);
      } catch (err) {
        console.warn(`Error occured while committing transactions`);
        console.error(err);
      }
    } else {
      // no sync needed (already synced)
      console.info(`Local block number is already synced with remote as ${lastBlockNumber}`);
    }
  };

  const handleDeleteTransactionsAfter = async (blockNumber) => {
    console.info(`Deleting transactions after block number ${blockNumber}`);
    await db.run(`DELETE FROM transactions WHERE block_number > ?;`, [blockNumber]);
    sender("system/stateRollbacked", null, true);
  };

  register("open", async () => {
    console.system(console.wrap(`Websocket connected to (${appServerSocketFinalEndpoint})`, console.CYAN));
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
    console.log(err.error);
    console.log(err.message);
    console.log(err.type);

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
    setTimeout(() => {
      connectSocket(userId, accessToken, refreshToken, ipc, rootDB, db, true, resolveSocket);
    }, reconnectTimeout);
  });

  on("test", ({ data }) => {
    console.debug(data);
  });

  on("broadcast_transaction", ({ data }) => {
    saveBlockAndExecute(data);
  });

  on("waiting_block_number", ({ data: waitingBlockNumber }) => {
    setWaitingBlockNumber(userId, waitingBlockNumber);
  });

  on("delete_transaction_after", ({ data: blockNumber }) => {
    handleDeleteTransactionsAfter(blockNumber);
  });

  resolveSocket?.(socketCtx);
};

module.exports = connectSocket;
