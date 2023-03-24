import LeftSidebar, { TODO_MENU_TYPE } from "components/LeftSidebar";
import TopBar from "components/TopBar";
import Toast from "molecules/Toast";
import Category from "objects/Category";
import React, { useEffect, useMemo, useState } from "react";
import { Outlet, useOutlet } from "react-router-dom";
import IpcSender from "utils/IpcSender";

import "./Home.layout.scss";

const HomeLayout = () => {
  const [selectedTodoMenuType, setSelectedTodoMenuType] = useState(TODO_MENU_TYPE.ALL);
  const [categories, setCategories] = useState(null);
  const selectedCategory = useMemo(() => {
    return categories?.[selectedTodoMenuType];
  }, [selectedTodoMenuType, categories]);

  const fetchCategoryList = () => {
    IpcSender.req.category.getCategoryList(({ success, data }) => {
      if (success) {
        setCategories(() => {
          const newCategories = {};
          data.forEach((category) => {
            const c = Category.fromEntity(category);
            c.default = false;
            newCategories[category.cid] = c;
          });
          return newCategories;
        });
      } else {
        Toast.error("Failed to fetch data category list");
        console.error(`Failed to get category list`);
      }
    });
  };

  useEffect(() => {
    fetchCategoryList();

    IpcSender.onAll("system/initializeState", async () => {
      fetchCategoryList();
    });

    return () => {
      IpcSender.offAll("system/initializeState");
    };
  }, []);

  const onCategoryAdd = (category, cid) => {
    setCategories((prev) => {
      category.id = cid;
      return { ...prev, [cid]: category };
    });
  };

  const onCategoryDelete = (cid) => {
    if (cid == selectedTodoMenuType) {
      setSelectedTodoMenuType(TODO_MENU_TYPE.ALL);
    }
    setCategories((prev) => {
      const newCategories = { ...prev };
      delete newCategories[cid];
      return newCategories;
    });
  };

  return (
    <div className="home-layout">
      <LeftSidebar
        setSelectedTodoMenuType={setSelectedTodoMenuType}
        selectedTodoMenuType={selectedTodoMenuType}
        categories={categories ?? {}}
        onCategoryAdd={onCategoryAdd}
        onCategoryDelete={onCategoryDelete}
      />
      <Outlet context={{ selectedTodoMenuType, category: selectedCategory, categories }} />
    </div>
  );
};

export default HomeLayout;
