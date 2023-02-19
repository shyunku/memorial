import LeftSidebar from "components/LeftSidebar";
import TopBar from "components/TopBar";
import { Outlet } from "react-router-dom";

import "./Home.layout.scss";

const HomeLayout = () => {
  return (
    <div className="home-layout">
      <TopBar />
      <div className="home-layout__content">
        <LeftSidebar />
        <Outlet />
      </div>
    </div>
  );
};

export default HomeLayout;
