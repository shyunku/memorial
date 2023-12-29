const __console__ = require("./console");
const __array__ = require("./array");
const remoteMain = require("@electron/remote/main");
const dotenv = require("dotenv");
const path = require("path");
const logger = require("./logger");

module.exports = {
  all: (isBuildMode, appDataPath) => {
    logger.initialize(isBuildMode, appDataPath);
    __console__();
    __array__();
    remoteMain.initialize();
    dotenv.config({ path: path.resolve(__dirname, "../.env") });

    return {};
  },
};
