import TopBar from "components/TopBar";
import { Outlet } from "react-router-dom";
import "./Root.layout.scss";

const RootLayout = () => {
  return (
    <div className="root-layout">
      <TopBar />
      <div className="root-layout__content">
        <Outlet />
      </div>
    </div>
  );
};

export default RootLayout;
