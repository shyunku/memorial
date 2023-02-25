import LeftSidebar, { TODO_MENU_TYPE } from "components/LeftSidebar";
import TopBar from "components/TopBar";
import React, { useState } from "react";
import { Outlet, useOutlet } from "react-router-dom";

import "./Home.layout.scss";

const HomeLayout = () => {
  const [selectedTodoMenuType, setSelectedTodoMenuType] = useState(TODO_MENU_TYPE.ALL);

  return (
    <div className="home-layout">
      <TopBar />
      <div className="home-layout__content">
        <LeftSidebar setSelectedTodoMenuType={setSelectedTodoMenuType} selectedTodoMenuType={selectedTodoMenuType} />
        <Outlet context={{ selectedTodoMenuType }} />
      </div>
    </div>
  );
};

export default HomeLayout;
