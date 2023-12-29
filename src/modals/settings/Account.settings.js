import PackageJson from "../../../package.json";
// import "./Account.settings.scss";
import {useEffect, useState} from "react";
import IpcSender from "../../utils/IpcSender";
import Prompt from "../../molecules/Prompt";
import Toast from "../../molecules/Toast";
import {
  accountInfoSlice,
  removeAccount,
  removeAuth,
} from "../../store/accountSlice";
import {useDispatch, useSelector} from "react-redux";
import {useNavigate} from "react-router-dom";

const SettingData = ({modalRef, ...props}) => {
  const accountInfo = useSelector(accountInfoSlice);
  const dispatch = useDispatch();

  console.log(props);

  const logout = () => {
    Prompt.float("로그아웃", "정말 로그아웃 하시겠습니까?", {
      confirmText: "로그아웃",
      cancelText: "취소",
      onConfirm: async () => {
        try {
          await IpcSender.req.auth.deleteAuthInfoSync(accountInfo?.uid);
          dispatch(removeAuth());
          dispatch(removeAccount());
          Toast.info("로그아웃 되었습니다.");
          modalRef?.current?.close();
        } catch (err) {
          console.log(err);
          Toast.error("인증 정보 삭제에 실패했습니다. 다시 시도해주세요.");
        }
      },
      onCancel: () => {
      },
    });
  };

  return (
    <div className={"settings"}>
      <div className={"setting-item sync-status"}>
        <div className={"head"}>
          <div className={"label"}>계정 관리</div>
        </div>
        <div className={"body"}>
          <div className={"controller"}>
            <div className={"description"}>현재 계정에서 로그아웃합니다.</div>
            <button onClick={logout}>로그아웃</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingData;
