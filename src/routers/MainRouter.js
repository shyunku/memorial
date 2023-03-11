import HomeLayout from "layouts/Home.layout";
import RootLayout from "layouts/Root.layout";
import Home from "pages/Home";
import Login from "pages/Login";
import { BrowserRouter, HashRouter, Route, Routes } from "react-router-dom";
import AuthRouter from "./AuthRouter";

const MainRouter = () => {
  return (
    <HashRouter>
      <Routes>
        <Route element={<RootLayout />}>
          <Route element={<AuthRouter />}>
            <Route element={<HomeLayout />}>
              <Route path="*" element={<Home />} />
            </Route>
          </Route>
        </Route>
        <Route path="/login/*" element={<Login />} />
        <Route path="*" element={<div>404 Page</div>} />
      </Routes>
    </HashRouter>
  );
};

export default MainRouter;
