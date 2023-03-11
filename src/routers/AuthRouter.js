import { Navigate, Outlet } from "react-router-dom";

const AuthRouter = () => {
  const isAuthVerified = false;
  if (isAuthVerified) {
    return <Outlet />;
  } else {
    return <Navigate to="/login" />;
  }
};

export default AuthRouter;
