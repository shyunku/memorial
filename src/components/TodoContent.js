import { IoCalendarOutline } from "react-icons/io5";
import "./TodoContent.scss";
import DatePicker from "react-datepicker";
import { createRef, useRef, useState } from "react";
import "react-datepicker/dist/react-datepicker.css";
import JsxUtil from "utils/JsxUtil";
import "react-contexify/dist/ReactContexify.css";
import { ContextMenu, useContextMenu } from "./ContextMenu";

const TodoContent = () => {
  const [newTodoItemFocused, setNewTodoItemFocused] = useState(false);

  const [newTodoItemContent, setNewTodoItemContent] = useState("");
  const [newTodoItemDate, setNewTodoItemDate] = useState(null);

  const [contextMenuRef, onContextMenuHandler] = useContextMenu({});

  return (
    <div className="todo-content">
      <div className="header">
        <div className="title">모든 할일 (15)</div>
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
              {Array(15)
                .fill(0)
                .map((_, index) => {
                  return (
                    <div className="todo-item">
                      {/* <div className="todo-item-checkbox"></div> */}
                      <div className="title">할일 {index + 1}</div>
                      <div className="process-rate">
                        <div className="process-rate-bar" style={{ width: `${100 * Math.random()}%` }}></div>
                      </div>
                      <div className="due-date">2023년 8월 1일</div>
                    </div>
                  );
                })}
            </div>
          </div>
          <div className="todo-item-group">
            <div className="title">완료됨 (20)</div>
            <div className="todo-list">
              {Array(20)
                .fill(0)
                .map((_, index) => {
                  return (
                    <div className="todo-item">
                      {/* <div className="todo-item-checkbox"></div> */}
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
            value={newTodoItemContent}
          />

          <div className="options">
            <div
              className={"option" + JsxUtil.classByCondition(newTodoItemDate != null, "active")}
              onClick={onContextMenuHandler}
            >
              <div className="icon-wrapper">
                <IoCalendarOutline />
              </div>

              {/* <DatePicker
                ref={datePickerRef}
                onFocus={(e) => console.log(e)}
                onChange={(date) => setNewTodoItemDate(new Date(date))}
                customInput={
                  <div className="icon-wrapper">
                    <IoCalendarOutline />
                  </div>
                }
              /> */}
            </div>
          </div>
        </div>
      </div>
      <ContextMenu reference={contextMenuRef}>
        <div className="menu-option">오늘로 설정</div>
        <div className="menu-option">내일로 설정</div>
        <div className="menu-option">직접 설정</div>
        <div className="menu-option">기한 제거</div>
      </ContextMenu>
    </div>
  );
};

export default TodoContent;
