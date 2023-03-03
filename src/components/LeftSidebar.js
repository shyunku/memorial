import { ContextMenu, Seperator, useContextMenu } from "molecules/CustomContextMenu";
import SubmitInput from "molecules/SubmitInput";
import Toast from "molecules/Toast";
import Category from "objects/Category";
import { useRef, useState } from "react";
import {
  IoAdd,
  IoClose,
  IoKey,
  IoKeyOutline,
  IoKeySharp,
  IoLockClosed,
  IoLogoBuffer,
  IoPricetag,
  IoReader,
  IoToday,
} from "react-icons/io5";
import { printf } from "utils/Common";
import IpcSender from "utils/IpcSender";
import JsxUtil from "utils/JsxUtil";
import "./LeftSidebar.scss";
import ProfileImage from "./ProfileImage";

export const TODO_MENU_TYPE = {
  ALL: "모든 할일",
  TODAY: "오늘의 할일",
};

export const TODO_MENU_TYPE_TO_ICON = {
  [TODO_MENU_TYPE.ALL]: <IoLogoBuffer />,
  [TODO_MENU_TYPE.TODAY]: <IoToday />,
};

const LeftSidebar = ({
  setSelectedTodoMenuType,
  selectedTodoMenuType,
  categories,
  onCategoryAdd,
  onCategoryDelete,
}) => {
  const addCategoryCxt = useContextMenu({ clearInputsOnBlur: true });
  const addSecretCategoryCxt = useContextMenu({ clearInputsOnBlur: true });
  const addSecretCategoryRef = useRef();

  const tryAddCategory = (categoryName) => {
    const category = new Category(categoryName, false);
    return new Promise((resolve, reject) => {
      IpcSender.req.category.addCategory(category.toEntity(), ({ success, data }) => {
        if (success) {
          addCategoryCxt.closer();
          onCategoryAdd?.(category, data.lastID);
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  };

  const tryAddSecretCategory = (rawPassword) => {
    const categoryName = addSecretCategoryRef.current.valueOf();
    if (rawPassword.length === 0) {
      addSecretCategoryRef.current.warn();
      return false;
    }
    const category = new Category(categoryName, true);
    return new Promise((resolve, reject) => {
      IpcSender.req.category.addCategory(category.toEntity(), ({ success, data }) => {
        if (success) {
          addSecretCategoryRef.current.clear();
          addSecretCategoryCxt.closer();
          onCategoryAdd?.(category, data.lastID);
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  };

  const tryDeleteCategory = (categoryId) => {
    IpcSender.req.category.getCategoryTasks(categoryId, ({ success, data }) => {
      if (success) {
        if (data.length > 0) {
          Toast.warn(`${data.length}개의 항목에서 해당 카테고리를 사용중입니다.`);
          return;
        }

        IpcSender.req.category.deleteCategory(categoryId, ({ success }) => {
          if (success) {
            onCategoryDelete?.(categoryId);
          } else {
            console.error("Failed to delete category");
          }
        });
      }
    });
  };

  return (
    <div className="component left-sidebar">
      <div className="todo-menu-groups">
        <div className="todo-menu-group standard">
          <div className="header">
            <div className="title">일반</div>
            <div className="buttons"></div>
          </div>
          <div className="todo-menus">
            {Object.values(TODO_MENU_TYPE).map((menuType) => (
              <div
                key={menuType}
                className={`todo-menu ${selectedTodoMenuType === menuType ? "selected" : ""}`}
                onClick={() => setSelectedTodoMenuType(menuType)}
              >
                <div className="icon-wrapper">{TODO_MENU_TYPE_TO_ICON[menuType]}</div>
                <div className="title">{menuType}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="todo-menu-group custom">
          <div className="header">
            <div className="title">카테고리</div>
            <div className="buttons">
              <div className="button">
                <div className="visible" ref={addCategoryCxt.openerRef} onClick={addCategoryCxt.opener}>
                  <IoAdd />
                </div>
                <ContextMenu defaultStyle={true} sticky={true} reference={addCategoryCxt.ref}>
                  <SubmitInput placeholder="새로운 카테고리 생성" onSubmit={tryAddCategory} maxLength={20} />
                </ContextMenu>
              </div>
              <div className="button">
                <div className="visible key" ref={addSecretCategoryCxt.openerRef} onClick={addSecretCategoryCxt.opener}>
                  <IoKey />
                </div>
                <ContextMenu defaultStyle={true} sticky={true} reference={addSecretCategoryCxt.ref}>
                  <SubmitInput placeholder="새로운 보안 카테고리 생성" innerRef={addSecretCategoryRef} maxLength={20} />
                  <Seperator />
                  <SubmitInput placeholder="암호" onSubmit={tryAddSecretCategory} secret={true} maxLength={30} />
                </ContextMenu>
              </div>
            </div>
          </div>
          <div className="todo-menus">
            {Object.values(categories).map((category) => (
              <div
                className={"todo-menu" + JsxUtil.classByEqual(selectedTodoMenuType, category.id, "selected")}
                key={category.id}
                onClick={() => setSelectedTodoMenuType(category.id)}
              >
                <div className="icon-wrapper">{category.secret ? <IoKeySharp /> : <IoReader />}</div>
                <div className="title">{category.title}</div>
                <div className="delete-btn" onClick={(e) => tryDeleteCategory(category.id)}>
                  <IoClose />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="account-section">
        <ProfileImage />
        <div className="profile-summary">
          <div className="email">whdudgns7321@gmail.com</div>
          <div className="status synchronizing">
            <div className="status-dot"></div>
            <div className="status-text">동기화 중...</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeftSidebar;
