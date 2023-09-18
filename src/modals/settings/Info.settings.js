import PackageJson from "../../../package.json";
import "./Info.settings.scss";

const SettingInfo = ({ ...props }) => {
  return (
    <div className={"setting-info"}>
      <div className={"info-item"}>
        <div className={"label"}>버전</div>
        <div className={"value"}>{PackageJson.version}</div>
      </div>
      <div className={"info-item"}>
        <div className={"label"}>개발자</div>
        <div className={"value"}>shyunku</div>
      </div>
      <div className={"info-item"}>
        <div className={"label"}>
          Git Contribution을 원하시는 분은 whdudgns7321@gmail.com으로
          연락바랍니다.
        </div>
      </div>
    </div>
  );
};

export default SettingInfo;
