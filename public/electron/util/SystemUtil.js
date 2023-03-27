const { app } = require("electron");

/**
 * @returns {number}
 */
function getBuildLevel() {
  let isProdMode = process.env.NODE_ENV === "production";
  const isBuildMode = !process.env.ELECTRON_START_URL;

  return isProdMode + isBuildMode;
}

module.exports = {
  getBuildLevel,
};
