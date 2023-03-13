const SocketIoClient = require("socket.io-client");

module.exports = (endpoint) => {
  let socket = SocketIoClient(endpoint, {
    transports: ["websocket"],
    allowUpgrades: false,
  });

  /* ---------------------------------------- Default ---------------------------------------- */
  console.system(`Websocket connecting to ${connectUrl}`);

  socket.on("connect", () => {
    console.system(console.wrap(`Websocket connected to (${connectUrl})`, console.CYAN));
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
};
