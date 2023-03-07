import moment from "moment";
import { useMemo, useState } from "react";
import { IoRepeatOutline } from "react-icons/io5";
import JsxUtil from "utils/JsxUtil";
import { v4 } from "uuid";
import { ContextMenu, useContextMenu } from "./CustomContextMenu";
import "./TaskOptionMenu.scss";

const REPEAT_TYPES = {
  day: "매일",
  week: "매주",
  month: "매월",
  year: "매년",
};

const TaskRepeatMenu = ({ date, curRepeat, onRepeatChange, stickRefTo }) => {
  const [taskRepeatMenuId] = useState(`task_repeat_menu_${v4()}`);
  const taskRepeatMenuCtx = useContextMenu({
    preventCloseIdList: [taskRepeatMenuId],
    stickRefTo,
  });
  const taskPostfixLabel = useMemo(() => {
    if (!date) return "";
    switch (curRepeat) {
      case "day":
        return moment(date).format(" A h시 mm분");
      case "week":
        return moment(date).format(" ddd요일");
      case "month":
        return moment(date).format(" D일");
      case "year":
        return moment(date).format(" M월 D일");
    }
    return "";
  }, [date, curRepeat]);

  return (
    <div className={"option task-option-menu" + JsxUtil.classByCondition(curRepeat != null, "active")}>
      <div className="visible" ref={taskRepeatMenuCtx.openerRef} onClick={taskRepeatMenuCtx.opener}>
        <div className="icon-wrapper">
          <IoRepeatOutline />
        </div>
        {curRepeat != null && (
          <div className="summary">
            {REPEAT_TYPES?.[curRepeat] ?? "-"}
            {taskPostfixLabel}
          </div>
        )}
      </div>
      <ContextMenu className={"menus"} reference={taskRepeatMenuCtx.ref} sticky={true}>
        {Object.keys(REPEAT_TYPES).map((typeKey, index) => {
          return (
            <div
              className={"menu-option" + JsxUtil.classByEqual(curRepeat, typeKey)}
              key={typeKey}
              onClick={(e) => {
                onRepeatChange(typeKey);
                taskRepeatMenuCtx.closer();
              }}
            >
              {REPEAT_TYPES[typeKey]}
            </div>
          );
        })}
        {curRepeat != null && (
          <>
            <div className="spliter"></div>
            <div
              className={"menu-option delete"}
              onClick={(e) => {
                onRepeatChange(null);
                taskRepeatMenuCtx.closer();
              }}
            >
              반복 제거
            </div>
          </>
        )}
      </ContextMenu>
    </div>
  );
};

export default TaskRepeatMenu;
