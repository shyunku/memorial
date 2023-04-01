import LeftSidebar, { TODO_MENU_TYPE } from "components/LeftSidebar";
import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useOutletContext } from "react-router-dom";

import "./Home.layout.scss";

const HomeLayout = () => {
  const props = useOutletContext();
  const [selectedTodoMenuType, setSelectedTodoMenuType] = useState(
    TODO_MENU_TYPE.ALL
  );

  const { states } = props;
  const { categories } = states;

  const selectedCategory = useMemo(() => {
    return categories?.[selectedTodoMenuType];
  }, [selectedTodoMenuType, categories]);

  return (
    <div className="home-layout">
      <LeftSidebar
        setSelectedTodoMenuType={setSelectedTodoMenuType}
        selectedTodoMenuType={selectedTodoMenuType}
        categories={categories ?? {}}
      />
      <Outlet
        context={{
          selectedTodoMenuType,
          category: selectedCategory,
          ...props,
        }}
      />
    </div>
  );
};

export default HomeLayout;
