import HomeLayout from "layouts/Home.layout";
import Home from "pages/Home";
import { BrowserRouter, HashRouter, Route, Routes } from "react-router-dom";

const MainRouter = () => {
  return (
    <HashRouter>
      <Routes>
        <Route element={<HomeLayout />}>
          <Route path="/" element={<Home />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default MainRouter;
