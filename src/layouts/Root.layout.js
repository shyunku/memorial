import TopBar from "components/TopBar";
import Loading from "molecules/Loading";
import Prompt from "molecules/Prompt";
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

  const [localNonce, setLocalNonce] = useState(0);
  const [remoteNonce, setRemoteNonce] = useState(0);

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

  const promptMigration = async () => {
    return new Promise((resolve, reject) => {
      IpcSender.req.system.isDatabaseClear(async ({ success, data }) => {
        if (success) {
          if (data) {
            Prompt.float(
              "데이터베이스 마이그레이션",
              "기존에 사용하던 데이터베이스가 존재합니다.\n이전 데이터를 가져오시겠습니까?\n무시하게되면 이 메시지는 앞으로도 나타날 수 있습니다.",
              {
                ignorable: false,
                confirmText: "가져오기",
                cancelText: "무시",
                onConfirm: () => {
                  IpcSender.req.system.migrateDatabase(({ success, data }) => {
                    if (success) {
                      Toast.success("데이터베이스 마이그레이션이 완료되었습니다.");
                    } else {
                      Toast.error("데이터베이스 마이그레이션에 실패했습니다.");
                    }
                    resolve();
                  });
                },
                onCancel: () => {
                  resolve();
                },
                extraBtns: [
                  {
                    text: "이전 데이터 삭제",
                    styles: {
                      backgroundColor: "rgb(165, 66, 66)",
                      color: "white",
                    },
                    onClick: () => {
                      // TODO :: 이전 데이터 삭제
                      console.log("delete old database");
                      resolve();
                    },
                  },
                ],
              }
            );
          } else {
            console.log("migratable database exists, but current database is not empty.");
            resolve();
          }
        } else {
          console.log("migratable database exists, but can't check whether states of account is clear.");
          resolve();
        }
      });
    });
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
        if (isAuthorized) {
          await trySocketConnection();
        } else {
          Toast.info("현재 로컬 계정으로 접속 중입니다. 서버에 접속하려면 로그인해주세요.");
        }
        IpcSender.req.system.getLastBlockNumber();
        IpcSender.req.system.getWaitingBlockNumber();
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

    IpcSender.onAll("socket/connected", async (data) => {
      setSocketConnected(true);

      IpcSender.req.system.isMigratable(async ({ success, data: migratable }) => {
        if (success && migratable) {
          await promptMigration();
        }
      });
    });

    IpcSender.onAll("transaction/error", ({ success, data }, tx) => {
      console.error("transaction error", data, tx);
      Toast.error("서버 동기화에 실패했습니다. 잠시 후 다시 시도해주세요.");
    });

    IpcSender.onAll("system/lastBlockNumber", ({ success, data }) => {
      if (success) {
        if (typeof data === "number") {
          setLocalNonce(data);
        }
      }
    });

    IpcSender.onAll("system/waitingBlockNumber", ({ success, data }) => {
      if (success) {
        if (typeof data === "number") {
          setRemoteNonce(data - 1);
        }
      }
    });

    return () => {
      IpcSender.offAll("socket/disconnected");
      IpcSender.offAll("socket/connected");
      IpcSender.offAll("transaction/error");
      IpcSender.offAll("system/lastBlockNumber");
      IpcSender.offAll("system/waitingBlockNumber");
    };
  }, []);

  useEffect(() => {
    dispatch(setAccount({ offlineMode: tryAtOffline }));
  }, [tryAtOffline]);

  return (
    <div className="root-layout">
      <TopBar />
      <div className="root-layout__content">
        {databaseReady ? (
          <Outlet context={{ localNonce, remoteNonce }} />
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
            데이터베이스에 연결 중입니다. 잠시만 기다려주세요...
          </div>
        )}
      </div>
    </div>
  );
};

export default RootLayout;
