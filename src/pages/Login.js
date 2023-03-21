import LoginTopBar from "components/LoginTopBar";
import { IoChevronBack, IoLogoGoogle } from "react-icons/io5";
import GoogleLogo from "assets/images/google_logo.png";
import "./Login.scss";
import JsxUtil from "utils/JsxUtil";
import { useEffect, useRef, useState } from "react";
import IpcSender from "utils/IpcSender";
import axios from "axios";
import { unwrapResult } from "@reduxjs/toolkit";
import { useDispatch } from "react-redux";
import { pingTest } from "thunks/AuthThunk";
import Toast from "molecules/Toast";
import Loading from "molecules/Loading";
import Prompt from "molecules/Prompt";
import { useNavigate } from "react-router-dom";
import { setAccount, setAuth } from "store/accountSlice";
import Input from "molecules/Input";
import sha256 from "sha256";
import PackageJson from "../../package.json";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [childWindow, setChildWindow] = useState(null);
  const [signupMode, setSignupMode] = useState(false);
  const [googleBinding, setGoogleBinding] = useState(false);

  const [currentUserInfo, setCurrentUserInfo] = useState(null);
  const [currentUserAuth, setCurrentUserAuth] = useState(null);

  // Login forms
  const [signinId, setSigninId] = useState("");
  const [signinPassword, setSigninPassword] = useState("");

  // Signup forms
  const [signupUserName, setSignupUserName] = useState("");
  const [signupId, setSignupId] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState("");

  const [googleBindingCancelHover, setGoogleBindingCancelHover] = useState(false);

  const goToHome = async (_user, _auth, withOffline = false) => {
    if (withOffline) {
      dispatch(
        setAccount({
          offlineMode: true,
          ..._user,
        })
      );
      navigate("/home", { state: { offline: true } });
      return;
    }

    const auth = _auth ?? currentUserAuth;
    const user = _user ?? currentUserInfo;

    try {
      dispatch(
        setAuth({
          accessToken: auth?.access_token?.token,
          refreshToken: auth?.refresh_token?.token,
        })
      );
      dispatch(
        setAccount({
          uid: user.uid,
          googleEmail: user.google_email,
          googleProfileImageUrl: user.google_profile_image_url,
          offlineMode: false,
          username: user?.username ?? null,
        })
      );

      console.log(auth);
      await IpcSender.req.auth.registerAuthInfoSync(user?.uid, auth?.access_token?.token, auth?.refresh_token?.token);

      setCurrentUserInfo(null);
      setCurrentUserAuth(null);

      navigate("/home");
    } catch (err) {
      console.error(err);
      Toast.error("인증 정보 저장에 실패했습니다.");
    }
  };

  const goToSignUp = () => {
    setSignupUserName("");
    setSignupId("");
    setSignupPassword("");
    setSignupPasswordConfirm("");
    setSignupMode(true);
  };

  const goBackToLogin = (force = false) => {
    // if user is on signup mode & has google auth info/user info, then show prompt
    if (force === false && signupMode && googleBinding) {
      Prompt.float("회원가입 취소", "계정 연동을 위한 회원가입을 취소하시겠습니까?", {
        confirmText: "취소",
        cancelText: "계속 진행",
        onConfirm: async () => {
          setGoogleBinding(false);
          setSigninId("");
          setSigninPassword("");
          setSignupMode(false);
        },
        onCancel: () => {},
      });
    } else {
      setSigninId("");
      setSigninPassword("");
      setSignupMode(false);
    }
  };

  const onGoogleLoginSuccess = (userInfo) => {
    console.log(userInfo);
    const { auth, googleUserInfo } = userInfo;
    const { email: googleEmail, id: googleAuthId, picture: googleProfileImageUrl } = googleUserInfo;

    IpcSender.req.auth.sendGoogleOauthResult(userInfo, async ({ success, data }) => {
      if (success) {
        const { isSignupNeeded, user } = data;
        if (isSignupNeeded) {
          setCurrentUserInfo({ googleEmail, googleAuthId, googleProfileImageUrl });
          setCurrentUserAuth(auth);
          setGoogleBinding(true);

          Prompt.float(
            "구글 계정 연동",
            "오프라인에서도 사용가능하려면 회원가입을 해야합니다.\n이미 계정을 보유하고 있으시다면 로그인해주세요.",
            {
              confirmText: "계정 연동",
              cancelText: "이미 계정이 있음",
              onConfirm: () => {
                // redirect to signup page
                goToSignUp();
              },
              onCancel: () => {
                // redirect to login page
                goBackToLogin();
              },
            }
          );
          return;
        }

        goToHome(user, auth);
      } else {
        Toast.error("구글 계정 인증 정보 등록에 실패했습니다.");
      }
    });
  };

  const tryLoginWithGoogleOauth = async () => {
    try {
      unwrapResult(await dispatch(pingTest()));
    } catch (err) {
      Toast.error("현재 서버와 연결할 수 없습니다.");
      console.error(err);
      return;
    }

    let domain = PackageJson.config.app_server_endpoint;
    let apiVersion = PackageJson.config.app_server_api_version;

    let child = window.open(
      `${domain}/${apiVersion}/google_auth/login`,
      "구글 계정으로 로그인",
      "menubar=no,resizable=no,toolbar=no,status=no,scrollbar=no,width=400"
    );
    setChildWindow(child);
  };

  const trySignUp = () => {
    // validate inputs
    if (signupUserName.length === 0) {
      Toast.error("이름을 입력해주세요.");
      return;
    }
    if (signupId.length < 5) {
      Toast.error("아이디는 5자 이상이어야 합니다.");
      return;
    }
    if (signupPassword.length < 8) {
      Toast.error("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (signupPassword !== signupPasswordConfirm) {
      Toast.error("비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    // try sign up process
    // sign up with google auth binding
    const singleEncryptedPassword = sha256(sha256(signupId) + signupPassword);
    if (googleBinding === true) {
      if (currentUserInfo == null) {
        console.error(`currentUserInfo is null`);
        Toast.error("오류가 발생했습니다.");
        return;
      }

      IpcSender.req.auth.signUpWithGoogleAuth(
        {
          username: signupUserName,
          authId: signupId,
          encryptedPassword: singleEncryptedPassword,
          googleAuthId: currentUserInfo.googleAuthId,
          googleEmail: currentUserInfo.googleEmail,
          googleProfileImageUrl: currentUserInfo.googleProfileImageUrl,
        },
        ({ success, data }) => {
          if (success) {
            const user = data.user;
            const userInfo = {
              uid: user.userId,
              username: user.username,
              profileImageUrl: user.profileImageUrl,
              googleEmail: user.googleEmail,
              googleProfileImageUrl: user.googleProfileImageUrl,
            };

            goToHome(userInfo, currentUserAuth);
            goBackToLogin(true);
          } else {
            const status = data;
            switch (status) {
              case 400:
                Toast.error("잘못된 요청입니다.");
                break;
              case 409:
                Toast.error("해당 구글 계정은 이미 연동되어있습니다.");
                // TODO :: handle this case
                break;
              case "NOT_FOUND_IN_LOCAL":
                Toast.error("해당 구글 계정은 로컬에 등록되어있지 않습니다.");
                break;
              default:
                console.log(data);
                Toast.error("구글 계정 연동에 실패했습니다.");
                break;
            }
          }
        }
      );
    } else {
      IpcSender.req.auth.signUp(
        {
          username: signupUserName,
          authId: signupId,
          encryptedPassword: singleEncryptedPassword,
        },
        ({ success, data }) => {
          if (success) {
            Toast.success("회원가입에 성공했습니다. 로그인해주세요.");
            goBackToLogin();
          } else {
            const status = data;
            switch (status) {
              case 400:
                Toast.error("잘못된 요청입니다.");
                break;
              case 409:
                Toast.error("이미 사용 중인 아이디입니다.");
                break;
              case "TRY_TO_BIND_GOOGLE":
                Toast.error("이미 사용 중인 구글 계정이 있으신가요? 구글 계정으로 로그인해주세요.");
                break;
              default:
                console.log(data);
                Toast.error("회원가입에 실패했습니다.");
                break;
            }
          }
        }
      );
    }
  };

  const tryLogin = () => {
    // validate inputs
    if (signinId.length === 0) {
      Toast.error("아이디를 입력해주세요.");
      return;
    }
    if (signinPassword.length === 0) {
      Toast.error("비밀번호를 입력해주세요.");
      return;
    }

    const singleEncryptedPassword = sha256(sha256(signinId) + signinPassword);
    const loginRequest = {
      authId: signinId,
      encryptedPassword: singleEncryptedPassword,
    };

    if (googleBinding) {
      IpcSender.req.auth.signUpWithGoogleAuth(
        {
          authId: signinId,
          encryptedPassword: singleEncryptedPassword,
          googleAuthId: currentUserInfo.googleAuthId,
          googleEmail: currentUserInfo.googleEmail,
          googleProfileImageUrl: currentUserInfo.googleProfileImageUrl,
        },
        ({ success, data }) => {
          if (success) {
            const user = data.user;
            const userInfo = {
              uid: user.userId,
              username: user.username,
              profileImageUrl: user.profileImageUrl,
              googleEmail: user.googleEmail,
              googleProfileImageUrl: user.googleProfileImageUrl,
            };
            goToHome(userInfo, currentUserAuth);
          } else {
            const status = data;
            switch (status) {
              case 400:
                Toast.error("잘못된 요청입니다.");
                break;
              case 409:
                goToHome(data.user, currentUserAuth);
                break;
              case "NOT_FOUND_IN_LOCAL":
                Toast.error("해당 구글 계정은 로컬에 등록되어있지 않습니다.");
                break;
              default:
                console.log(data);
                Toast.error("구글 계정 연동에 실패했습니다.");
                break;
            }
          }
        }
      );
      return;
    }

    IpcSender.req.auth.login(loginRequest, async ({ success, data }) => {
      if (success) {
        try {
          const { user, auth } = data;

          goToHome(user, auth);
        } catch (err) {
          console.error(err);
          Toast.error("로그인에 실패했습니다.");
        }
      } else {
        const { serverStatus, canLoginWithLocal } = data;
        if (serverStatus != null) {
          const status = serverStatus;
          switch (status) {
            case 400:
              Toast.error("잘못된 요청입니다.");
              break;
            case 401:
              Toast.error("아이디 또는 비밀번호가 일치하지 않습니다.");
              break;
            default:
              console.log(data);
              Toast.error("로그인에 실패했습니다.");
              break;
          }
        } else {
          // not server error
          Toast.error("로그인 중 오류가 발생했습니다.");
        }

        const canExtractUserData = data?.localUser != null;

        if (canLoginWithLocal && canExtractUserData) {
          const userData = data.localUser;

          setTimeout(() => {
            Prompt.float("로컬 계정으로 연결", "서버 연결이 불가능합니다. 로컬 계정으로 연결하시겠습니까?", {
              confirmText: "로컬 계정 사용",
              cancelText: "취소",
              onConfirm: () => {
                goToHome(
                  {
                    uid: userData.uid ?? null,
                    username: userData.username ?? null,
                    googleEmail: userData.googleEmail ?? null,
                  },
                  null,
                  true
                );
              },
            });
          }, 500);
        }
      }
    });
  };

  useEffect(() => {
    const onMessage = (e) => {
      try {
        const data = e?.data;
        if (data?.type === "google_oauth_callback_result") {
          const result = data?.data;
          onGoogleLoginSuccess(result);
        }
      } catch (err) {
        console.error(err);
        Toast.error("구글 로그인에 실패했습니다.");
      }
    };
    const unmountChildWindow = () => {
      if (childWindow) childWindow.close();
    };
    window.addEventListener("message", onMessage);
    window.addEventListener("beforeunload", unmountChildWindow);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("beforeunload", unmountChildWindow);
      unmountChildWindow();
    };
  }, [childWindow]);

  useEffect(() => {
    IpcSender.req.system.setAsLoginWindow(({ success }) => {
      if (!success) {
        Toast.warn("초기 창 설정에 실패했습니다. 5초 후 재시작됩니다.");
        setTimeout(() => {
          IpcSender.system.terminateSignal();
        }, 5000);
      }
    });
  }, []);

  return (
    <div className="page login">
      <div className="login-cover">
        <LoginTopBar />
        <div className={"form" + JsxUtil.classByCondition(signupMode, "hidden")}>
          <div className="addition">언제 어디서나, 쉽고 편하게.</div>
          <div className="title">메모리얼 로그인</div>
          <div className="input-wrapper">
            <div className="label">아이디</div>
            <Input onChange={setSigninId} value={signinId} />
          </div>
          <div className="input-wrapper">
            <div className="label">비밀번호</div>
            <Input type="password" onChange={setSigninPassword} value={signinPassword} onEnter={tryLogin} />
          </div>
          <div className="btn login-btn" onClick={tryLogin}>
            로그인
          </div>
          <div className="btn signup-btn" onClick={goToSignUp}>
            회원가입
          </div>
          <div className="splitter">
            <div className="line"></div>
            <div className="label">또는</div>
            <div className="line"></div>
          </div>
          <div
            className="btn google-auth-btn"
            onMouseEnter={(e) => setGoogleBindingCancelHover(true)}
            onMouseLeave={(e) => setGoogleBindingCancelHover(false)}
            onClick={
              googleBinding
                ? (e) => {
                    setGoogleBinding(false);
                    setGoogleBindingCancelHover(false);
                    setCurrentUserInfo(null);
                    setCurrentUserAuth(null);
                  }
                : tryLoginWithGoogleOauth
            }
          >
            {googleBinding ? (
              <div className="text">{googleBindingCancelHover ? "취소" : "구글 계정 연동 중"}</div>
            ) : (
              <>
                <div className="img-wrapper">
                  <img src={GoogleLogo} />
                </div>
                <div className="text">구글 계정으로 로그인</div>
              </>
            )}
          </div>
        </div>
        <div className={"form signup" + JsxUtil.classByCondition(!signupMode, "hidden")}>
          <div className="addition">오프라인에서도, 언제나 함께.</div>
          <div className="title">메모리얼 회원가입</div>
          <div className="input-wrapper">
            <div className="label">사용자 이름</div>
            <Input onChange={setSignupUserName} value={signupUserName} />
          </div>
          <div className="input-wrapper">
            <div className="label">아이디 (5자 이상)</div>
            <Input onChange={setSignupId} value={signupId} />
          </div>
          <div className="input-wrapper">
            <div className="label">비밀번호 (8자 이상)</div>
            <Input type="password" onChange={setSignupPassword} value={signupPassword} />
          </div>
          <div className="input-wrapper">
            <div className="label">비밀번호 확인</div>
            <Input
              type="password"
              onChange={setSignupPasswordConfirm}
              value={signupPasswordConfirm}
              onEnter={trySignUp}
            />
          </div>
          <div className="btn try-signup-btn" onClick={trySignUp}>
            가입하기
          </div>
          <div className="go-back" onClick={goBackToLogin}>
            <IoChevronBack />
            돌아가기
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
