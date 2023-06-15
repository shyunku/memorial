import LeftSidebar, {TODO_MENU_TYPE} from "components/LeftSidebar";
import React, {useEffect, useMemo, useState} from "react";
import {Outlet, useOutletContext} from "react-router-dom";

import "./Home.layout.scss";
import Category from "../objects/Category";

const HomeLayout = () => {
  const props = useOutletContext();
  const [selectedTodoMenuType, setSelectedTodoMenuType] = useState(
    TODO_MENU_TYPE.ALL
  );

  const {states} = props;
  const {categories} = states;

  const mergedCategories = useMemo(() => {
    const merged = {};
    for (let key in categories) {
      merged[key] = categories[key];
    }
    for (let key in TODO_MENU_TYPE) {
      let value = TODO_MENU_TYPE[key];
      merged[value] = new Category(value, false, true);
    }
    return merged;
  }, [categories]);

  const selectedCategory = useMemo(() => {
    return mergedCategories?.[selectedTodoMenuType];
  }, [selectedTodoMenuType, mergedCategories]);

  useEffect(() => {
    if (!mergedCategories.hasOwnProperty(selectedTodoMenuType)) {
      setSelectedTodoMenuType(TODO_MENU_TYPE.ALL);
    }
  }, [mergedCategories, selectedTodoMenuType]);

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
