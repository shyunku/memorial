import {useEffect, useState} from "react";
import {
  VscChromeClose,
  VscChromeMaximize,
  VscChromeMinimize,
  VscChromeRestore,
  VscGear,
  VscSettingsGear,
  VscSync,
} from "react-icons/vsc";
import IpcSender from "utils/IpcSender";
import "./TopBar.scss";
import PackageJson from "../../package.json";
import {IoLogOutOutline} from "react-icons/io5";
import Prompt from "molecules/Prompt";
import {useDispatch, useSelector} from "react-redux";
import {
  accountInfoSlice,
  removeAccount,
  removeAuth,
} from "store/accountSlice";
import {useNavigate, useOutletContext} from "react-router-dom";
import Toast, {Toaster} from "molecules/Toast";
import JsxUtil from "utils/JsxUtil";
import {applyEmptyState} from "../hooks/UseTransaction";
import {openModal} from "../molecules/Modal";
import {MODAL_TYPES} from "../routers/ModalRouter";

const TopBar = ({addPromise}) => {
  const accountInfo = useSelector(accountInfoSlice);
  const offlineMode = accountInfo.offlineMode;

  const [maximized, setMaximized] = useState(false);
  const isDevelopment = process.env.NODE_ENV === "development";

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

  const openSetting = () => {
    openModal(MODAL_TYPES.SETTINGS, (data) => {
      console.log(`Modal closed with data:`, data);
    });
  };

  useEffect(() => {
    IpcSender.system.isMaximizable(({success, data}) => {
      if (success) {
        setMaximized(data);
      }
    });

    IpcSender.onAll("win_state_changed", ({success, data}) => {
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
    <div
      className={
        "component top-bar" +
        JsxUtil.classByCondition(isDevelopment, "dev-mode")
      }
    >
      <div className="drag-section"></div>
      <div className="title">Memorial - {PackageJson.version}v</div>
      {isDevelopment && <div className="dev-mode-label">개발자 모드</div>}
      <div
        className={
          "server-status" + JsxUtil.classByCondition(offlineMode, "offline")
        }
      >
        <div className="status">{offlineMode ? "오프라인" : "온라인"}</div>
      </div>
      <div className="menu-section">
        <div className="menu-item" onClick={openSetting}>
          <VscSettingsGear/>
        </div>
        {/* <div className="menu-item" onClick={null}>
          <VscGear />
        </div> */}
        <div className="menu-item" onClick={minimize}>
          <VscChromeMinimize/>
        </div>
        <div
          className="menu-item"
          onClick={(e) => (maximized ? unmaximize(e) : maximize(e))}
        >
          {maximized ? <VscChromeRestore/> : <VscChromeMaximize/>}
        </div>
        <div className="menu-item close" onClick={close}>
          <VscChromeClose/>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
