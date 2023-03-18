const PackageJson = require("../../../package.json");
const WebSocket = require("ws");
const Request = require("../core/request");

const appServerEndpoint = PackageJson.config.app_server_endpoint;
const appServerApiVersion = PackageJson.config.app_server_api_version;
const appServerFinalEndpoint = `${appServerEndpoint}/${appServerApiVersion}`;

const appServerSocketEndpoint = PackageJson.config.app_server_socket_endpoint;
const appServerSocketApiVersion = PackageJson.config.app_server_socket_api_version;
const appServerSocketFinalEndpoint = `${appServerSocketEndpoint}/${appServerSocketApiVersion}/ws`;

let socket;

module.exports = async (userId, accessToken, refreshToken, ipc, rootDB, db) => {
  if (userId == null) throw new Error("User ID is required");
  if (accessToken == null) throw new Error("Access token is required");
  if (ipc == null) throw new Error("IPC is required");
  if (socket != null) {
    console.warn("Socket is already connected. Disconnecting previous...");
    socket.disconnect();
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
    let foundLocalUser = false;

    try {
      let users = await rootDB.all(`SELECT * FROM users WHERE uid = ?;`, [userId]);
      if (users.length == 0) throw new Error("User not found");
      let [user] = users;
      foundLocalUser = true;

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

  socket = new WebSocket(appServerSocketFinalEndpoint);

  /* ---------------------------------------- Default ---------------------------------------- */
  console.system(`Websocket connecting to ${appServerSocketFinalEndpoint}`);

  socket.on("connect", () => {
    console.system(console.wrap(`Websocket connected to (${connectUrl})`, console.CYAN));
    resolve(socket);
  });

  socket.on("error", (err) => {
    console.error(`Socket error occurred: ${err}`);
  });

  socket.on("disconnect", (reason) => {
    console.info("Disconnect with socket, reason: " + reason);
  });

  socket.on("connect_failed", (reason) => {
    console.error(`Socket connection failed`);
  });

  return socket;
};
