const { notarize } = require("electron-notarize");
const dotenv = require("dotenv");
const path = require("path");
const PackageJson = require("../../../package.json");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

module.exports = async function _notarize(context) {
  const { electronPlatformName, appOutDir } = context;

  if (electronPlatformName !== "darwin") {
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  return await notarize({
    appBundleId: PackageJson.build.appId,
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_PW,
    ascProvider: process.env.APPLE_TEAM_ID,
  });
};
