const PackageJson = require("../../../package.json");
const WebSocket = require("ws");
const Request = require("../core/request");
const { v4 } = require("uuid");
const { reqIdTag } = require("../modules/util");
const { makeTransaction } = require("./transaction");
const { txExecutor } = require("./executeRouter");

const appServerEndpoint = PackageJson.config.app_server_endpoint;
const appServerApiVersion = PackageJson.config.app_server_api_version;
const appServerFinalEndpoint = `${appServerEndpoint}/${appServerApiVersion}`;

const appServerSocketFinalEndpoint = `${appServerFinalEndpoint.replace(/http/g, "ws")}/websocket/connect`;

let socket;

const color = console.RGB(190, 75, 255);
const coloredSocket = console.wrap("Websocket", color);

let queue = {};

function initializeSocket(socket) {
  // initialize previous queue
  for (const reqId in queue) {
    const { callback, timeoutHandler } = queue[reqId];
    clearTimeout(timeoutHandler);
  }

  queue = {};

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
        resolve(data);
      };
      const errorHandler = (err) => {
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
    socket.on(topic, newCalllback);
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

  return {
    emit: wsEmiter,
    on: wsMessageRegister,
    register: wsRegister,
    emitSync: sendSync,
  };
}

const connectSocket = async (userId, accessToken, refreshToken, ipc, rootDB, db, reconnect = false) => {
  if (userId == null) throw new Error("User ID is required");
  if (accessToken == null) throw new Error("Access token is required");
  if (ipc == null) throw new Error("IPC is required");
  if (!reconnect && socket != null) {
    console.warn("Socket is already connected. Disconnecting previous...");
    socket.close(1000, "Reorganize socket connection");
    socket = null;
  }

  const { sender, emiter, getLastBlockNumber, setLastBlockNumber } = ipc;

  let accessToken_ = accessToken;
  let refreshToken_ = refreshToken;

  try {
    await Request.post(appServerFinalEndpoint, "/token/test", null, {
      headers: {
        Authorization: `Bearer ${accessToken_}`,
      },
    });
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
      throw new Error(err?.response?.status ?? "unknown error");
    }
  }

  socket = new WebSocket(appServerSocketFinalEndpoint, {
    headers: {
      Authorization: `Bearer ${accessToken_}`,
    },
  });

  /* ---------------------------------------- Default ---------------------------------------- */
  console.system(`Websocket connecting to ${appServerSocketFinalEndpoint}`);
  const socketCtx = initializeSocket(socket);
  const { emit, emitSync, on, register } = socketCtx;

  const saveBlockAndExecute = async (block) => {
    try {
      let { tx, number, state, prevBlockHash } = block;
      // decode tx.content
      const rawContent = tx.content;
      const decodedBuffer = Buffer.from(rawContent, "base64");
      tx.content = JSON.parse(decodedBuffer.toString("utf-8"));

      // insert block (as transaction) into local db
      await db.run(`INSERT INTO transactions (type, timestamp, content, block_number) VALUES (?, ?, ?, ?);`, [
        tx.type,
        tx.timestamp,
        decodedBuffer,
        number,
      ]);

      txExecutor(db, null, ipc, tx);
      setLastBlockNumber(userId, number);
    } catch (err) {
      console.error(err);
    }
  };

  register("open", async () => {
    console.system(console.wrap(`Websocket connected to (${appServerSocketFinalEndpoint})`, console.CYAN));
    emiter("socket/connected", null, null);
    // emit("test", "Hello world");
    try {
      let waitingBlockNumber = await emitSync("waitingBlockNumber", null, 5000);
      console.info(`Remote Waiting block number`, waitingBlockNumber);

      if (waitingBlockNumber == 1) {
        // this is first commit time
        // initialize server states
        // TODO :: implment this
      }

      let lastBlockNumber = getLastBlockNumber();
      if (lastBlockNumber < waitingBlockNumber - 1) {
        // sync blocks needed (behind)
        console.info(`Local block number is behind remote, syncing...`);
        let result = await emitSync("syncBlocks", {
          start_block_number: lastBlockNumber + 1,
          end_block_number: waitingBlockNumber - 1,
        });
        console.info(`Sync result`, result);
        const blocks = result;
        const sortedBlocks = blocks.sort((a, b) => a.number - b.number);
        for (let block of sortedBlocks) {
          saveBlockAndExecute(block);
        }
      } else if (lastBlockNumber > waitingBlockNumber + 1) {
        // commit blocks needed (ahead)
        console.info(`Local block number is ahead remote, waiting...`);
        let txs = await db.all(`SELECT * FROM transactions WHERE block_number >= ? AND block_number <= ?;`, [
          waitingBlockNumber,
          lastBlockNumber,
        ]);
        let txRequests = txs.map((tx) => {
          return makeTransaction(tx.type, tx.data, tx.block_number);
        });
        let result = await emitSync("waiting", txRequests);
        console.info(`Waiting result`, result);
        // TODO :: implement this
      } else {
        // no sync needed (already synced)
        console.info(`Local block number is already synced with remote`);
      }
    } catch (err) {
      console.error(`Waiting block number error`, err);
    }
  });

  register("error", (err) => {
    console.error(`Socket error occurred`, err);
  });

  register("close", (code) => {
    console.info("Disconnect with socket, reason: " + code);
    emiter("socket/disconnected", null, { code });

    // reconnect?
    // setTimeout(() => {
    //   console.system("Reconnecting to socket...");
    //   try {
    //     connectSocket(userId, accessToken_, refreshToken_, ipc, rootDB, db, true);
    //   } catch (err) {
    //     console.error(err);
    //   }
    // }, 3000);
  });

  on("test", ({ data }) => {
    console.debug(data);
  });

  on("broadcast_transaction", ({ data }) => {
    saveBlockAndExecute(data);
  });

  return socketCtx;
};

module.exports = connectSocket;
