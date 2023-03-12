import { useEffect, useState } from "react";
import { VscChromeClose, VscChromeMaximize, VscChromeMinimize, VscChromeRestore, VscGear } from "react-icons/vsc";
import IpcSender from "utils/IpcSender";
import "./LoginTopBar.scss";

const LoginTopBar = () => {
  const minimize = () => {
    IpcSender.system.minimizeWindow();
  };

  const close = () => {
    IpcSender.system.closeWindow();
  };

  return (
    <div className="login-top-bar">
      <div className="menu-bar">
        <div className="menu-section">
          <div className="menu-item" onClick={minimize}>
            <VscChromeMinimize />
          </div>
          <div className="menu-item close" onClick={close}>
            <VscChromeClose />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginTopBar;
