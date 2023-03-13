import Loading from "molecules/Loading";
import Toast from "molecules/Toast";
import Login from "pages/Login";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { accountAuthSlice, accountInfoSlice } from "store/accountSlice";
import IpcSender from "utils/IpcSender";

const AuthRouter = () => {
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

  if (isAuthorized) {
    return <Outlet />;
  } else {
    console.log("not accessible");
    return <Navigate to="/login" />;
  }
};

export default AuthRouter;
