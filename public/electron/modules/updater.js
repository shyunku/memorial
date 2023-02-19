const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const StreamProgress = require("progress-stream");

const dmg = require("./dmg");
const Request = require("../core/request");
const PackageJson = require("../../../package.json");
const VersionComparator = require("compare-versions");
const ArchCategory = require("../objects/ArchCategory.constants");
const ChildProcess = require("child_process");
const ArchCategoryConstants = require("../objects/ArchCategory.constants");

let Ipc;
const serverHost = process.env.REACT_APP_SERVER_HOST;

const UPDATER_RESULT_FLAG = {
  NEW_VERSION_FOUND: 0,
  ALREADY_LATEST: 1,
  UPDATE_CHECK_FAIL: 2,
};

function getFileExtensionByCategory(category) {
  switch (category) {
    case ArchCategory.Windows:
      return ".exe";
    case ArchCategory.MacOS:
      return ".dmg";
    default:
      throw new Error(`Category '${category}' not supported for get file extension.`);
  }
}

async function checkForUpdates(category) {
  try {
    const currentClientVersion = PackageJson.version;
    const latestVersionResult = await Request.get(
      serverHost,
      `/default/latest-version?exclude_beta=${!PackageJson.enableBetaUpdate}&only_verified=true&category=${category}`
    );

    if (latestVersionResult.code === Request.ok) {
      const latestVersionInfo = latestVersionResult.data;
      const latestVersion = latestVersionInfo.version;
      const isLatestBeta = latestVersion.beta;

      console.info(`Latest version fetched: ${currentClientVersion} -> ${latestVersion} ?`);

      const updateNeeded = VersionComparator.compare(currentClientVersion, latestVersion, "<");
      console.info(updateNeeded ? "Update needed." : "Already latest version.");

      if (updateNeeded) {
        return {
          result: UPDATER_RESULT_FLAG.NEW_VERSION_FOUND,
          data: {
            version: latestVersion,
            isBeta: isLatestBeta,
          },
        };
      } else {
        Ipc.silentSender("release_download@skip", true, null);
        return {
          result: UPDATER_RESULT_FLAG.ALREADY_LATEST,
          data: null,
        };
      }
    }
  } catch (err) {
    console.error(err);

    return {
      result: UPDATER_RESULT_FLAG.UPDATE_CHECK_FAIL,
      data: err,
    };
  }
}

async function updateToNewVersion(osCategory, userDataPath, version) {
  try {
    const releaseDirPath = path.resolve(userDataPath, "releases");
    const downloadPath = path.resolve(releaseDirPath, version);
    const fileExtension = getFileExtensionByCategory(osCategory);
    const downloadFilepath = path.resolve(downloadPath, `${version}${fileExtension}`);

    if (!fs.existsSync(releaseDirPath)) {
      console.warn(`Releases directory doesn't exists, newly create.`);
      fs.mkdirSync(releaseDirPath);
    }

    if (!fs.existsSync(downloadPath)) {
      console.warn(`Releases/${version} directory doesn't exists, newly create.`);
      fs.mkdirSync(downloadPath);
    }

    console.info(`Download destination path: ${downloadFilepath}`);

    const writeStream = fs.createWriteStream(downloadFilepath);
    const response = await axios({
      method: "GET",
      url: `${serverHost}/default/release?version=${version}&category=${osCategory}`,
      responseType: "stream",
    });

    return new Promise((resolve, reject) => {
      const filesize = response.headers["content-length"];
      const progressInterceptor = StreamProgress({ time: 10, length: filesize });
      progressInterceptor.on("progress", (progress) => {
        Ipc.silentSender("release_download@state", true, progress);
      });

      Ipc.silentSender("release_download@initial", true, version);

      const fileStream = response.data;

      let errorCount = 0;
      fileStream.pipe(progressInterceptor).pipe(writeStream);

      writeStream.on("error", (err) => {
        writeStream.close();
        errorCount++;
        reject(err);
      });

      writeStream.on("close", () => {
        console.info(`${errorCount} errors occurred while file download.`);
        Ipc.silentSender("release_download@done", true, null);

        if (errorCount === 0) {
          resolve(downloadFilepath);
        }
      });
    });
  } catch (err) {
    console.error(err);
  }
}

async function installNewVersion(osCategory, userDataPath, installerPath) {
  if (fs.existsSync(installerPath)) {
    switch (osCategory) {
      case ArchCategoryConstants.Windows:
        ChildProcess.spawn(installerPath, { detached: true });
        return false;
      case ArchCategoryConstants.MacOS:
        console.debug(`Mounting dmg file...`);
        Ipc.silentSender("release_install@state", true, "mounting");
        const mountPath = await dmg.mountSync(installerPath);

        const appName = "Memorial.app";
        const mountedAppPath = path.resolve(mountPath, appName);
        const applicationDestFolder = `/Applications/${appName}`;

        console.debug(`Copying to application folder...`);
        Ipc.silentSender("release_install@state", true, "copying");
        process.noAsar = true;
        fs.copySync(mountedAppPath, applicationDestFolder, {
          overwrite: true,
          recursive: true,
          dereference: true,
        });

        console.debug(`Unmounting dmg file...`);
        Ipc.silentSender("release_install@state", true, "unmounting");
        await dmg.unmountSync(installerPath);

        return true;
      default:
        throw new Error(`Can't find arch named '${osCategory}'.`);
    }
  } else {
    throw new Error(`Can't find installer on destination path: ${installerPath}`);
  }
}

module.exports = {
  setIpc: (_Ipc) => {
    Ipc = _Ipc;
  },
  checkForUpdates,
  updateToNewVersion,
  installNewVersion,
  UPDATER_RESULT_FLAG,
};
