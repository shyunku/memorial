import PackageJson from "../../../package.json";
import "./Data.settings.scss";
import { useEffect, useState } from "react";
import IpcSender from "../../utils/IpcSender";
import Prompt from "../../molecules/Prompt";
import { applyEmptyState } from "../../hooks/UseTransaction";
import Toast from "../../molecules/Toast";
import { useOutletContext } from "react-router-dom";

const SettingData = ({ ...props }) => {
  const [localNonce, setLocalNonce] = useState(0);
  const [remoteNonce, setRemoteNonce] = useState(0);

  // const { addPromise } = useOutletContext();

  const initialize = () => {
    Prompt.float(
      "데이터 초기화",
      "정말 초기화하시겠습니까?\n\n" +
        "모든 데이터가 기기에서 삭제되며, 이후 서버로부터 자동 복구됩니다.\n\n" +
        "전체 초기화를 할 경우 서버 및 로컬 환경에서의 데이터가 모두 삭제됩니다.",
      {
        confirmText: "초기화 및 동기화",
        onConfirm: async () => {
          // applyEmptyState({ addPromise });
          IpcSender.req.system.initializeState(({ success, data }) => {
            if (success) {
              Toast.success("데이터 자동 복구가 완료되었습니다.");
            }
          });
        },
        onCancel: () => {},
        extraBtns: [
          {
            text: "전체 초기화",
            styles: {
              backgroundColor: "rgb(165, 66, 66)",
              color: "white",
            },
            onClick: () => {
              IpcSender.req.system.clearStatePermanently(
                ({ success, data }) => {
                  if (success) {
                    Toast.success("데이터가 초기화되었습니다.");
                    // applyEmptyState({ addPromise });
                  } else {
                    Toast.error("데이터 초기화에 실패했습니다.");
                  }
                }
              );
            },
          },
        ],
      }
    );
  };

  useEffect(() => {
    const onGetLocalBlockNumber = ({ success, data }) => {
      if (success) {
        if (typeof data === "number") {
          setLocalNonce(data);
        }
      }
    };

    const onGetRemoteBlockNumber = ({ success, data }) => {
      if (success) {
        if (typeof data === "number") {
          setRemoteNonce(data);
        }
      }
    };

    IpcSender.onAll("system/localLastBlockNumber", onGetLocalBlockNumber);
    IpcSender.onAll("system/remoteLastBlockNumber", onGetRemoteBlockNumber);

    IpcSender.req.system.getLastBlockNumber();
    IpcSender.req.system.getRemoteLastBlockNumber();

    return () => {
      IpcSender.off("system/localLastBlockNumber", onGetLocalBlockNumber);
      IpcSender.off("system/remoteLastBlockNumber", onGetRemoteBlockNumber);
    };
  }, []);

  return (
    <div className={"settings"}>
      <div className={"setting-item sync-status"}>
        <div className={"head"}>
          <div className={"label"}>동기화 상태</div>
        </div>
        <div className={"body"}>
          <div className={"sync-bar"}>
            <div
              className={"synced"}
              style={{
                width: `${
                  remoteNonce === 0 ? 0 : (100 * localNonce) / remoteNonce
                }%`,
              }}
            ></div>
            <div className={"sync-text"}>
              {localNonce} / {remoteNonce}
            </div>
          </div>
          <div className={"controller"}>
            <div className={"description"}>
              데이터가 동기화되지 않으면 강제로 초기화 후 동기화를 시도할 수
              있습니다.
            </div>
            <button onClick={initialize}>강제 동기화</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingData;
