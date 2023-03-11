import LoginTopBar from "components/LoginTopBar";
import { IoChevronBack, IoLogoGoogle } from "react-icons/io5";
import GoogleLogo from "assets/images/google_logo.png";
import "./Login.scss";
import JsxUtil from "utils/JsxUtil";
import { useEffect, useRef, useState } from "react";
import IpcSender from "utils/IpcSender";

const Login = () => {
  const webviewRef = useRef(null);
  const [googleOauthMode, setGoogleOauthMode] = useState(false);

  const tryLoginWithGoogleOauth = () => {
    if (!webviewRef.current) return;
    window.open("http://localhost:4033/v1/google_auth/login");
    return;
    const webview = webviewRef.current;
    webview.src = "http://localhost:4033/v1/google_auth/login";

    const domReady = () => {
      setGoogleOauthMode(true);
      webview.removeEventListener("dom-ready", domReady);
    };
    webview.addEventListener("dom-ready", domReady);
  };

  const cancelGoogleOauth = () => {
    setGoogleOauthMode(false);
  };

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const onDidNavigate = (e) => {
      console.log(e);
    };
    const onDidRedirectNavigation = (e) => {
      console.log(e);
    };
    webview.addEventListener("did-navigate", onDidNavigate);
    webview.addEventListener("did-redirect-navigation", onDidRedirectNavigation);

    return () => {
      webview.removeEventListener("did-navigate", onDidNavigate);
      webview.removeEventListener("did-redirect-navigation", onDidRedirectNavigation);
    };
  }, [webviewRef.current]);

  return (
    <div className="page login">
      <div className="login-cover">
        <LoginTopBar />
        <div className={"login-form" + JsxUtil.classByCondition(googleOauthMode, "hidden")}>
          <div className="addition">언제 어디서나, 쉽고 편하게.</div>
          <div className="title">메모리얼 로그인</div>
          <div className="input-wrapper">
            <div className="label">아이디</div>
            <input />
          </div>
          <div className="input-wrapper">
            <div className="label">비밀번호</div>
            <input type="password" />
          </div>
          <div className="btn login-btn">로그인</div>
          <div className="splitter">
            <div className="line"></div>
            <div className="label">또는</div>
            <div className="line"></div>
          </div>
          <div className="btn google-auth-btn" onClick={tryLoginWithGoogleOauth}>
            <div className="img-wrapper">
              <img src={GoogleLogo} />
            </div>
            <div className="text">구글 계정으로 로그인</div>
          </div>
        </div>
        <div className={"login-form google" + JsxUtil.classByCondition(!googleOauthMode, "hidden")}>
          <webview
            ref={webviewRef}
            id="google_auth_webview"
            src="about:blank"
            partition="persist:google-oauth-view"
          ></webview>
          <div className="cancel" onClick={cancelGoogleOauth}>
            <IoChevronBack /> 뒤로 가기
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
