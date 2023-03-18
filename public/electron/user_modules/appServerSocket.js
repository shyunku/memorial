const SocketIoClient = require("socket.io-client");
const PackageJson = require("../../../package.json");
const Request = require("../core/request");

const appServerEndpoint = PackageJson.config.app_server_endpoint;
const appServerApiVersion = PackageJson.config.app_server_api_version;
const appServerFinalEndpoint = `${appServerEndpoint}/${appServerApiVersion}`;

let socket;

module.exports = async (accessToken, refreshToken, ipc) => {
  if (accessToken == null) throw new Error("Access token is required");
  if (ipc == null) throw new Error("IPC is required");
  if (socket != null) throw new Error("Socket is already connected");

  let accessToken_ = accessToken;
  let refreshToken_ = refreshToken;

  try {
    await Request.post(appServerFinalEndpoint, "/token/test", null, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch (err) {
    // if error is 401, then try refresh token
    if (err?.response?.status === 401 && refreshToken != null) {
      try {
        let result = await Request.post(appServerFinalEndpoint, "/auth/refreshToken", null, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-Refresh-Token": refreshToken,
          },
          withCredentials: true,
        });
        let { access_token, refresh_token } = result;
        // update access token & refresh token to ipc
        sender("auth/tokenUpdated", { accessToken: access_token, refreshToken: refresh_token });
      } catch (err) {
        console.log(err.response);
        // refresh failed
        throw new Error(401);
      }
    } else {
      console.log(err?.response?.data);
      throw new Error(err?.response?.status ?? "unknown error");
    }
  }

  socket = SocketIoClient(endpoint, {
    transports: ["websocket"],
    allowUpgrades: false,
  });

  /* ---------------------------------------- Default ---------------------------------------- */
  console.system(`Websocket connecting to ${connectUrl}`);

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
