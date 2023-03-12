import { useEffect, useState } from "react";
import { VscChromeClose, VscChromeMaximize, VscChromeMinimize, VscChromeRestore, VscGear } from "react-icons/vsc";
import IpcSender from "utils/IpcSender";
import "./TopBar.scss";
import PackageJson from "../../package.json";
import { IoLogOutOutline } from "react-icons/io5";
import Prompt from "molecules/Prompt";
import { useDispatch } from "react-redux";
import { removeAccount, removeAuth } from "store/accountSlice";
import { useNavigate } from "react-router-dom";

const TopBar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
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

  const logout = () => {
    Prompt.float("로그아웃", "정말 로그아웃 하시겠습니까?", {
      confirmText: "로그아웃",
      cancelText: "취소",
      onConfirm: () => {
        dispatch(removeAuth());
        dispatch(removeAccount());
        navigate("/login");
      },
      onCancel: () => {},
    });
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
      <div className="title">Memorial - {PackageJson.version}v</div>
      <div className="menu-section">
        <div className="menu-item" onClick={logout}>
          <IoLogOutOutline />
        </div>
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
