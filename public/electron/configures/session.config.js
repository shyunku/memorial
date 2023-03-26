const { session } = require("electron");

/**
 * @param s {SessionService}
 */
module.exports = function (s) {
  // const filter = {
  //   urls: ["*"],
  // };
  // session
  //   .fromPartition("<partition_name>")
  //   .webRequest.onBeforeRedirect(filter, (details) => {
  //     console.debug(details);
  //   });
  // session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
  //   details.requestHeaders["User-Agent"] = "Chrome";
  //   callback({ cancel: false, requestHeaders: details.requestHeaders });
  // });
};
