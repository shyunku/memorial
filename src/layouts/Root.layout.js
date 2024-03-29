import TopBar from "components/TopBar";
import Loading from "molecules/Loading";
import Prompt from "molecules/Prompt";
import Toast from "molecules/Toast";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Outlet, useNavigate, useOutletContext } from "react-router-dom";
import {
  accountAuthSlice,
  accountInfoSlice,
  removeAuth,
  setAccount,
} from "store/accountSlice";
import IpcSender from "utils/IpcSender";
import "./Root.layout.scss";
import * as uuid from "uuid";
import { colorize } from "../utils/Common";
import { applyTransitions } from "../hooks/UseTransition";

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

  const [promises, setPromises] = useState({});
  const [executing, setExecuting] = useState(false);
  const [promiseCounter, setPromiseCounter] = useState(0);

  const emptyState = useMemo(() => {
    return {
      taskMap: {},
      categories: {},
    };
  }, []);

  const [states, setStates] = useState(emptyState);

  const tryAtOffline = useMemo(() => {
    return !(socketReady && socketConnected);
  }, [socketReady, socketConnected]);

  const addPromise = useCallback((promise) => {
    setPromiseCounter((pc) => {
      setPromises((prev) => {
        const promiseUuid = pc;
        let newPromises = { ...prev, [promiseUuid]: promise };
        // console.log(`--> added promise ${promiseUuid}`);
        return newPromises;
      });
      return pc + 1;
    });
  }, []);

  const executePromises = useCallback(async () => {
    const promiseLength = Object.keys(promises).length;
    if (promiseLength === 0 || executing) return;

    setExecuting(true);
    // pop first promise

    setPromises(async (ps) => {
      const copied = { ...ps };
      const poppedPromiseKey = Object.keys(copied)[0];

      if (poppedPromiseKey == null) {
        setExecuting(false);
        return copied;
      }

      const promise = copied[poppedPromiseKey];
      delete copied[poppedPromiseKey];
      // console.log(`<-- deleted promise ${poppedPromiseKey}`);

      try {
        const transition = await promise(states);
        console.log(colorize.blue(`[Execute promise ${poppedPromiseKey}]`));
        // console.log("<-- transition", transition, states);
        setStates((prev) => {
          if (transition == null) return emptyState;
          const copied = { ...prev };
          for (let key in transition) {
            copied[key] = { ...transition[key] };
          }
          return copied;
        });
      } catch (err) {
        console.error(err);
      }

      return copied;
    });
    setExecuting(false);
  }, [promises, executing, states, emptyState]);

  // TODO :: fix infinite loop (when promises appended while executing,
  //       it will be executed again and again with old states)
  useEffect(() => {
    if (Object.keys(promises).length > 0 && !executing) {
      executePromises();
    }
  }, [promises, executing, states, executePromises]);

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

        IpcSender.req.socket.tryConnect(
          userId,
          accessToken,
          refreshToken,
          ({ success, data }) => {
            if (success) {
              setSocketReady(true);
              resolve();
            } else {
              reject(data);
            }
            clearInterval(timeout);
          }
        );
      } catch (err) {
        reject(err);
      }
    });

    try {
      await Loading.float(
        "서버 연결 중입니다. 잠시만 기다려주세요...",
        connectSocketPromise
      );
    } catch (err) {
      switch (err?.message) {
        case "401":
          Toast.warn("인증 정보가 만료되었습니다. 다시 로그인해주세요.");
          goBackToLoginPage();
          break;
        default:
          console.log(err);
          Toast.warn("서버가 연결되지 않았습니다. 편집이 불가능합니다.");
          break;
      }
    }
  };

  const promptMigration = async (version) => {
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
                  IpcSender.req.system.migrateLegacyDatabase(
                    version,
                    ({ success, data }) => {
                      if (success) {
                        Prompt.float(
                          "데이터베이스 마이그레이션 성공",
                          "데이터베이스 마이그레이션이 완료되었습니다.\n페이지를 새로고침합니다.",
                          {
                            ignorable: false,
                            confirmText: "새로고침",
                            onConfirm: () => {
                              window.location.reload();
                            },
                          }
                        );
                      } else {
                        Toast.error(
                          "데이터베이스 마이그레이션에 실패했습니다."
                        );
                      }
                      resolve();
                    }
                  );
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
                      IpcSender.req.system.truncateLegacyDatabase(
                        version,
                        ({ success, data }) => {
                          if (success) {
                            Toast.success(
                              "이전 데이터가 삭제(백업)되었습니다."
                            );
                          } else {
                            Toast.error("이전 데이터 삭제에 실패했습니다.");
                          }
                          resolve();
                        }
                      );
                    },
                  },
                ],
              }
            );
          } else {
            console.log(
              "migratable database exists, but current database is not empty."
            );
            resolve();
          }
        } else {
          console.log(
            "migratable database exists, but can't check whether states of account is clear."
          );
          resolve();
        }
      });
    });
  };

  useEffect(() => {
    const userId = accountInfo.uid;
    (async () => {
      const checkDatabasePromise = new Promise((resolve, reject) => {
        IpcSender.req.auth.isDatabaseReady(
          userId,
          ({ success, data: ready }) => {
            if (!success) {
              reject("데이터베이스 접근에 실패했습니다.");
              return;
            }
            if (!ready) {
              IpcSender.req.auth.initializeDatabase(
                userId,
                ({ success, data }) => {
                  if (!success) {
                    reject("데이터베이스 설정에 실패했습니다.");
                    return;
                  }
                  resolve();
                }
              );
              return;
            }
            // ready for database
            resolve();
          }
        );
      });

      try {
        await Loading.float(
          "데이터베이스 접근 중입니다. 잠시만 기다려주세요...",
          checkDatabasePromise
        );
        setDatabaseReady(true);
        if (isAuthorized) {
          await trySocketConnection();
        } else {
          Toast.info(
            "현재 로컬 계정으로 접속 중입니다. 서버에 접속하려면 로그인해주세요."
          );
        }
        IpcSender.req.system.getLastBlockNumber();
      } catch (err) {
        console.error(err);
        Toast.error(
          err?.message ??
            "알 수 없는 오류가 발생했습니다. 로그인 화면으로 이동합니다."
        );
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
      IpcSender.req.system.getRemoteLastBlockNumber();

      IpcSender.req.system.isLegacyMigrationAvailable(
        async ({ success, data: migratableVersion }) => {
          const migratable = migratableVersion > 0;
          if (success && migratable) {
            await promptMigration(migratableVersion);
          }
          IpcSender.req.system.migrateCheckDoneSignal();
        }
      );
    });

    IpcSender.onAll("transaction/error", ({ success, data }, tx) => {
      console.error("transaction error", data, tx);
      if (data === "not-connected") {
        Toast.error("서버가 연결되어 있지 않습니다. 편집이 불가능합니다.");
        return;
      }
      Toast.error("서버 동기화에 실패했습니다. 잠시 후 다시 시도해주세요.");
    });

    IpcSender.onAll("system/localLastBlockNumber", ({ success, data }) => {
      if (success) {
        if (typeof data === "number") {
          setLocalNonce(data);
        }
      }
    });

    IpcSender.onAll("system/remoteLastBlockNumber", ({ success, data }) => {
      if (success) {
        if (typeof data === "number") {
          setRemoteNonce(data);
        }
      }
    });

    IpcSender.onAll("system/mismatchTxHashFound", ({ success, data }) => {
      if (!success) return;
      const {
        mismatchStartBlockNumber,
        mismatchEndBlockNumber,
        lossAfterAcceptTheirs,
        lossAfterAcceptMine,
      } = data;
      Prompt.float(
        "데이터 충돌 발생",
        `동기화 중 데이터 충돌이 발생했습니다.\n충돌을 직접 해결하거나 무시할 수 있지만, 무시할 경우 오프라인으로 사용해야 합니다.` +
          `\n\n서버의 데이터를 가져올 경우, ${lossAfterAcceptTheirs}개의 트랜잭션이 손실됩니다.` +
          `\n클라이언트의 데이터를 가져올 경우, ${lossAfterAcceptMine}개의 트랜잭션이 손실됩니다.`,
        {
          ignorable: false,
          confirmText: "서버 데이터 사용",
          cancelText: "무시",
          onConfirm: () => {
            IpcSender.req.system.mismatchTxAcceptTheirs(
              mismatchStartBlockNumber,
              mismatchEndBlockNumber,
              ({ success, data }) => {
                if (success) {
                  Prompt.float(
                    "데이터베이스 충돌 해결",
                    "데이터베이스 충돌 해결이 완료되었습니다.\n페이지를 새로고침합니다.",
                    {
                      ignorable: false,
                      confirmText: "새로고침",
                      onConfirm: () => {
                        window.location.reload();
                      },
                    }
                  );
                } else {
                  Toast.error("데이터베이스 충돌 해결에 실패했습니다.");
                }
              }
            );
          },
          onCancel: () => {
            Toast.info("오프라인 모드로 전환합니다.");
            dispatch(setAccount({ offlineMode: true }));
            IpcSender.req.socket.tryDisconnect();
          },
          extraBtns: [
            {
              text: "클라이언트 데이터 사용",
              styles: {
                backgroundColor: "rgb(165, 66, 66)",
                color: "white",
              },
              onClick: () => {
                IpcSender.req.system.mismatchTxAcceptMine(
                  mismatchStartBlockNumber,
                  mismatchEndBlockNumber,
                  ({ success, data }) => {
                    if (success) {
                      Prompt.float(
                        "데이터베이스 충돌 해결",
                        "데이터베이스 충돌 해결이 완료되었습니다.\n페이지를 새로고침합니다.",
                        {
                          ignorable: false,
                          confirmText: "새로고침",
                          onConfirm: () => {
                            window.location.reload();
                          },
                        }
                      );
                    } else {
                      Toast.error("데이터베이스 충돌 해결에 실패했습니다.");
                    }
                  }
                );
              },
            },
          ],
        }
      );
    });

    IpcSender.onAll("system/snapshotApplied", ({ success, data }) => {
      if (success) {
        window.location.reload();
      }
    });

    IpcSender.onAll("system/stateRollback", ({ success, data }) => {
      if (!success) {
        Toast.error(
          "다른 기기에서 데이터 충돌에 대해 수행한 롤백을 적용하는데 실패했습니다."
        );
        return;
      }
      Toast.info("다른 기기에서 데이터 충돌에 대해 롤백을 수행했습니다.");
      Prompt.float(
        "데이터 롤백 완료",
        "다른 기기에서 데이터 충돌에 대해 롤백을 수행했습니다.\n페이지를 새로고침합니다.",
        {
          ignorable: false,
          confirmText: "새로고침",
          onConfirm: () => {
            window.location.reload();
          },
        }
      );
    });

    IpcSender.onAll("system/socketError", ({ success, data }) => {
      if (!success) return;
      if (data === 401) {
        Prompt.float(
          "로그인 세션이 만료되었습니다.",
          "로그인 세션이 만료되었습니다.\n로그인 페이지로 이동합니다.",
          {
            ignorable: false,
            confirmText: "로그인 페이지로 이동",
            onConfirm: () => {
              dispatch(removeAuth());
              navigate("/login");
            },
          }
        );
      }
    });

    IpcSender.onAll("system/error", (err) => {
      console.error(err);
    });

    IpcSender.onAll("state/transitions", ({ success, data }) => {
      if (success) {
        applyTransitions(addPromise, data);
      }
    });

    return () => {
      IpcSender.offAll("socket/disconnected");
      IpcSender.offAll("socket/connected");
      IpcSender.offAll("transaction/error");
      IpcSender.offAll("system/localLastBlockNumber");
      IpcSender.offAll("system/remoteLastBlockNumber");
      IpcSender.offAll("system/mismatchTxHashFound");
      IpcSender.offAll("system/snapshotApplied");
      IpcSender.offAll("system/stateRollback");
      IpcSender.offAll("system/socketError");
      IpcSender.offAll("state/transitions");
    };
  }, []);

  useEffect(() => {
    dispatch(setAccount({ offlineMode: tryAtOffline }));
  }, [tryAtOffline]);

  return (
    <div className="root-layout">
      <TopBar addPromise={addPromise} />
      <div className="root-layout__content">
        {databaseReady ? (
          <Outlet context={{ localNonce, remoteNonce, addPromise, states }} />
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
