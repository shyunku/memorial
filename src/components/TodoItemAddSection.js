import JsxUtil from "utils/JsxUtil";
import { ContextMenu, useContextMenu } from "molecules/CustomContextMenu";
import { useRef, useState } from "react";
import Task from "objects/Task";
import { IoCalendarOutline } from "react-icons/io5";
import DueDateMenu from "./DueDateMenu";

const TodoItemAddSection = ({ onTaskAdd, category }) => {
  const [newTodoItemFocused, setNewTodoItemFocused] = useState(false);
  const [newTodoItemContent, setNewTodoItemContent] = useState("");
  const [newTodoItemDate, setNewTodoItemDate] = useState(null);

  const onAddTodoItem = () => {
    if (newTodoItemContent.length == 0) return;
    const newTask = new Task(newTodoItemContent, newTodoItemDate);
    console.log(category);
    if (category != null && category.default == false) {
      newTask.addCategory(category);
    }
    onTaskAdd(newTask);
    setNewTodoItemContent("");
    setNewTodoItemDate(null);
  };

  return (
    <div className="todo-item-add-section">
      <div
        className={
          "input-wrapper" +
          JsxUtil.classByCondition(newTodoItemFocused, "focused") +
          JsxUtil.classByCondition(newTodoItemContent.length == 0, "hidden")
        }
      >
        <input
          placeholder="할 일 또는 이벤트 추가"
          onBlur={(e) => setNewTodoItemFocused(false)}
          onFocus={(e) => setNewTodoItemFocused(true)}
          onChange={(e) => setNewTodoItemContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onAddTodoItem();
            }
          }}
          value={newTodoItemContent}
        />
        <div className="options">
          <DueDateMenu date={newTodoItemDate} setDate={setNewTodoItemDate} />
        </div>
      </div>
    </div>
  );
};

export default TodoItemAddSection;
