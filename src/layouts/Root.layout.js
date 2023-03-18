import TopBar from "components/TopBar";
import Loading from "molecules/Loading";
import Toast from "molecules/Toast";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Outlet, useNavigate } from "react-router-dom";
import { accountAuthSlice, accountInfoSlice } from "store/accountSlice";
import IpcSender from "utils/IpcSender";
import "./Root.layout.scss";

const RootLayout = () => {
  const navigate = useNavigate();
  const accountInfo = useSelector(accountInfoSlice);
  const accountAuth = useSelector(accountAuthSlice);
  const accessToken = accountAuth?.accessToken;
  const refreshToken = accountAuth?.refreshToken;

  const [databaseReady, setDatabaseReady] = useState(false);
  const [socketReady, setSocketReady] = useState(false);
  const [tryAtOffline, setTryAtOffline] = useState(false);

  const goBackToLoginPage = () => {
    navigate("/login");
  };

  const trySocketConnection = async () => {
    const connectSocketPromise = new Promise((resolve, reject) => {
      try {
        let timeout = setTimeout(() => {
          reject("서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }, 3000);

        IpcSender.req.socket.tryConnect(accessToken, refreshToken, ({ success, data }) => {
          if (success) {
            setSocketReady(true);
            resolve();
          } else {
            reject(data);
          }
          clearInterval(timeout);
        });
      } catch (err) {
        reject(err);
      }
    });

    try {
      await Loading.float("서버 연결 중입니다. 잠시만 기다려주세요...", connectSocketPromise);
      setTryAtOffline(false);
    } catch (err) {
      switch (err?.message) {
        case "401":
          Toast.warn("인증 정보가 만료되었습니다. 다시 로그인해주세요.");
          goBackToLoginPage();
          break;
        default:
          console.log(err);
          Toast.warn("서버가 연결되지 않았습니다. 오프라인에서 작업할 수 있습니다.");
          setTryAtOffline(true);
          break;
      }
    }
  };

  useEffect(() => {
    const userId = accountInfo.uid;
    (async () => {
      const checkDatabasePromise = new Promise((resolve, reject) => {
        IpcSender.req.auth.isDatabaseReady(userId, ({ success, data: ready }) => {
          if (!success) {
            reject("데이터베이스 접근에 실패했습니다.");
            return;
          }
          if (!ready) {
            IpcSender.req.auth.initializeDatabase(userId, ({ success, data }) => {
              if (!success) {
                reject("데이터베이스 설정에 실패했습니다.");
                return;
              }
              resolve();
            });
            return;
          }
          // ready for database
          resolve();
        });
      });

      try {
        await Loading.float("데이터베이스 접근 중입니다. 잠시만 기다려주세요...", checkDatabasePromise);
        setDatabaseReady(true);
      } catch (err) {
        console.error(err);
        Toast.error(err?.message ?? "알 수 없는 오류가 발생했습니다. 로그인 화면으로 이동합니다.");
        goBackToLoginPage();
      }
    })();

    trySocketConnection();

    const onTokenUpdated = ({ success, data }) => {
      if (success) {
        console.log(data);
        // const { accessToken, refreshToken } = data;
      }
    };

    IpcSender.on("auth/tokenUpdated", onTokenUpdated);

    return () => {
      IpcSender.off("auth/tokenUpdated", onTokenUpdated);
    };
  }, []);

  return (
    <div className="root-layout">
      <TopBar />
      <div className="root-layout__content">{databaseReady && (socketReady || tryAtOffline) && <Outlet />}</div>
    </div>
  );
};

export default RootLayout;
