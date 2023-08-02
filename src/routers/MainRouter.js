import HomeLayout from "layouts/Home.layout";
import RootLayout from "layouts/Root.layout";
import Home from "pages/Home";
import Login from "pages/Login";
import { HashRouter, Route, Routes } from "react-router-dom";
import AuthRouter from "./AuthRouter";
import UpdateChecker from "../pages/UpdateChecker";

const MainRouter = () => {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AuthRouter />}>
          <Route element={<RootLayout />}>
            <Route element={<HomeLayout />}>
              <Route path="*" element={<Home />} />
            </Route>
          </Route>
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/update-checker" element={<UpdateChecker />} />
        <Route path="*" element={<div>404 Page</div>} />
      </Routes>
    </HashRouter>
  );
};

export default MainRouter;
