import Modal from "../molecules/Modal";
import "./Settings.modal.scss";
import {
  IoCog,
  IoInformationCircle,
  IoLogoBuffer,
  IoPersonSharp,
} from "react-icons/io5";

const SettingsModal = ({ ...props }) => {
  const onClose = () => {
    return 1234;
  };

  return (
    <Modal {...props} onClose={onClose} className={"settings"}>
      <div className={"title"}>환경설정</div>
      <div className={"content"}>
        <div className={"menu"}>
          <div className={"menu-item selected"}>
            <div className={"icon"}>
              <IoCog />
            </div>
            <div className={"label"}>일반</div>
          </div>
          <div className={"menu-item"}>
            <div className={"icon"}>
              <IoLogoBuffer />
            </div>
            <div className={"label"}>데이터</div>
          </div>
          <div className={"menu-item"}>
            <div className={"icon"}>
              <IoPersonSharp />
            </div>
            <div className={"label"}>계정</div>
          </div>
          <div className={"menu-item"}>
            <div className={"icon"}>
              <IoInformationCircle />
            </div>
            <div className={"label"}>정보</div>
          </div>
        </div>
        <div className={"menu-content"}>테스트 컨텐츠</div>
      </div>
    </Modal>
  );
};

export default SettingsModal;
