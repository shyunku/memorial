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
import { fastInterval, printf } from "utils/Common";
import { DraggableDiv, DraggableZone } from "./Draggable";

const TodoItem = ({
  todo,
  className = "",
  selected,
  blurHandler,
  onTaskDropHandler,
  onTaskDropPredict,
  onTaskTitleChange,
  onTaskDueDateChange,
  onTaskMemoChange,
  onTaskDone,
  onTaskDelete,
  onSubtaskAdded,
  onSubtaskTitleChange,
  onSubtaskDone,
  onSubtaskDelete,
  onSubtaskDueDateChange,
  ...rest
}) => {
  const expandableRef = useRef();
  const titleRef = useRef();
  const memoRef = useRef();

  const [counter, setCounter] = useState(0);

  const [editedTitle, setEditedTitle] = useState(todo.title);
  const [editedMemo, setEditedMemo] = useState(todo.memo);
  const [newSubtaskDate, setNewSubtaskDate] = useState(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  const dueDateText = useMemo(() => {
    if (!todo.dueDate) return "기한 없음";
    if (moment(todo.dueDate).isSame(moment().subtract(1, "day"), "day")) return "어제";
    if (moment(todo.dueDate).isSame(moment(), "day")) return "오늘";
    if (moment(todo.dueDate).isSame(moment().add(1, "day"), "day")) return "내일";
    if (moment(todo.dueDate).isSame(moment().add(2, "day"), "day")) return "모레";
    return moment(todo.dueDate).format("YY년 M월 D일");
  }, [JSON.stringify(todo.dueDate)]);

  const isOverDue = useMemo(() => {
    if (!todo.dueDate) return false;
    return moment(todo.dueDate).isBefore(moment());
  }, [JSON.stringify(todo.dueDate)]);

  const todoCtx = Task.fromObject(todo);
  const subtaskMap = useMemo(() => {
    return todoCtx.subtasks ?? {};
  });
  const sortedSubtaskList = useMemo(() => {
    return Object.values(subtaskMap);
  }, [JSON.stringify(subtaskMap)]);

  const [subTaskTitleInputMap, setSubTaskTitleInputMap] = useState(
    Object.values(subtaskMap).reduce((map, subtask) => {
      map[subtask.id] = subtask.title;
      return map;
    }, {})
  );

  useEffect(() => {
    if (selected) {
      const counterId = fastInterval(() => {
        setCounter((c) => c + 1);
      }, 1000);

      return () => {
        clearInterval(counterId);
      };
    }
  }, [selected]);

  useEffect(() => {
    if (!(todo instanceof Task)) {
      console.error(`todo is not an instance of Task: ${todo}`);
      return;
    }
  }, []);

  useEffect(() => {
    if (selected) return;
    setEditedTitle(todo.title);
    setEditedMemo(todo.memo);
  }, [selected]);

  useEffect(() => {
    setEditedTitle(todo.title);
  }, [todo.title]);

  useEffect(() => {
    setEditedMemo(todo.memo);
  }, [todo.memo]);

  useEffect(() => {
    setSubTaskTitleInputMap(
      Object.values(subtaskMap).reduce((map, subtask) => {
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

  const onTitleEdit = () => {
    if (editedTitle.length === 0) return;
    onTaskTitleChange?.(todo.id, editedTitle);
    setEditedTitle(todo.title);
  };

  const onMemoEdit = () => {
    if (editedMemo.length === 0) return;
    onTaskMemoChange?.(todo.id, editedMemo);
    setEditedMemo(todo.memo);
  };

  const onNewSubtaskTitleKeyDown = (e) => {
    if (e.key !== "Enter") return;
    if (newSubtaskTitle.length === 0) return;
    onSubtaskAdded?.(todo.id, new Subtask(newSubtaskTitle, newSubtaskDate));
    setNewSubtaskTitle("");
    setNewSubtaskDate(null);
  };

  const onSubtaskTitleDecision = (subtask, titleInput) => {
    if (titleInput.length === 0) {
      setSubTaskTitleInputMap((original) => {
        const newMap = { ...original };
        newMap[subtask.id] = subtask.title;
        return newMap;
      });
      return;
    }
    onSubtaskTitleChange(todo.id, subtask.id, titleInput);
  };

  // printf("todo", todo);

  return (
    <DraggableDiv
      id={`todo-item-${todo.id}`}
      className={
        "todo-item-wrapper " +
        className +
        JsxUtil.classByCondition(selected, "selected") +
        JsxUtil.classByCondition(todo.done, "done") +
        JsxUtil.classByCondition(isOverDue, "overdue")
      }
      dropPredictHandler={(e) => onTaskDropPredict(e, todo)}
      dragEndHandler={(e) => onTaskDropHandler(e, todo)}
      todo-id={todo.id}
    >
      <AutoBlurDiv blurHandler={blurHandler} reference={expandableRef} focused={selected} {...rest}>
        <div className="delete-button" onClick={(e) => onTaskDelete(todo.id)}>
          <VscChromeClose />
        </div>
        <DraggableZone className="todo-item">
          <div className="title">{todo.title}</div>
          <div className={"due-date" + JsxUtil.classByCondition(todo.dueDate != null, "active")}>{dueDateText}</div>
          <SubTaskProgressBar
            overdue={isOverDue}
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
        </DraggableZone>
        <ExpandableDiv reference={expandableRef} expand={selected} className={"expandable-options"} transition={350}>
          <div className="options-wrapper">
            <div className="section metadata">
              <input
                ref={titleRef}
                className="title"
                value={editedTitle}
                onKeyDown={onTitleEditKeyDown}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={onTitleEdit}
              ></input>
              <div className="options">
                <DueDateMenu
                  date={todo.dueDate}
                  setDate={(date) => {
                    onTaskDueDateChange?.(todo.id, date);
                  }}
                />
              </div>
            </div>
            <div className="section summary">
              <div className="progress-bar">
                <div className="percent">
                  {isOverDue ? "Outdated" : `${(100 * todoCtx.getTimeProgress()).toFixed(3)}%`}
                </div>
                <div className="progress-bar-inner" style={{ width: `${100 * todoCtx.getTimeProgress()}%` }}></div>
              </div>
            </div>
            <div className="section sub-tasks-wrapper">
              <div className="sub-tasks">
                <div className="sub-task-dependency-graph">
                  {sortedSubtaskList.map((subtask, i) => {
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
                  {sortedSubtaskList.map((subtask, i) => {
                    const titleInput = subTaskTitleInputMap[subtask.id] ?? "";
                    return (
                      <div
                        className={"sub-task" + JsxUtil.classByCondition(subtask.done, "fulfilled")}
                        key={subtask.id}
                      >
                        <div className="delete-button" onClick={(e) => onSubtaskDelete?.(todo.id, subtask.id)}>
                          <VscChromeClose />
                        </div>
                        <div className="sub-task-title">
                          <input
                            value={titleInput}
                            onBlur={(e) => {
                              if (titleInput === subtask.title) return;
                              onSubtaskTitleDecision(subtask, titleInput);
                            }}
                            onChange={(e) => {
                              const newMap = { ...subTaskTitleInputMap };
                              newMap[subtask.id] = e.target.value;
                              setSubTaskTitleInputMap(newMap);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                onSubtaskTitleDecision(subtask, titleInput);
                                e.target.blur();
                              }
                            }}
                          />
                        </div>
                        <div className="sub-task-due-date">
                          <DueDateMenu
                            date={subtask.dueDate}
                            setDate={(date) => {
                              onSubtaskDueDateChange?.(todo.id, subtask.id, date);
                            }}
                          />
                        </div>
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
              <div className="memo">
                <textarea
                  ref={memoRef}
                  placeholder="여기에 메모 작성"
                  value={editedMemo}
                  onChange={(e) => setEditedMemo(e.target.value)}
                  onBlur={onMemoEdit}
                />
              </div>
            </div>
          </div>
        </ExpandableDiv>
      </AutoBlurDiv>
    </DraggableDiv>
  );
};

export default TodoItem;
