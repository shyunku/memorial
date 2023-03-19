const PackageJson = require("../../../package.json");
const WebSocket = require("ws");
const Request = require("../core/request");
const { v4 } = require("uuid");
const { reqIdTag } = require("../modules/util");

const appServerEndpoint = PackageJson.config.app_server_endpoint;
const appServerApiVersion = PackageJson.config.app_server_api_version;
const appServerFinalEndpoint = `${appServerEndpoint}/${appServerApiVersion}`;

const appServerSocketFinalEndpoint = `${appServerFinalEndpoint.replace(/http/g, "ws")}/websocket/connect`;

let socket;

const color = console.RGB(160, 60, 255);
const coloredSocket = console.wrap("Websocket", color);

class WebsocketServerResponse {
  constructor(topic, success, requestId, data, errMessage) {
    this.topic = topic;
    this.success = success;
    this.requestId = requestId;
    this.data = data;
    this.errMessage = errMessage;
  }
}

function initializeSocket(socket) {
  const queue = {};

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

      let timeoutHandler = setTimeout(() => {
        console.info(
          `${coloredSocket} ${console.wrap(`|-${reqIdTag(reqId)}--`, console.ORANGE)} ${console.wrap(
            topic,
            console.MAGENTA
          )}`
        );
        reject(`Request timeout`);
      }, timeout);

      queue[reqId] = { callback, timeoutHandler };

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
        )} ${data}`
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
          clearTimeout(queueItem.timeout);
          queueItem?.callback(data);
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

  return { emit: wsEmiter, on: wsMessageRegister, register: wsRegister, emitSync: sendSync };
}

module.exports = async (userId, accessToken, refreshToken, ipc, rootDB, db) => {
  if (userId == null) throw new Error("User ID is required");
  if (accessToken == null) throw new Error("Access token is required");
  if (ipc == null) throw new Error("IPC is required");
  if (socket != null) {
    console.warn("Socket is already connected. Disconnecting previous...");
    socket.close(1000, "Reorganize socket connection");
    socket = null;
  }

  const { sender } = ipc;

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
    console.debug(err?.response?.status, refreshToken_);
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
        sender("auth/tokenUpdated", null, true, { accessToken: accessToken_, refreshToken: refreshToken_ });
      } catch (err) {
        console.debug(err);
        console.debug(err.response);
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
  const { emit, emitSync, on, register } = initializeSocket(socket);

  register("open", () => {
    console.system(console.wrap(`Websocket connected to (${appServerSocketFinalEndpoint})`, console.CYAN));
    emit("test", "Hello world");
  });

  register("error", (err) => {
    console.error(`Socket error occurred`, err);
  });

  register("close", (code) => {
    console.info("Disconnect with socket, reason: " + code);
  });

  on("test", ({ data }) => {
    console.debug(data);
  });

  return socket;
};
