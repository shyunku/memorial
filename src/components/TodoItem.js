import SubTaskProgressBar from "./SubTaskProgressBar";
import "./TodoItem.scss";

import moment from "moment/moment";
import { IoCalendarOutline } from "react-icons/io5";
import { useEffect, useMemo, useRef, useState } from "react";
import Task from "objects/Task";
import ExpandableDiv, { VERTICAL } from "./ExpandableDiv";
import AutoBlurDiv from "./AutoBlurDiv";
import JsxUtil from "utils/JsxUtil";
import DueDateMenu from "./DueDateMenu";
import Subtask from "objects/Subtask";
import { VscChromeClose } from "react-icons/vsc";

const TodoItem = ({
  todo,
  className = "",
  selected,
  blurHandler,
  onTaskTitleChange,
  onTaskTitleEndDateChange,
  onTaskDone,
  onTaskDelete,
  onSubtaskAdded,
  onSubtaskTitleChange,
  onSubtaskDone,
  onSubtaskDelete,
  ...rest
}) => {
  const expandableRef = useRef();
  const titleRef = useRef();

  const [editedTitle, setEditedTitle] = useState(todo.title);
  const [taskEndDate, setTaskEndDate] = useState(todo.endDate);
  const [newSubtaskDate, setNewSubtaskDate] = useState(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  const subTaskList = useMemo(() => {
    const todoCtx = Task.fromObject(todo);
    return todoCtx.getSubTaskList() ?? [];
  });
  const [subTaskTitleInputMap, setSubTaskTitleInputMap] = useState(
    subTaskList.reduce((map, subtask) => {
      map[subtask.id] = subtask.title;
      return map;
    }, {})
  );

  useEffect(() => {
    if (!(todo instanceof Task)) {
      console.log(`todo is not an instance of Task: ${todo}`);
      return;
    }
  }, []);

  useEffect(() => {
    if (selected) return;
    setEditedTitle(todo.title);
  }, [selected]);

  useEffect(() => {
    setSubTaskTitleInputMap(
      subTaskList.reduce((map, subtask) => {
        map[subtask.id] = subtask.title;
        return map;
      }, {})
    );
  }, [JSON.stringify(todo.subtasks)]);

  const onTitleEditKeyDown = (e) => {
    if (e.key !== "Enter") return;
    if (editedTitle.length === 0) return;
    onTaskTitleChange?.(todo.id, editedTitle);
    setEditedTitle(todo.title);
    titleRef.current.blur();
  };

  const onNewSubtaskTitleKeyDown = (e) => {
    if (e.key !== "Enter") return;
    if (newSubtaskTitle.length === 0) return;
    onSubtaskAdded?.(todo.id, new Subtask(newSubtaskTitle, newSubtaskDate));
    setNewSubtaskTitle("");
    setNewSubtaskDate(null);
  };

  return (
    <AutoBlurDiv
      className={
        "todo-item-wrapper " +
        className +
        JsxUtil.classByCondition(selected, "selected") +
        JsxUtil.classByCondition(todo.done, "done")
      }
      blurHandler={blurHandler}
      reference={expandableRef}
      focused={selected}
      {...rest}
    >
      <div className="delete-button" onClick={(e) => onTaskDelete(todo.id)}>
        <VscChromeClose />
      </div>
      <div className="todo-item">
        <div className="title">{todo.title}</div>
        <div className="due-date">{todo.endDate ? moment(todo.endDate).format("YY년 M월 D일") : "기한 없음"}</div>
        <SubTaskProgressBar
          total={todo.getSubTaskCount()}
          fulfilled={todo.getFulfilledSubTaskCount()}
          done={todo.done}
          doneHandler={(done) => {
            onTaskDone?.(todo.id, done);
            setImmediate(() => {
              blurHandler?.();
            }, 0);
          }}
        />
      </div>
      <ExpandableDiv reference={expandableRef} expand={selected} className={"expandable-options"} transition={350}>
        <div className="options-wrapper">
          <div className="section metadata">
            <input
              ref={titleRef}
              className="title"
              value={editedTitle}
              onKeyDown={onTitleEditKeyDown}
              onChange={(e) => setEditedTitle(e.target.value)}
            ></input>
            <div className="options">
              <DueDateMenu
                date={taskEndDate}
                setDate={(date) => {
                  onTaskTitleEndDateChange?.(todo.id, date);
                  setTaskEndDate(todo.endDate);
                }}
              />
            </div>
          </div>
          <div className="section sub-tasks">
            <div className="sub-task-dependency-graph">
              {subTaskList.map((subtask, i) => {
                return (
                  <div
                    className={"dependency-node" + JsxUtil.classByCondition(subtask.done, "fulfilled")}
                    key={subtask.id}
                  >
                    <div className="grabber">
                      <div
                        className="circle"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSubtaskDone?.(todo.id, subtask.id, !subtask.done);
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="sub-task-list">
              {subTaskList.map((subtask, i) => {
                const titleInput = subTaskTitleInputMap[subtask.id] ?? "";
                return (
                  <div className={"sub-task" + JsxUtil.classByCondition(subtask.done, "fulfilled")} key={subtask.id}>
                    <div className="delete-button" onClick={(e) => onSubtaskDelete?.(todo.id, subtask.id)}>
                      <VscChromeClose />
                    </div>
                    <div className="sub-task-title">
                      <input
                        value={titleInput}
                        onBlur={(e) => {
                          if (titleInput === subtask.title) return;
                          if (titleInput.length === 0) {
                            setSubTaskTitleInputMap((original) => {
                              const newMap = { ...original };
                              newMap[subtask.id] = subtask.title;
                              return newMap;
                            });
                            return;
                          }
                          onSubtaskTitleChange(todo.id, subtask.id, titleInput);
                        }}
                        onChange={(e) => {
                          const newMap = { ...subTaskTitleInputMap };
                          newMap[subtask.id] = e.target.value;
                          setSubTaskTitleInputMap(newMap);
                        }}
                      />
                    </div>
                    <div className="sub-task-due-date"></div>
                  </div>
                );
              })}
              <div
                className={
                  "sub-task-add-section sub-task" + JsxUtil.classByCondition(newSubtaskTitle.length == 0, "hidden")
                }
              >
                <input
                  className="label"
                  placeholder="하위 할 일 또는 이벤트 추가"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={onNewSubtaskTitleKeyDown}
                ></input>
                <div className="subtask-options">
                  <DueDateMenu date={newSubtaskDate} setDate={setNewSubtaskDate} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </ExpandableDiv>
    </AutoBlurDiv>
  );
};

export default TodoItem;
