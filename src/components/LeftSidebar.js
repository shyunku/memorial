import { ContextMenu, Seperator, useContextMenu } from "molecules/CustomContextMenu";
import Prompt from "molecules/Prompt";
import SubmitInput from "molecules/SubmitInput";
import Toast from "molecules/Toast";
import Category from "objects/Category";
import { useEffect, useMemo, useRef, useState } from "react";
import { IoAdd, IoClose, IoKey, IoKeySharp, IoLogoBuffer, IoReader, IoToday } from "react-icons/io5";
import { useSelector } from "react-redux";
import { useOutletContext } from "react-router-dom";
import sha256 from "sha256";
import { accountInfoSlice } from "store/accountSlice";
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
  const context = useOutletContext();
  const { localNonce, remoteNonce } = context;

  const accountInfo = useSelector(accountInfoSlice);
  const offlineMode = accountInfo?.offlineMode ?? false;
  const username = accountInfo?.username ?? accountInfo?.googleEmail ?? accountInfo?.uid ?? "Unknown";
  const profileImageUrl = (offlineMode ? accountInfo?.profileImageUrl : accountInfo?.googleProfileImageUrl) ?? null;

  const [syncStatus, syncText] = useMemo(() => {
    if (offlineMode) return ["offline", "오프라인 모드"];
    if (localNonce == remoteNonce) return ["synchronized", "동기화 완료"];
    return ["synchronizing", "동기화 중"];
  }, [offlineMode, localNonce, remoteNonce]);

  const addCategoryCxt = useContextMenu({ clearInputsOnBlur: true });
  const addSecretCategoryCxt = useContextMenu({ clearInputsOnBlur: true });

  const tryAddCategory = (categoryName) => {
    const category = new Category(categoryName, false);
    IpcSender.req.category.addCategory(category.toEntity(), null);
    addCategoryCxt.closer();
  };

  const tryAddSecretCategory = (categoryName) => {
    const category = new Category(categoryName, true);
    IpcSender.req.category.addCategory(category.toEntity(), null);
    addSecretCategoryCxt.closer();
  };

  const tryDeleteCategory = (e, categoryId) => {
    e.stopPropagation();
    IpcSender.req.category.getCategoryTasks(categoryId, ({ success, data }) => {
      if (success) {
        if (data.length > 0) {
          Toast.warn(`${data.length}개의 항목에서 해당 카테고리를 사용중입니다.`);
          return;
        }

        IpcSender.req.category.deleteCategory(categoryId, null);
      }
    });
  };

  const onCustomCategorySelect = (categoryId) => {
    const category = categories[categoryId];
    if (category) {
      if (category.secret == true) {
        Prompt.float("비밀 카테고리", `'${category.title}' 카테고리에 접근하려면 비밀번호를 입력해주세요.`, {
          inputs: [{ key: "password", placeholder: "비밀번호", type: "password" }],
          onConfirm: (data) => {
            const password = data.password;
            const hashedPassword = sha256(password);

            return new Promise((resolve, reject) => {
              IpcSender.req.category.checkCategoryPassword(hashedPassword, ({ success, data }) => {
                if (success) {
                  if (data) {
                    setSelectedTodoMenuType(categoryId);
                  } else {
                    Toast.error("비밀번호가 일치하지 않습니다.");
                    resolve(false);
                  }
                } else {
                  Toast.error(`비밀번호가 틀렸습니다.`);
                }
                resolve(true);
              });
            });
          },
        });
      } else {
        setSelectedTodoMenuType(categoryId);
      }
    }
  };

  useEffect(() => {
    IpcSender.onAll("category/addCategory", ({ success, data }) => {
      if (success) {
        const category = new Category();
        category.id = data.cid;
        category.title = data.title;
        category.secret = data.secret;
        category.locked = data.locked;
        category.color = data.color;
        onCategoryAdd?.(category, data.cid);
      } else {
        Toast.error("카테고리 생성에 실패했습니다.");
      }
    });

    IpcSender.onAll("category/deleteCategory", ({ success, data }) => {
      if (success) {
        onCategoryDelete?.(data.cid);
      } else {
        Toast.error("카테고리 삭제에 실패했습니다.");
      }
    });
  }, []);

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
                  <SubmitInput placeholder="새로운 보안 카테고리 생성" maxLength={20} onSubmit={tryAddSecretCategory} />
                </ContextMenu>
              </div>
            </div>
          </div>
          <div className="todo-menus">
            {Object.values(categories).map((category) => (
              <div
                className={"todo-menu" + JsxUtil.classByEqual(selectedTodoMenuType, category.id, "selected")}
                key={category.id}
                onClick={(e) => onCustomCategorySelect(category.id)}
              >
                <div className="icon-wrapper">{category.secret ? <IoKeySharp /> : <IoReader />}</div>
                <div className="title">{category.title}</div>
                <div className="delete-btn" onClick={(e) => tryDeleteCategory(e, category.id)}>
                  <IoClose />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="account-section">
        <ProfileImage src={profileImageUrl} />
        <div className="profile-summary">
          <div className="email">{username}</div>
          <div className={"status" + JsxUtil.class(syncStatus)}>
            <div className="status-dot"></div>
            <div className="status-text">{syncText}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeftSidebar;
