import React, { useEffect } from "react";
import "./UpdateChecker.scss";
import IpcSender from "../utils/IpcSender";
import { shortenSize } from "../utils/Common";
import { FlippingSquare } from "react-cssfx-loading";

const STATE_LABEL = {
  initial: `Checking for update...`,
  downloading: `Downloading updates...`,
  done: `Download done`,
  skip: `Getting start...`,
  "initial-remove": `Removing old files...`,
  mounting: `Mounting packages...`,
  copying: `Copying to Applications...`,
  removing: `Finalizing...`,
};

const UpdateChecker = () => {
  const [state, setState] = React.useState("initial");
  const [current, setCurrent] = React.useState(null);

  const label = STATE_LABEL[state];

  useEffect(() => {
    IpcSender.onAll("release_download@initial", (data) => {
      console.log(data);
    });

    IpcSender.onAll("release_download@state", ({ data }) => {
      setState("downloading");
      setCurrent(data);
    });

    IpcSender.onAll("release_download@done", (data) => {
      setState("done");
      setCurrent(null);
    });

    IpcSender.onAll("release_download@skip", (data) => {
      setState("skip");
    });

    IpcSender.onAll("release_install@state", ({ success, data: msg }) => {
      setState(msg);
      setCurrent(null);
    });

    return () => {
      IpcSender.offAll("release_download@initial");
      IpcSender.offAll("release_download@state");
      IpcSender.offAll("release_download@done");
      IpcSender.offAll("release_download@skip");
      IpcSender.offAll("release_install@state");
    };
  }, []);

  return (
    <div className="updater">
      <div className="content-wrapper">
        <div className="hyperlink">Memorial</div>
        <div className="loading">
          <FlippingSquare />
        </div>
        <div className="text">{label}</div>
        {current && (
          <>
            <div className="percentage">{current?.percentage?.toFixed(2)}%</div>
            <div
              className="loading-bar"
              style={{ visibility: current ? "visible" : "hidden" }}
            >
              <div
                className="filler"
                style={{ width: `${current?.percentage ?? 0}%` }}
              ></div>
              <div className="state">
                {shortenSize(current?.transferred, 1)} /{" "}
                {shortenSize(current?.length, 1)}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UpdateChecker;
