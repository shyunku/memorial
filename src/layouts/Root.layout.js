import TopBar from "components/TopBar";
import Loading from "molecules/Loading";
import Toast from "molecules/Toast";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Outlet, useNavigate } from "react-router-dom";
import { accountInfoSlice } from "store/accountSlice";
import IpcSender from "utils/IpcSender";
import "./Root.layout.scss";

const RootLayout = () => {
  const navigate = useNavigate();
  const accountInfo = useSelector(accountInfoSlice);
  const [databaseReady, setDatabaseReady] = useState(false);

  const goBackToLoginPage = () => {
    navigate("/login");
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
  }, []);

  if (!databaseReady) {
    return <></>;
  }

  return (
    <div className="root-layout">
      <TopBar />
      <div className="root-layout__content">
        <Outlet />
      </div>
    </div>
  );
};

export default RootLayout;
