import Modal from "../molecules/Modal";
import "./Settings.modal.scss";
import {
  IoCog,
  IoInformationCircle,
  IoLogoBuffer,
  IoPersonSharp,
} from "react-icons/io5";
import { useState } from "react";
import JsxUtil from "../utils/JsxUtil";
import SettingInfo from "./settings/Info.settings";
import { MdOutlineDashboardCustomize } from "react-icons/md";
import SettingCommon from "./settings/Common.settings";

const SETTING_MENU = {
  GENERAL: { key: "일반", icon: <IoCog />, page: <SettingCommon /> },
  DATA: { key: "데이터", icon: <IoLogoBuffer />, page: <div>데이터</div> },
  CUSTOM: {
    key: "사용자 맞춤",
    icon: <MdOutlineDashboardCustomize />,
    page: <div>사용자 맞춤</div>,
  },
  ACCOUNT: { key: "계정", icon: <IoPersonSharp />, page: <div>계정</div> },
  ABOUT: { key: "정보", icon: <IoInformationCircle />, page: <SettingInfo /> },
};

const SettingsModal = ({ ...props }) => {
  const [activeMenu, setActiveMenu] = useState("GENERAL");

  const onClose = () => {
    return 1234;
  };

  return (
    <Modal {...props} onClose={onClose} className={"settings"}>
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
          {SETTING_MENU[activeMenu]?.page ?? <div>페이지가 없습니다.</div>}
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;
