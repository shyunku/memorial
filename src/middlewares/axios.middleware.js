import React from "react";
import { unwrapResult } from "@reduxjs/toolkit";
import axios, { AxiosError } from "axios";
import { useEffect } from "react";
// import { toast } from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";

const AxiosMiddleware = () => {
  //   const dispatch = useDispatch();
  //   const accountInfo = useSelector(accountInfoSlice);
  //   const accountAuth = useSelector(accountAuthSlice);
  //   const userName = accountInfo?.userName;
  //   const email = accountInfo?.email;
  //   const refreshToken = accountAuth?.refresh?.token;

  //   useEffect(() => {
  //     const interceptor = axios.interceptors.response.use(
  //       (response) => response,
  //       async (error) => {
  //         if (error.request.responseURL) {
  //           console.log(error.response?.data);

  //           const reqUrl = new URL(error.request.responseURL);
  //           const pathname = reqUrl.pathname;

  //           if (error.response?.status === 401) {
  //             if (pathname === "/auth/refreshToken" || pathname === "/auth/verifyToken") {
  //               if (refreshToken != null) {
  //                 console.log(`refresh token failed, logging out`);
  //                 dispatch(removeAuth());
  //                 alert("Session expired, please login again");
  //                 window.location.href = "/";
  //                 return Promise.reject(error);
  //               }
  //             } else {
  //               // common 401 error
  //               // retry original request
  //               console.log(`401 error, refreshing token`, refreshToken);
  //               const refreshedResult = unwrapResult(await dispatch(refreshAuthToken({ userName, email, refreshToken })));
  //               console.log(`refresh token result`, refreshedResult);

  //               const { accessToken, refreshToken: updatedRefreshToken } = refreshedResult;
  //               dispatch(setAuth({ access: { token: accessToken }, refresh: { token: updatedRefreshToken } }));

  //               // update axios header from error.config
  //               error.config.headers["Authorization"] = `Bearer ${accessToken}`;

  //               return Promise.resolve(axios.request(error.config));
  //             }
  //           }
  //         }
  //         console.log(refreshToken, error.response?.status);
  //         toast.error(error.response?.data?.message ?? "unknown error!");
  //         return Promise.reject(error);
  //       }
  //     );

  //     if (refreshToken) {
  //       dispatch(verifyToken({ userName, email, refreshToken }));
  //     }

  //     let periodicalRefreshTokenHandler = setInterval(async () => {
  //       if (!refreshToken) return;
  //       const refreshedResult = unwrapResult(await dispatch(refreshAuthToken({ userName, email, refreshToken })));
  //       console.log(`refresh token result`, refreshedResult);

  //       const { accessToken, refreshToken: updatedRefreshToken } = refreshedResult;
  //       dispatch(setAuth({ access: { token: accessToken }, refresh: { token: updatedRefreshToken } }));
  //     }, 60000);

  //     return () => {
  //       axios.interceptors.response.eject(interceptor);
  //       clearInterval(periodicalRefreshTokenHandler);
  //     };
  //   }, [accountInfo, refreshToken]);

  return <></>;
};

export default AxiosMiddleware;
