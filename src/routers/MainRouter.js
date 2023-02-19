import HomeLayout from "layouts/Home.layout";
import Home from "pages/Home";
import { BrowserRouter, Route, Routes } from "react-router-dom";

const MainRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<HomeLayout />}>
          <Route path="/" element={<Home />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default MainRouter;
