import Modal from "../molecules/Modal";
import "./Settings.modal.scss";
import {
  IoCog,
  IoInformationCircle,
  IoLogoBuffer,
  IoPersonSharp,
} from "react-icons/io5";
import { useRef, useState } from "react";
import JsxUtil from "../utils/JsxUtil";
import SettingInfo from "./settings/Info.settings";
import { MdOutlineDashboardCustomize } from "react-icons/md";
import SettingCommon from "./settings/Common.settings";
import SettingData from "./settings/Data.settings";
import SettingAccount from "./settings/Account.settings";

const SETTING_MENU = {
  GENERAL: {
    key: "일반",
    icon: <IoCog />,
    page: (props) => <SettingCommon {...props} />,
  },
  DATA: {
    key: "데이터",
    icon: <IoLogoBuffer />,
    page: (props) => <SettingData {...props} />,
  },
  CUSTOM: {
    key: "사용자 맞춤",
    icon: <MdOutlineDashboardCustomize />,
    page: (props) => <div></div>,
  },
  ACCOUNT: {
    key: "계정",
    icon: <IoPersonSharp />,
    page: (props) => <SettingAccount {...props} />,
  },
  ABOUT: {
    key: "정보",
    icon: <IoInformationCircle />,
    page: (props) => <SettingInfo {...props} />,
  },
};

const SettingsModal = ({ ...props }) => {
  const [activeMenu, setActiveMenu] = useState("GENERAL");

  const modalRef = useRef(null);

  const onClose = () => {
    return 1234;
  };

  return (
    <Modal {...props} onClose={onClose} className={"settings"} ref={modalRef}>
      <div className={"title"}>환경설정</div>
      <div className={"content"}>
        <div className={"menu"}>
          {Object.keys(SETTING_MENU).map((menuKey) => {
            const menu = SETTING_MENU[menuKey];
            return (
              <div
                key={menu.key}
                className={
                  "menu-item" +
                  JsxUtil.classByEqual(activeMenu, menuKey, "selected")
                }
                onClick={() => setActiveMenu(menuKey)}
              >
                <div className={"icon"}>{menu.icon}</div>
                <div className={"label"}>{menu.key}</div>
              </div>
            );
          })}
        </div>
        <div className={"menu-content"}>
          {SETTING_MENU[activeMenu]?.page?.({ modalRef }) ?? (
            <div>페이지가 없습니다.</div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;
