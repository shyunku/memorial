import SubTaskProgressBar from "./SubTaskProgressBar";
import "./TodoItem.scss";

import moment from "moment/moment";
import { IoCalendarOutline } from "react-icons/io5";
import { useEffect } from "react";
import Task from "objects/Task";
import JsxUtil from "utils/JsxUtil";

const TodoItem = ({ todo, className, selected, ...rest }) => {
  useEffect(() => {
    if (!(todo instanceof Task)) {
      console.log(`todo is not an instance of Task: ${todo}`);
      return;
    }
  }, []);
  return (
    <div className={"todo-item-wrapper " + className} {...rest}>
      <div className="todo-item">
        <div className="title">{todo.title}</div>
        <div className="due-date">{todo.endDate ? moment(todo.endDate).format("YY년 M월 D일") : "기한 없음"}</div>
        <SubTaskProgressBar total={todo.getSubTaskCount()} fulfilled={todo.getFulfilledSubTaskCount()} />
      </div>
      <div className={"expandable-options" + JsxUtil.classByCondition(selected, "selected")}>
        <div className="options-wrapper">
          <div className="section metadata">
            <div className="title">{todo.title}</div>
            <div className="options">
              <div className="due-date">
                <div className="icon-wrapper">
                  <IoCalendarOutline />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TodoItem;
