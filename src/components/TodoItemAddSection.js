import JsxUtil from "utils/JsxUtil";
import { useRef, useState } from "react";
import Task from "objects/Task";
import DueDateMenu from "molecules/DueDateMenu";
import TaskRepeatMenu from "molecules/TaskRepeatMenu";
import { TODO_MENU_TYPE } from "./LeftSidebar";
import moment from "moment";

const TodoItemAddSection = ({ onTaskAdd, category, expanded }) => {
  const [newTodoItemFocused, setNewTodoItemFocused] = useState(false);
  const [newTodoItemContent, setNewTodoItemContent] = useState("");
  const [newTodoItemDate, setNewTodoItemDate] = useState(null);
  const [newTodoRepeatPeriod, setNewTodoRepeatPeriod] = useState(null);

  const onAddTodoItem = () => {
    if (newTodoItemContent.length === 0) return;
    const newTask = new Task(newTodoItemContent, newTodoItemDate);
    newTask.repeatPeriod = newTodoRepeatPeriod;
    if (category != null) {
      if (category.default == false) {
        newTask.addCategory(category);
      } else if (
        category.title === TODO_MENU_TYPE.TODAY &&
        newTodoItemDate == null
      ) {
        newTask.dueDate = moment().endOf("day").toDate();
      }
    }
    onTaskAdd(newTask);
    setNewTodoItemContent("");
    setNewTodoItemDate(null);
    setNewTodoRepeatPeriod(null);
  };

  return (
    <div
      className={
        "todo-item-add-section" + JsxUtil.classByCondition(expanded, "expand")
      }
    >
      <div
        className={
          "input-wrapper" +
          JsxUtil.classByCondition(newTodoItemFocused, "focused") +
          JsxUtil.classByCondition(newTodoItemContent.length === 0, "hidden")
        }
      >
        <input
          placeholder="할 일 또는 이벤트 추가"
          onBlur={(e) => setNewTodoItemFocused(false)}
          onFocus={(e) => setNewTodoItemFocused(true)}
          onChange={(e) => setNewTodoItemContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.isComposing || e.keyCode === 229) return;
            if (e.key === "Enter") {
              onAddTodoItem();
            }
          }}
          value={newTodoItemContent}
        />
        <div className="options">
          <DueDateMenu date={newTodoItemDate} setDate={setNewTodoItemDate} />
          {newTodoItemDate != null && (
            <TaskRepeatMenu
              date={newTodoItemDate}
              curRepeat={newTodoRepeatPeriod}
              onRepeatChange={setNewTodoRepeatPeriod}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TodoItemAddSection;
