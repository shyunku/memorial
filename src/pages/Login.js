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

  const goToHome = async (_user, _auth, withOffline = false) => {
    if (withOffline) {
      navigate("/home", { state: { offline: true } });
      return;
    }

    const auth = currentUserAuth ?? _auth;
    const user = currentUserInfo ?? _user;

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
        })
      );
      await IpcSender.req.auth.registerAuthInfoSync(
        user?.uid,
        auth?.access_token?.token,
        auth?.refresh_token?.token
      );

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

  const goBackToLogin = () => {
    // if user is on signup mode & has google auth info/user info, then show prompt
    if (signupMode && googleBinding) {
      Prompt.float(
        "회원가입 취소",
        "계정 연동을 위한 회원가입을 취소하시겠습니까?",
        {
          confirmText: "취소",
          cancelText: "계속 진행",
          onConfirm: async () => {
            setGoogleBinding(false);
            goToHome();
          },
          onCancel: () => {},
        }
      );
    } else {
      setSigninId("");
      setSigninPassword("");
      setSignupMode(false);
    }
  };

  const onGoogleLoginSuccess = (userInfo) => {
    console.log(userInfo);
    const { auth, user } = userInfo;

    setCurrentUserInfo(user);
    setCurrentUserAuth(auth);

    IpcSender.req.auth.sendGoogleOauthResult(
      userInfo,
      async ({ success, data }) => {
        if (success) {
          const { isSignupNeeded, isLocalHasNoPasswordSoLoginNeeded } = data;

          if (isLocalHasNoPasswordSoLoginNeeded) {
            Prompt.float(
              "로컬 계정 등록",
              "회원가입되었지만 로컬에 등록되지 않은 계정입니다. 오프라인에서도 사용가능하려면 로그인을 해야합니다.",
              {
                confirmText: "로컬 계정 등록",
                cancelText: "그냥 사용",
                onConfirm: () => {
                  // redirect to signup page
                  Toast.info("로컬 계정 등록을 위하여 로그인 해주세요.");
                  goBackToLogin();
                },
                onCancel: () => {
                  // redirect to home page
                  // use google auth info
                  goToHome(user, auth);
                },
              }
            );
            return;
          }

          if (isSignupNeeded) {
            Prompt.float(
              "신규 계정 등록",
              "오프라인에서도 사용가능하려면 회원가입을 해야합니다.",
              {
                confirmText: "회원가입",
                cancelText: "가입 없이 사용",
                onConfirm: () => {
                  // redirect to signup page
                  setGoogleBinding(true);
                  goToSignUp(user, auth);
                },
                onCancel: () => {
                  // redirect to home page
                  // use google auth info
                  goToHome(user, auth);
                },
              }
            );
            return;
          }

          goToHome(user, auth);
        } else {
          Toast.error("구글 계정 인증 정보 등록에 실패했습니다.");
        }
      }
    );
  };

  const tryLoginWithGoogleOauth = async () => {
    try {
      unwrapResult(await dispatch(pingTest()));
    } catch (err) {
      Toast.error("현재 서버와 연결할 수 없습니다.");
      console.error(err);
      return;
    }

    let child = window.open(
      "http://localhost:4033/v1/google_auth/login",
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
    if (currentUserInfo != null) {
      IpcSender.req.auth.signUpWithGoogleAuth(
        {
          username: signupUserName,
          authId: signupId,
          encryptedPassword: singleEncryptedPassword,
          googleAuthId: currentUserInfo.google_auth_id,
        },
        ({ success, data }) => {
          if (success) {
            Toast.success("계정 연동에 성공했습니다. 로그인해주세요.");
            goBackToLogin();
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
                Toast.error(
                  "이미 사용 중인 구글 계정이 있으신가요? 구글 계정으로 로그인해주세요."
                );
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
          const status = data;
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

        if (canLoginWithLocal) {
          setTimeout(() => {
            Prompt.float(
              "로컬 계정으로 연결",
              "오류가 발생했습니다. 로컬 계정으로 연결하시겠습니까?",
              {
                confirmText: "로컬 계정 사용",
                cancelText: "취소",
                onConfirm: () => {
                  goToHome(null, null, true);
                },
              }
            );
          }, 1000);
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
        <div
          className={"form" + JsxUtil.classByCondition(signupMode, "hidden")}
        >
          <div className="addition">언제 어디서나, 쉽고 편하게.</div>
          <div className="title">메모리얼 로그인</div>
          <div className="input-wrapper">
            <div className="label">아이디</div>
            <Input onChange={setSigninId} value={signinId} />
          </div>
          <div className="input-wrapper">
            <div className="label">비밀번호</div>
            <Input
              type="password"
              onChange={setSigninPassword}
              value={signinPassword}
              onEnter={tryLogin}
            />
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
            onClick={tryLoginWithGoogleOauth}
          >
            <div className="img-wrapper">
              <img src={GoogleLogo} />
            </div>
            <div className="text">구글 계정으로 로그인</div>
          </div>
        </div>
        <div
          className={
            "form signup" + JsxUtil.classByCondition(!signupMode, "hidden")
          }
        >
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
            <Input
              type="password"
              onChange={setSignupPassword}
              value={signupPassword}
            />
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
