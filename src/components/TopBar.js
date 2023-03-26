import { useEffect, useState } from "react";
import {
  VscChromeClose,
  VscChromeMaximize,
  VscChromeMinimize,
  VscChromeRestore,
  VscGear,
  VscSync,
} from "react-icons/vsc";
import IpcSender from "utils/IpcSender";
import "./TopBar.scss";
import PackageJson from "../../package.json";
import { IoLogOutOutline } from "react-icons/io5";
import Prompt from "molecules/Prompt";
import { useDispatch, useSelector } from "react-redux";
import { accountInfoSlice, removeAccount, removeAuth } from "store/accountSlice";
import { useNavigate } from "react-router-dom";
import Toast, { Toaster } from "molecules/Toast";
import JsxUtil from "utils/JsxUtil";

const TopBar = () => {
  const accountInfo = useSelector(accountInfoSlice);
  const offlineMode = accountInfo.offlineMode;

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
      onConfirm: async () => {
        try {
          await IpcSender.req.auth.deleteAuthInfoSync(accountInfo?.uid);
          dispatch(removeAuth());
          dispatch(removeAccount());
          navigate("/login");
        } catch (err) {
          console.log(err);
          Toast.error("인증 정보 삭제에 실패했습니다. 다시 시도해주세요.");
        }
      },
      onCancel: () => {},
    });
  };

  const initialize = () => {
    Prompt.float(
      "데이터 초기화",
      "정말 초기화하시겠습니까?\n\n" + "모든 데이터가 기기에서 삭제되며, 이후 서버로부터 로드됩니다.",
      {
        confirmText: "초기화 및 동기화",
        onConfirm: async () => {
          IpcSender.req.system.initializeState(({ success, data }) => {
            if (success) {
              Prompt.float("데이터 초기화", "데이터 초기화가 완료되었습니다.\n페이지를 새로고침합니다.", {
                confirmText: "확인",
                onConfirm: () => {
                  // refresh
                  window.location.reload();
                },
                ignorable: false,
              });
            }
          });
        },
        onCancel: () => {},
      }
    );
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
      <div className={"server-status" + JsxUtil.classByCondition(offlineMode, "offline")}>
        <div className="status">{offlineMode ? "오프라인" : "온라인"} 모드</div>
      </div>
      <div className="menu-section">
        <div className="menu-item" onClick={logout}>
          <IoLogOutOutline />
        </div>
        <div className="menu-item" onClick={initialize}>
          <VscSync />
        </div>
        {/* <div className="menu-item" onClick={null}>
          <VscGear />
        </div> */}
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
