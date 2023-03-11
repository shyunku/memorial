const { session, protocol } = require("electron");

const filter = {
  urls: ["*://*/login_callback*"],
};

function initialize() {
  session.fromPartition("persist:google-oauth-view").webRequest.onBeforeRedirect(filter, (details) => {
    console.debug(details);
  });

  session.fromPartition("persist:google-oauth-view").webRequest.onCompleted(filter, (details) => {
    console.debug(details);
  });

  session.fromPartition("persist:google-oauth-view").webRequest.onHeadersReceived(filter, (details) => {
    console.debug(details);
  });

  session.fromPartition("persist:google-oauth-view").webRequest.onBeforeRequest(filter, (details) => {
    console.debug(details);
  });

  session.fromPartition("persist:google-oauth-view").webRequest.onErrorOccurred(filter, (details) => {
    console.debug(details);
  });

  session.fromPartition("persist:google-oauth-view").webRequest.onSendHeaders(filter, (details) => {
    console.debug(details);
  });

  session.fromPartition("persist:google-oauth-view").cookies.on("changed", (event, cookie, cause, removed) => {
    console.debug(cookie, cause, removed);
    console.log(session.fromPartition("persist:google-oauth-view").cookies);
  });

  //   protocol.interceptHttpProtocol("http", (request, callback) => {
  //     // Check if the request has been intercepted before
  //     if (request.intercepted) {
  //       // If the request has been intercepted before, call the default callback function with the original request
  //       callback(request);
  //     } else {
  //       console.log(request);
  //       // If the request has not been intercepted before, mark the request as intercepted and continue processing the request
  //       request.intercepted = true;
  //       callback();
  //     }
  //   });
}

module.exports = {
  initialize,
};
