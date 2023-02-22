import { IoCalendarOutline } from "react-icons/io5";
import "./TodoContent.scss";
import { createRef, useEffect, useMemo, useRef, useState } from "react";
import JsxUtil from "utils/JsxUtil";
import { ContextMenu, useContextMenu } from "molecules/CustomContextMenu";
import * as uuid from "uuid";
import moment from "moment/moment";
import TodoItem from "./TodoItem";
import DatePicker from "molecules/CustomDatePicker";
import Task from "objects/Task";

const TodoContent = () => {
  const [newTodoItemFocused, setNewTodoItemFocused] = useState(false);

  // main objects
  const [taskList, setTaskList] = useState([]);
  const todoList = useMemo(() => {
    return taskList.filter((task) => !task.done);
  }, [taskList]);
  const [selectedTodoItemId, setSelectedTodoItemId] = useState(null);

  const [newTodoItemContent, setNewTodoItemContent] = useState("");
  const [newTodoItemDate, setNewTodoItemDate] = useState(null);

  const [contextMenuRef, openMenu, closeMenu] = useContextMenu({
    preventCloseIdList: ["new_todo_date_picker"],
  });
  const [datePickerRef, openDatePicker, closeDatePicker] = useContextMenu({});

  // handlers
  const onTodoItemAdd = () => {
    if (newTodoItemContent.length === 0) {
      return;
    }

    const newTodoItem = {
      title: newTodoItemContent,
      done: false,
      dueDate: newTodoItemDate,
    };

    setTaskList((list) => {
      return [...list, newTodoItem];
    });

    setNewTodoItemContent("");
    setNewTodoItemDate(null);
  };

  useEffect(() => {
    for (let i = 0; i < 10; i++) {
      const randomSubTask = Math.floor(Math.random() * 13);
      const randomSubTaskDone = Math.floor(Math.random() * randomSubTask);
      const randomDate = new Date(Date.now() + Math.floor(Math.random() * 10000000000));

      let newTodo = new Task(`할 일 ${i + 1}`, null, randomDate);
      for (let j = 0; j < randomSubTask; j++) {
        let subtask = newTodo.addSubtask(`서브 할 일 ${j + 1}`);
        if (j < randomSubTaskDone) subtask.fulfilled();
      }

      setTaskList((tasks) => {
        return [...tasks, newTodo];
      });
    }
  }, []);

  return (
    <div className="todo-content">
      <div className="header">
        <div className="title">모든 할일 ({taskList.length})</div>
        <div className="metadata">
          <div className="last-modified">마지막 수정: 3분전</div>
        </div>
        <div className="options">
          <div className="view-modes">
            <div className="view-mode selected">리스트</div>
            <div className="view-mode">카드</div>
            <div className="view-mode">캘린더</div>
            <div className="view-mode">타임라인</div>
            <div className="view-mode">대시보드</div>
          </div>
          <div className="filter-options">
            <div className="filter-option activated">중요도 순</div>
            <div className="filter-option">시간 순</div>
          </div>
        </div>
        <div className="spliter"></div>
      </div>
      <div className="body">
        <div className="todo-item-groups">
          <div className="todo-item-group">
            <div className="title">해야할 일 (15)</div>
            <div className="todo-list">
              {todoList.map((todo, index) => (
                <TodoItem
                  selected={selectedTodoItemId == todo.id}
                  key={index}
                  todo={todo}
                  onClick={(e) => setSelectedTodoItemId(todo.id)}
                />
              ))}
            </div>
          </div>
          <div className="todo-item-group">
            <div className="title">완료됨 (20)</div>
            <div className="todo-list">
              {Array(20)
                .fill(0)
                .map((_, index) => {
                  return (
                    <div className="todo-item" key={index}>
                      <div className="title">할일 {index + 1}</div>
                      <div className="due-date">2023년 8월 1일</div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
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
                onTodoItemAdd();
              }
            }}
            value={newTodoItemContent}
          />
          <div className="options">
            <div className={"option" + JsxUtil.classByCondition(newTodoItemDate != null, "active")}>
              <div className="visible" onClick={openMenu}>
                <div className="icon-wrapper">
                  <IoCalendarOutline />
                </div>
                {newTodoItemDate != null && (
                  <div className="summary">{moment(newTodoItemDate).format("YY년 M월 D일 (ddd)")}</div>
                )}
              </div>
              <ContextMenu className={"menus"} reference={contextMenuRef}>
                <div
                  className="menu-option"
                  onClick={(e) => {
                    setNewTodoItemDate(Date.now());
                    closeMenu();
                  }}
                >
                  오늘로 설정
                </div>
                <div
                  className="menu-option"
                  onClick={(e) => {
                    setNewTodoItemDate(Date.now() + 86400 * 1000);
                    closeMenu();
                  }}
                >
                  내일로 설정
                </div>
                <div className="spliter"></div>
                <div id="set_custom_date_for_new_todo" className="menu-option" onClick={(e) => openDatePicker(e)}>
                  직접 설정
                </div>
                {newTodoItemDate != null && (
                  <>
                    <div className="spliter"></div>
                    <div
                      className="menu-option delete"
                      onClick={(e) => {
                        setNewTodoItemDate(null);
                        closeMenu();
                      }}
                    >
                      기한 제거
                    </div>
                  </>
                )}
              </ContextMenu>
              <DatePicker
                id="new_todo_date_picker"
                autoclose="false"
                datePickerRef={datePickerRef}
                onSelect={(e) => {
                  setNewTodoItemDate(e.getTime());
                  closeDatePicker();
                }}
              />
            </div>
          </div>
        </div>
      </div>
      <DatePicker />
    </div>
  );
};

export default TodoContent;
