import PackageJson from "../../../package.json";
import "./Info.settings.scss";
import { useState } from "react";
import CheckBox from "../../molecules/CheckBox";

const SettingCommon = ({ ...props }) => {
  const [startOnBoot, setStartOnBoot] = useState(false);

  return (
    <div className={"setting-common"}>
      {/*<div className={"setting-item"}>*/}
      {/*  <div className={"head"}>*/}
      {/*    <div className={"label"}>부팅 시 자동 시작</div>*/}
      {/*    <div className={"controller"}>*/}
      {/*      <CheckBox value={startOnBoot} onChange={setStartOnBoot} />*/}
      {/*    </div>*/}
      {/*  </div>*/}
      {/*  <div className={"description"}>부팅 시 자동 시작됩니다.</div>*/}
      {/*</div>*/}
    </div>
  );
};

export default SettingCommon;
