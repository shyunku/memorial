// TODO :: refactor this file
// to make this as service class

const SocketIoClient = require("socket.io-client");
const util = require("./../modules/util");
const CompareVersion = require("compare-versions");
const PackageJson = require("../../../package.json");

let Ipc;
const connectUrl = process.env.REACT_APP_SERVER_URL;

// send authentication refresh signal
/* ---------------------------------------- Pre-Execution ---------------------------------------- */
let socket = SocketIoClient(connectUrl, {
  transports: ["websocket"],
  allowUpgrades: false,
});

util.registerSocketLogger(socket, console.bCYAN + console.BLACK);

socket.token = null;
socket.email = null;

/* ---------------------------------------- Default ---------------------------------------- */
console.system(`Websocket connecting to ${connectUrl}`);

socket.on("connect", () => {
  console.system(
    console.wrap(`Websocket connected to (${connectUrl})`, console.CYAN)
  );
  if (socket.token && socket.email) {
    // auto reconnect with authentication
    let { email, token } = socket;
    socket.emit("authen", { email, token });
  }
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

/* ---------------------------------------- System ---------------------------------------- */
socket.on("alert:/version/new", (data) => {
  const { version } = data.data;
  const currentVersion = PackageJson.version;

  const newVersionValid = CompareVersion.validate(version);
  const curVersionValid = CompareVersion.validate(currentVersion);

  if (!newVersionValid) {
    console.error(`New version is not valid: ${version}`);
    return;
  }

  if (!curVersionValid) {
    console.error(`Current version is not valid: ${currentVersion}`);
    return;
  }

  const isHigher = CompareVersion.compare(version, currentVersion, ">");
  if (isHigher) {
    Ipc.fastSender("alert:/version/new", data);
  }
});

/* ---------------------------------------- Custom ---------------------------------------- */

module.exports = {
  socket,
  setIpc: (Ipc_) => {
    Ipc = Ipc_;
  },
};
