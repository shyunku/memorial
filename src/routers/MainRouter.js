import Home from "pages/Home";
import { BrowserRouter, Route, Routes } from "react-router-dom";

const MainRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
};

export default MainRouter;
