import { IoCalendarOutline } from "react-icons/io5";
import "./TodoContent.scss";
import DatePicker from "react-datepicker";
import { createRef, useRef } from "react";
import "react-datepicker/dist/react-datepicker.css";

const TodoContent = () => {
  let datePickerRef = createRef();

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
        <div className="input-wrapper">
          <input placeholder="할 일 또는 이벤트 추가" />
          <div className="options">
            <div
              className="option"
              onClick={(e) => {
                datePickerRef.current.setOpen(true);
              }}
            >
              <IoCalendarOutline />
              <DatePicker ref={datePickerRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TodoContent;
