import { IoCalendarOutline } from "react-icons/io5";
import "./TodoContent.scss";
import { createRef, useRef, useState } from "react";
import JsxUtil from "utils/JsxUtil";
import { ContextMenu, useContextMenu } from "./CustomContextMenu";
import moment from "moment/moment";
import DatePicker from "./CustomDatePicker";

const TodoContent = () => {
  const [newTodoItemFocused, setNewTodoItemFocused] = useState(false);

  const [newTodoItemContent, setNewTodoItemContent] = useState("");
  const [newTodoItemDate, setNewTodoItemDate] = useState(null);

  const [contextMenuRef, openMenu, closeMenu] = useContextMenu({
    preventCloseIdList: ["new_todo_date_picker"],
  });
  const [datePickerRef, openDatePicker, closeDatePicker] = useContextMenu({});

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
                    <div className="todo-item" key={index}>
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
                    <div className="todo-item" key={index}>
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
            <div className={"option" + JsxUtil.classByCondition(newTodoItemDate != null, "active")}>
              <div className="visible" onClick={openMenu}>
                <div className="icon-wrapper">
                  <IoCalendarOutline />
                </div>
                {newTodoItemDate != null && (
                  <div className="summary">{moment(newTodoItemDate).format("YYYY년 MM월 DD일")}</div>
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
