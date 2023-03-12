import Loading from "molecules/Loading";
import Toast from "molecules/Toast";
import Login from "pages/Login";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { accountAuthSlice, accountInfoSlice } from "store/accountSlice";
import IpcSender from "utils/IpcSender";

const AuthRouter = () => {
  const location = useLocation();

  const accountAuth = useSelector(accountAuthSlice);
  const accountInfo = useSelector(accountInfoSlice);
  const accessToken = useMemo(() => {
    return accountAuth.accessToken;
  }, [accountAuth]);
  const userId = useMemo(() => {
    return accountInfo.uid;
  }, [accountInfo]);
  const isAuthorized = useMemo(() => {
    return accessToken != null && userId != null;
  }, [accessToken]);

  const [accessible, setAccessible] = useState(false);
  const [isCalculatingAccessible, setIsCalculatingAccessible] = useState(false);

  useEffect(() => {
    console.log("New location: " + location.pathname);
    setIsCalculatingAccessible(true);
    (async () => {
      if (isAuthorized) {
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
          setAccessible(true);
        } catch (err) {
          console.error(err);
          Toast.error(err?.message ?? "알 수 없는 오류가 발생했습니다.");
          setAccessible(false);
        }
      } else {
        setAccessible(false);
      }
      setIsCalculatingAccessible(false);
    })();
  }, [location.pathname]);

  if (isCalculatingAccessible) {
    return <></>;
  }

  if (accessible) {
    return <Outlet />;
  } else {
    return <Login />;
  }
};

export default AuthRouter;
