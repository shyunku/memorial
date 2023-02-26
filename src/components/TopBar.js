import { useEffect, useState } from "react";
import { VscChromeClose, VscChromeMaximize, VscChromeMinimize, VscChromeRestore, VscGear } from "react-icons/vsc";
import IpcSender from "utils/IpcSender";
import "./TopBar.scss";

const TopBar = () => {
  const [maximized, setMaximized] = useState(false);

  const minimize = () => {
    IpcSender.system.minimizeWindow();
  };

  const maximize = () => {
    IpcSender.system.maximizeWindow();
  };

  const unmaximize = () => {
    IpcSender.system.restoreWindow();
  };

  const close = () => {
    IpcSender.system.closeWindow();
  };

  useEffect(() => {
    IpcSender.system.isMaximizable(({ success, data }) => {
      if (success) {
        setMaximized(data);
      }
    });

    IpcSender.onAll("win_state_changed", ({ success, data }) => {
      if (success) {
        switch (data) {
          case "maximize":
            setMaximized(true);
            break;
          case "unmaximize":
            setMaximized(false);
            break;
        }
      }
    });
  }, []);

  return (
    <div className="component top-bar">
      <div className="drag-section"></div>
      <div className="title">Memorial</div>
      <div className="menu-section">
        <div className="menu-item" onClick={null}>
          <VscGear />
        </div>
        <div className="menu-item" onClick={minimize}>
          <VscChromeMinimize />
        </div>
        <div className="menu-item" onClick={(e) => (maximized ? unmaximize(e) : maximize(e))}>
          {maximized ? <VscChromeRestore /> : <VscChromeMaximize />}
        </div>
        <div className="menu-item close" onClick={close}>
          <VscChromeClose />
        </div>
      </div>
    </div>
  );
};

export default TopBar;
