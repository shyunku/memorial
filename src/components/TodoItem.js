import SubTaskProgressBar from "./SubTaskProgressBar";
import "./TodoItem.scss";

import moment from "moment/moment";
import { IoAdd, IoCalendarOutline } from "react-icons/io5";
import { useEffect, useMemo, useRef, useState } from "react";
import Task from "objects/Task";
import ExpandableDiv, { VERTICAL } from "molecules/ExpandableDiv";
import AutoBlurDiv from "molecules/AutoBlurDiv";
import JsxUtil from "utils/JsxUtil";
import DueDateMenu from "molecules/DueDateMenu";
import Subtask from "objects/Subtask";
import { VscChromeClose } from "react-icons/vsc";
import { DraggableDiv, DraggableZone } from "molecules/Draggable";
import { ContextMenu, useContextMenu } from "molecules/CustomContextMenu";
import TaskRemainTimer from "./TaskRemainTimer";
import TaskRepeatMenu from "molecules/TaskRepeatMenu";
import { fastInterval, fromRelativeTime } from "utils/Common";

const TodoItem = ({
  todo,
  categories,
  className = "",
  selected,
  draggable,
  blurHandler,
  onTaskDragEndHandler,
  onTaskDropPredict,
  onTaskTitleChange,
  onTaskDueDateChange,
  onTaskMemoChange,
  onTaskDone,
  onTaskCategoryAdd,
  onTaskCategoryDelete,
  onTaskDelete,
  onTaskRepeatChange,
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

  const [timeCounter, setTimeCounter] = useState(0);

  const [editedTitle, setEditedTitle] = useState(todo.title);
  const [editedMemo, setEditedMemo] = useState(todo.memo);
  const [newSubtaskDate, setNewSubtaskDate] = useState(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");

  const addCategoryBtnCtx = useContextMenu({
    horizontal: false,
  });
  const filteredCategories = useMemo(() => {
    let filtered = [];
    for (let cid in categories) {
      if (!todo.categories[cid]) filtered.push(categories[cid]);
    }
    return filtered;
  }, [JSON.stringify(categories), JSON.stringify(todo.categories)]);

  const dueDateText = useMemo(() => {
    if (!todo.dueDate) return "기한 없음";
    if (moment(todo.dueDate).isSame(moment().subtract(1, "day"), "day")) return "어제";
    if (moment(todo.dueDate).isSame(moment(), "day")) return "오늘";
    if (moment(todo.dueDate).isSame(moment().add(1, "day"), "day")) return "내일";
    if (moment(todo.dueDate).isSame(moment().add(2, "day"), "day")) return "모레";
    return moment(todo.dueDate).format("YY.MM.DD");
  }, [JSON.stringify(todo.dueDate)]);

  const dueTimeText = useMemo(() => {
    if (!todo.dueDate) return "";
    const dueMoment = moment(todo.dueDate);
    if (dueMoment.hours() === 23 && dueMoment.minutes() === 59) return " 자정 전";
    if (dueMoment.hours() === 0 && dueMoment.minutes() === 0) return " 새벽 0시";
    if (dueMoment.minutes() === 0) return dueMoment.format(" A h시");
    return moment(todo.dueDate).format(" A h시 mm분");
  }, [JSON.stringify(todo.dueDate)]);

  const repeatTimeText = useMemo(() => {
    if (!todo.repeatStartAt) return "";
    if (todo.repeatPeriod == "day") return `매일 ${moment(todo.repeatStartAt).format("A h시 mm분")}`;
    if (todo.repeatPeriod == "week") return `매주 ${moment(todo.repeatStartAt).format("ddd요일")}`;
    if (todo.repeatPeriod == "month") return `매월 ${moment(todo.repeatStartAt).format("D일")}`;
    if (todo.repeatPeriod == "year") return `매년 ${moment(todo.repeatStartAt).format("M월 D일")}`;
    return "";
  }, [todo.repeatStartAt, todo.repeatPeriod]);

  const remainTimeMilli = useMemo(() => {
    if (!todo.dueDate) return null;
    const dueMoment = moment(todo.dueDate);
    const nowMoment = moment();
    const diff = dueMoment.diff(nowMoment);
    return diff;
  }, [JSON.stringify(todo.dueDate), timeCounter]);

  const remainTimeText = useMemo(() => {
    if (remainTimeMilli == null) return "";
    return fromRelativeTime(remainTimeMilli < 0 ? -remainTimeMilli : remainTimeMilli, { showLayerCount: 3 });
  }, [remainTimeMilli]);

  const categoryTags = useMemo(() => {
    return Object.values(todo.categories);
  }, [JSON.stringify(todo.categories)]);
  const isOverDue = useMemo(() => {
    if (!todo.dueDate) return false;
    return moment(todo.dueDate).isBefore(moment());
  }, [JSON.stringify(todo.dueDate), timeCounter]);

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
    if (!(todo instanceof Task)) {
      console.error(`todo is not an instance of Task: ${todo}`);
      return;
    }
    const timeCounterThread = fastInterval(() => {
      setTimeCounter((timeCounter) => timeCounter + 1);
    }, 1000);

    return () => {
      clearInterval(timeCounterThread);
    };
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

  const linkedListTestJsx = (
    <div className="title">
      {todo.prev ? `${todo.prev.id} <- ` : ""}[{todo.id}]{todo.next ? ` -> ${todo.next.id}` : ""}
    </div>
  );

  return (
    <DraggableDiv
      id={`todo_item_${todo.id}`}
      className={
        "todo-item-wrapper " +
        className +
        JsxUtil.classByCondition(selected, "selected") +
        JsxUtil.classByCondition(todo.done, "done") +
        JsxUtil.classByCondition(isOverDue, "overdue")
      }
      dropPredictHandler={(e) => onTaskDropPredict(e, todo)}
      dragEndHandler={onTaskDragEndHandler}
      todo-id={todo.id}
      draggable={draggable}
    >
      <AutoBlurDiv blurHandler={blurHandler} reference={expandableRef} focused={selected} {...rest}>
        <div className="delete-button" onClick={(e) => onTaskDelete(todo.id)}>
          <VscChromeClose />
        </div>
        <DraggableZone className="todo-item">
          {/* {linkedListTestJsx} */}
          <div className="left-side">
            <div className="title">{todo.title}</div>
            {todo.dueDate != null && (
              <div className={"due-date" + JsxUtil.classByCondition(todo.dueDate != null, "active")}>
                {dueDateText} {dueTimeText}
                {todoCtx.repeatPeriod != null && todo.dueDate && ` (${repeatTimeText})`}
              </div>
            )}
          </div>
          <div className="right-side">
            {remainTimeMilli != null && (
              <div className="remain-time">
                {remainTimeText} {remainTimeMilli < 0 ? "지남" : "남음"}
              </div>
            )}
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
          </div>
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
              ></input>
              <div className="options">
                <DueDateMenu
                  withoutForm={true}
                  date={todo.dueDate}
                  setDate={(date) => {
                    onTaskDueDateChange?.(todo.id, date);
                  }}
                />
                {todo.dueDate && (
                  <TaskRepeatMenu
                    withoutForm={true}
                    curRepeat={todoCtx.repeatPeriod}
                    date={todo.repeatStartAt}
                    onRepeatChange={(rp) => onTaskRepeatChange?.(todo.id, rp)}
                  />
                )}
              </div>
            </div>
            <div className="section summary">
              <div className="category-tags">
                {categoryTags.map((category) => {
                  return (
                    <div
                      className="category-tag card"
                      key={category.id}
                      onClick={(e) => onTaskCategoryDelete?.(todo.id, category.id)}
                    >
                      {category.title}
                    </div>
                  );
                })}
                <div
                  className={
                    "category-adder-wrapper" + JsxUtil.classByCondition(filteredCategories.length === 0, "hide")
                  }
                >
                  <div
                    className={"category-adder card"}
                    ref={addCategoryBtnCtx.openerRef}
                    onClick={addCategoryBtnCtx.opener}
                  >
                    <div className="icon-wrapper">
                      <IoAdd />
                    </div>
                    <div className="label">카테고리 태그 추가</div>
                  </div>
                  <ContextMenu
                    className="category-tag-options"
                    reference={addCategoryBtnCtx.ref}
                    defaultStyle={true}
                    sticky={true}
                  >
                    {filteredCategories.map((category) => {
                      return (
                        <div
                          className="category-option"
                          key={category.id}
                          onClick={(e) => {
                            onTaskCategoryAdd?.(todo.id, category);
                            addCategoryBtnCtx.closer();
                          }}
                        >
                          {category.title}
                        </div>
                      );
                    })}
                  </ContextMenu>
                </div>
              </div>
              <TaskRemainTimer dueDate={todoCtx.dueDate} />
            </div>
            <div className="section sub-tasks-wrapper">
              <div className="left-section">
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
                              onChange={(e) => {
                                const newMap = { ...subTaskTitleInputMap };
                                newMap[subtask.id] = e.target.value;
                                setSubTaskTitleInputMap(newMap);
                              }}
                              onBlur={(e) => {
                                const newMap = { ...subTaskTitleInputMap };
                                // return to original title
                                newMap[subtask.id] = subtask.title;
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
                  </div>
                </div>
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
              <div className="right-section">
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
          </div>
        </ExpandableDiv>
      </AutoBlurDiv>
    </DraggableDiv>
  );
};

export default TodoItem;
