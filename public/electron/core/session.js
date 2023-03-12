const { session, protocol, shell } = require("electron");

const filter = {
  urls: ["*"],
};

function initialize() {
  // session.fromPartition("<partition_name>").webRequest.onBeforeRedirect(filter, (details) => {
  //   console.debug(details);
  // });
  // session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
  //   details.requestHeaders["User-Agent"] = "Chrome";
  //   callback({ cancel: false, requestHeaders: details.requestHeaders });
  // });
}

module.exports = {
  initialize,
};
