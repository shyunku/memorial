import Loading from "molecules/Loading";
import Toast from "molecules/Toast";
import Login from "pages/Login";
import { useContext, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { accountAuthSlice, accountInfoSlice, setAuth } from "store/accountSlice";
import IpcSender from "utils/IpcSender";

const AuthRouter = () => {
  // const location = useLocation();
  // console.log(location);

  const dispatch = useDispatch();

  const accountAuth = useSelector(accountAuthSlice);
  const accountInfo = useSelector(accountInfoSlice);
  const accessToken = useMemo(() => {
    return accountAuth.accessToken;
  }, [accountAuth]);
  const offlineMode = useMemo(() => {
    return accountInfo.offlineMode;
  }, [accountInfo]);
  const userId = useMemo(() => {
    return accountInfo.uid;
  }, [accountInfo]);
  const isAuthorized = useMemo(() => {
    return accessToken != null && userId != null;
  }, [accessToken]);

  useEffect(() => {
    const onTokenUpdated = ({ success, data }) => {
      try {
        if (success) {
          const { accessToken, refreshToken } = data;
          dispatch(setAuth({ accessToken, refreshToken }));
        }
      } catch (err) {
        console.log(err);
      }
    };

    IpcSender.onAll("auth/tokenUpdated", onTokenUpdated);

    return () => {
      IpcSender.off("auth/tokenUpdated", onTokenUpdated);
    };
  }, []);

  if (isAuthorized || offlineMode) {
    return <Outlet />;
  } else {
    console.log("not accessible");
    return <Navigate to="/login" />;
  }
};

export default AuthRouter;
