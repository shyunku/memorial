import DatePicker from "molecules/CustomDatePicker";
import moment from "moment/moment";
import JsxUtil from "utils/JsxUtil";
import { ContextMenu, useContextMenu } from "molecules/CustomContextMenu";
import { useRef, useState } from "react";
import Task from "objects/Task";
import { IoCalendarOutline } from "react-icons/io5";
import DueDateMenu from "./DueDateMenu";

const TodoItemAddSection = ({ addTodoItemHandler }) => {
  const todoItemClickRef = useRef();

  const [newTodoItemFocused, setNewTodoItemFocused] = useState(false);
  const [newTodoItemContent, setNewTodoItemContent] = useState("");
  const [newTodoItemDate, setNewTodoItemDate] = useState(null);

  const onAddTodoItem = () => {
    if (newTodoItemContent.length == 0) return;
    addTodoItemHandler(new Task(newTodoItemContent, null, newTodoItemDate));
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
        ref={todoItemClickRef}
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
          <DueDateMenu stickRefTo={todoItemClickRef} date={newTodoItemDate} setDate={setNewTodoItemDate} />
        </div>
      </div>
    </div>
  );
};

export default TodoItemAddSection;
