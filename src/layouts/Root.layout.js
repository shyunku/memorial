import TopBar from "components/TopBar";
import Loading from "molecules/Loading";
import Toast from "molecules/Toast";
import { useContext, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Outlet, useNavigate, useOutletContext } from "react-router-dom";
import { accountAuthSlice, accountInfoSlice, setAccount } from "store/accountSlice";
import IpcSender from "utils/IpcSender";
import "./Root.layout.scss";

const RootLayout = () => {
  const context = useOutletContext();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const accountInfo = useSelector(accountInfoSlice);
  const accountAuth = useSelector(accountAuthSlice);
  const accessToken = accountAuth?.accessToken;
  const refreshToken = accountAuth?.refreshToken;
  const isAuthorized = useMemo(() => {
    return context?.isAuthorized ?? false;
  }, [context]);

  // console.log(accountInfo, accountAuth);

  const [databaseReady, setDatabaseReady] = useState(false);
  const [socketReady, setSocketReady] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  const tryAtOffline = useMemo(() => {
    return !(socketReady && socketConnected);
  }, [socketReady, socketConnected]);

  const goBackToLoginPage = () => {
    navigate("/login");
  };

  const trySocketConnection = async () => {
    const userId = accountInfo.uid;
    const connectSocketPromise = new Promise((resolve, reject) => {
      try {
        let timeout = setTimeout(() => {
          reject("서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }, 3000);

        IpcSender.req.socket.tryConnect(userId, accessToken, refreshToken, ({ success, data }) => {
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
    } catch (err) {
      switch (err?.message) {
        case "401":
          Toast.warn("인증 정보가 만료되었습니다. 다시 로그인해주세요.");
          goBackToLoginPage();
          break;
        default:
          console.log(err);
          Toast.warn("서버가 연결되지 않았습니다. 오프라인에서 작업할 수 있습니다.");
          break;
      }
    }
  };

  useEffect(() => {
    const userId = accountInfo.uid;
    console.log(userId);
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
        if (isAuthorized) {
          trySocketConnection();
        } else {
          Toast.info("현재 로컬 계정으로 접속 중입니다. 서버에 접속하려면 로그인해주세요.");
        }
      } catch (err) {
        console.error(err);
        Toast.error(err?.message ?? "알 수 없는 오류가 발생했습니다. 로그인 화면으로 이동합니다.");
        goBackToLoginPage();
      }
    })();
  }, []);

  useEffect(() => {
    IpcSender.onAll("socket/disconnected", (data) => {
      setSocketConnected(false);
    });

    IpcSender.onAll("socket/connected", (data) => {
      setSocketConnected(true);
    });

    return () => {
      IpcSender.offAll("socket/disconnected");
      IpcSender.offAll("socket/connected");
    };
  }, []);

  useEffect(() => {
    dispatch(setAccount({ offlineMode: tryAtOffline }));
  }, [tryAtOffline]);

  console.log("visible", databaseReady, socketReady, socketConnected, tryAtOffline);

  return (
    <div className="root-layout">
      <TopBar />
      <div className="root-layout__content">
        {databaseReady ? (
          <Outlet />
        ) : (
          <div
            style={{
              display: "flex",
              width: "100%",
              height: "100%",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            서버 연결 중입니다. 잠시만 기다려주세요...
          </div>
        )}
      </div>
    </div>
  );
};

export default RootLayout;
