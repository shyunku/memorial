import "./TodoContent.scss";
import React, {
  createRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { TODO_MENU_TYPE } from "components/LeftSidebar";
import Task from "objects/Task";
import TodoItemAddSection from "./TodoItemAddSection";
import { useOutletContext } from "react-router-dom";
import TaskListView from "views/TaskListView";
import JsxUtil from "utils/JsxUtil";
import IpcSender from "utils/IpcSender";
import Subtask from "objects/Subtask";
import moment from "moment";
import Category from "objects/Category";
import TaskCalendarView from "views/TaskCalendarView";
import Toast from "molecules/Toast";
import {
  fastInterval,
  fromRelativeTime,
  printf,
  toRelativeTime,
} from "utils/Common";
import { useSelector } from "react-redux";
import { accountAuthSlice, accountInfoSlice } from "store/accountSlice";
import {
  applyAddTask,
  applyAddTaskCategory,
  applyCreateSubtask,
  applyDeleteSubtask,
  applyDeleteTask,
  applyDeleteTaskCategory,
  applyUpdateCategoryColor,
  applyUpdateSubtaskDone,
  applyUpdateSubtaskDueDate,
  applyUpdateSubtaskTitle,
  applyUpdateTaskDone,
  applyUpdateTaskDueDate,
  applyUpdateTaskMemo,
  applyUpdateTaskOrder,
  applyUpdateTaskRepeatPeriod,
  applyUpdateTaskTitle,
} from "../hooks/UseTransaction";
import TaskListCalendarView from "../views/TaskListCalendarView";
import { VscFoldDown, VscSymbolColor } from "react-icons/vsc";
import ColorPicker from "../molecules/ColorPicker";
import AutoBlurDiv from "../molecules/AutoBlurDiv";
import TaskTimelineView from "../views/TaskTimelineView";
import TaskListTimelineView from "../views/TaskListTimelineView";

const TASK_VIEW_MODE = {
  LIST: "리스트",
  CALENDAR: "캘린더",
  TIMELINE: "타임라인",
  LIST_CALENDAR: "리스트 | 캘린더",
  // LIST_TIMELINE: "리스트 | 타임라인",
  // DASHBOARD: "대시보드",
};

const SORT_MODE = {
  DUE_DATE: "기한",
  IMPORTANT: "중요도",
  REMAIN_DATE: "남은 기한",
  CREATED_DATE: "생성일",
};

const TodoContent = (callback, deps) => {
  const props = useOutletContext();
  const {
    selectedTodoMenuType,
    category,
    addPromise,
    states,
    hideLeftSidebar,
    setHideLeftSidebar,
  } = props;

  const { taskMap, categories } = states;

  const [currentSortMode, setCurrentSortMode] = useState(SORT_MODE.DUE_DATE);
  const [timer, setTimer] = useState(0);
  const [lastTxUpdateTime, setLastTxUpdateTime] = useState(null);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const lastUpdateTimeText = useMemo(() => {
    if (lastTxUpdateTime == null) return null;
    const now = Date.now();
    const diff = now - lastTxUpdateTime;
    return (
      fromRelativeTime(diff, { showLayerCount: 1 }) + (diff > 0 ? " 전" : " 후")
    );
  }, [lastTxUpdateTime, timer]);

  // main objects
  const [selectedTodoItemId, setSelectedTodoItemId] = useState(null);
  const [taskViewMode, setTaskViewMode] = useState(TASK_VIEW_MODE.LIST);

  const isTodayCategory = useMemo(() => {
    return category?.default && category?.title === TODO_MENU_TYPE.TODAY;
  }, [category]);

  /* ------------------------------ Filters ------------------------------ */
  const categoryFilter = useMemo(() => {
    switch (selectedTodoMenuType) {
      case TODO_MENU_TYPE.ALL:
        return () => true;
      case TODO_MENU_TYPE.TODAY:
        return (task) =>
          task.dueDate != null && moment(task.dueDate).isSame(moment(), "day");
      default:
        return (task) => {
          if (
            category != null &&
            category?.default === false &&
            task.categories[category?.id] == null
          ) {
            return false;
          }
          return true;
        };
    }
  }, [category]);

  const secretFilter = useMemo(() => {
    return (task) => {
      const cidList = Object.keys(task.categories);
      for (let cid of cidList) {
        // not current category & it's secret >> hidden
        const taskCategory = categories[cid];
        if (cid !== category?.id && taskCategory.secret) {
          return false;
        }
      }
      return true;
    };
  }, [category]);

  // collect all filters to apply to tasks
  const totalFilters = useMemo(() => {
    return [categoryFilter, secretFilter];
  }, [categoryFilter, secretFilter]);

  // create a final filter function that combines all filters
  const finalStandaloneFilter = useMemo(() => {
    return (task) => {
      for (let filter of totalFilters) {
        if (filter(task) === false) return false;
      }
      return true;
    };
  }, [totalFilters]);

  // finally, apply all filters to taskMap
  const filteredTaskMap = useMemo(() => {
    const filtered = {};
    for (let task of Object.values(taskMap)) {
      if (finalStandaloneFilter(task)) filtered[task.id] = task;
    }
    return filtered;
  }, [taskMap, finalStandaloneFilter]);

  const filteredUndoneTaskCount = useMemo(() => {
    let length = 0;
    for (let task of Object.values(filteredTaskMap)) {
      if (task.done == false) length++;
    }
    return length;
  }, [filteredTaskMap]);

  /* ------------------------------ Sorters ------------------------------ */
  const sorter = useMemo(() => {
    switch (currentSortMode) {
      case SORT_MODE.IMPORTANT:
        return null;
      case SORT_MODE.REMAIN_DATE:
        return (t1, t2) => {
          if (t1.dueDate == null && t2.dueDate == null) return 0;
          if (t1.dueDate == null) return 1;
          if (t2.dueDate == null) return -1;
          return moment(t2.dueDate).diff(moment(t1.dueDate));
        };
      case SORT_MODE.DUE_DATE:
        return (t1, t2) => {
          if (t1.dueDate == null && t2.dueDate == null) return 0;
          if (t1.dueDate == null) return 1;
          if (t2.dueDate == null) return -1;
          return moment(t1.dueDate).diff(moment(t2.dueDate));
        };
      case SORT_MODE.CREATED_DATE:
        return (t1, t2) => {
          return moment(t2.createdDate).diff(moment(t1.createdDate));
        };
      default:
        return null;
    }
  }, [currentSortMode]);

  const getCategoryListSync = useCallback(() => {
    return new Promise((resolve, reject) => {
      IpcSender.req.category.getCategoryList(({ success, data }) => {
        if (success) {
          const newCategories = {};
          data.forEach((category) => {
            const c = Category.fromEntity(category);
            c.default = false;
            newCategories[category.cid] = c;
          });
          resolve({ categories: newCategories });
        } else {
          Toast.error("Failed to fetch data category list");
          console.error(`Failed to get category list`);
          reject();
        }
      });
    });
  }, []);

  const getTaskListSync = useCallback((transition) => {
    return new Promise((resolve, reject) => {
      IpcSender.req.task.getTaskList(({ success, data }) => {
        if (success) {
          // covert to Task objects
          const newTaskMap = {};
          for (let i = 0; i < data.length; i++) {
            const raw = data[i];
            const task = Task.fromEntity(raw);
            newTaskMap[task.id] = task;
          }

          // rearrange tasks and set next/prev nodes (linked list)
          for (let rawTask of data) {
            const nextTaskId = rawTask.next;
            const nextTask = nextTaskId != null ? newTaskMap[nextTaskId] : null;
            const curTask = newTaskMap[rawTask.tid];

            if (curTask) curTask.next = nextTask;
            if (nextTask) nextTask.prev = curTask;
          }
          resolve({ ...transition, taskMap: { ...taskMap, ...newTaskMap } });
        } else {
          console.error("failed to get task list");
          reject();
        }
      });
    });
  }, []);

  const getSubTaskListSync = useCallback((transition) => {
    // fetch all subtasks
    return new Promise((resolve, reject) => {
      const { taskMap } = transition;
      IpcSender.req.task.getSubtaskList(({ success, data }) => {
        if (success) {
          for (let i = 0; i < data.length; i++) {
            const subtaskEntity = data[i];
            const subtask = Subtask.fromEntity(subtaskEntity);
            const taskId = subtaskEntity.tid;
            if (taskMap[taskId]) {
              taskMap[taskId].addSubtask(subtask);
            }
          }
          resolve({ ...transition, taskMap: { ...taskMap } });
        } else {
          console.error("failed to get subtask list");
          reject();
        }
      });
    });
  }, []);

  const getTasksCategoriesListSync = useCallback((transition) => {
    return new Promise((resolve, reject) => {
      const { taskMap, categories } = transition;
      IpcSender.req.tasks_categories.getTasksCategoriesList(
        ({ success, data }) => {
          if (success) {
            for (let i = 0; i < data.length; i++) {
              const taskCategoryEntity = data[i];
              const taskId = taskCategoryEntity.tid;
              const categoryId = taskCategoryEntity.cid;
              const category = categories[categoryId];
              if (taskMap[taskId]) {
                taskMap[taskId].addCategory(category);
              }
            }
            resolve({ ...transition, taskMap: { ...taskMap } });
          } else {
            console.error("failed to get task list");
            reject();
          }
        }
      );
    });
  }, []);

  const fetchAll = useCallback(async () => {
    let transition;
    transition = await getCategoryListSync();
    transition = await getTaskListSync(transition);
    transition = await getSubTaskListSync(transition);
    await getTasksCategoriesListSync(transition);
    addPromise(
      () =>
        new Promise((resolve) => {
          resolve(transition);
        })
    );
    await IpcSender.req.system.stateListenReady(true);
  }, [
    addPromise,
    getSubTaskListSync,
    getTaskListSync,
    getTasksCategoriesListSync,
  ]);

  useEffect(() => {
    (async () => {
      await fetchAll();
    })();

    IpcSender.onAll("system/initializeState", fetchAll);

    return () => {
      IpcSender.offAll("system/initializeState");
      (async () => {
        await IpcSender.req.system.stateListenReady(false);
      })();
    };
  }, [fetchAll]);

  useEffect(() => {
    if (isTodayCategory && taskViewMode !== TASK_VIEW_MODE.LIST) {
      setTaskViewMode(TASK_VIEW_MODE.LIST);
    }
  }, [taskViewMode, isTodayCategory]);

  /* ------------------------------ Handlers ------------------------------ */
  const onTaskAdd = (task) => {
    if (!(task instanceof Task)) return;
    IpcSender.req.task.addTask(task.toEntity(), null);
  };

  const onTaskDelete = (tid) => {
    IpcSender.req.task.deleteTask(tid, null);
  };

  const onTaskDragEndHandler = (result) => {
    const { targetId, currentId, afterTarget } = result;
    let targetTaskId = document
      .getElementById(targetId)
      ?.getAttribute("todo-id");
    let currentTaskId = document
      .getElementById(currentId)
      ?.getAttribute("todo-id");
    if (targetTaskId != null && currentTaskId != null) {
      // check if the target.next is current when afterTarget
      if (
        afterTarget === true &&
        taskMap[targetTaskId].next?.id == currentTaskId
      ) {
        return;
      }
      // check if the target.prev is current when beforeTarget
      if (
        afterTarget === false &&
        taskMap[targetTaskId].prev?.id == currentTaskId
      ) {
        return;
      }

      IpcSender.req.task.updateTaskOrder(
        currentTaskId,
        targetTaskId,
        afterTarget,
        null
      );
    } else {
      console.log(result);
    }
  };

  const onTaskTitleChange = (tid, title) => {
    IpcSender.req.task.updateTaskTitle(tid, title, null);
  };

  const onTaskDueDateChange = (tid, dueDate) => {
    let newDueDate = dueDate;
    if (newDueDate != null) newDueDate = moment(newDueDate).valueOf();
    IpcSender.req.task.updateTaskDueDate(tid, newDueDate, null);
  };

  const onTaskMemoChange = (tid, memo) => {
    IpcSender.req.task.updateTaskMemo(tid, memo, null);
  };

  const onTaskDone = (tid, done) => {
    const now = new Date();
    IpcSender.req.task.updateTaskDone(tid, done, now.getTime(), null);
  };

  const onTaskCategoryAdd = (tid, category) => {
    IpcSender.req.task.addTaskCategory(tid, category.id, null);
  };

  const onTaskCategoryDelete = (tid, cid) => {
    IpcSender.req.task.deleteTaskCategory(tid, cid, null);
  };

  const onTaskRepeatChange = (tid, repeat) => {
    IpcSender.req.task.updateTaskRepeatPeriod(tid, repeat, null);
  };

  const onSubtaskAdded = (tid, subtask) => {
    if (!(subtask instanceof Subtask)) {
      return;
    }

    IpcSender.req.task.createSubtask(subtask.toEntity(), tid, null);
  };

  const onSubtaskDelete = (tid, sid) => {
    IpcSender.req.task.deleteSubtask(tid, sid, null);
  };

  const onSubtaskTitleChange = (tid, sid, title) => {
    IpcSender.req.task.updateSubtaskTitle(tid, sid, title, null);
  };

  const onSubtaskDueDateChange = (tid, sid, dueDate) => {
    const newDate = moment(dueDate).valueOf();
    IpcSender.req.task.updateSubtaskDueDate(tid, sid, newDate, null);
  };

  const onSubtaskDone = (tid, sid, done) => {
    const now = new Date();
    IpcSender.req.task.updateSubtaskDone(tid, sid, done, now.getTime());
  };

  const onCategoryColorChange = (cid, color) => {
    console.log(cid, color);
    IpcSender.req.category.updateCategoryColor(cid, color, null);
  };

  // printf("taskMap", taskMap);

  useEffect(() => {
    // get last update time
    IpcSender.req.system.getLastTxUpdateTime(null);
    IpcSender.onAll("system/lastTxUpdateTime", ({ success, data }) => {
      setLastTxUpdateTime(data);
    });

    return () => {
      IpcSender.offAll("system/lastTxUpdateTime");
    };
  }, []);

  useEffect(() => {
    IpcSender.onAll("task/addTask", ({ success, data }) => {
      applyAddTask({ addPromise, success, data });
    });

    IpcSender.onAll("task/deleteTask", ({ success, data }) => {
      applyDeleteTask({ addPromise, success, data });
    });

    IpcSender.onAll("task/updateTaskOrder", ({ success, data }) => {
      applyUpdateTaskOrder({ addPromise, success, data });
    });

    IpcSender.onAll("task/updateTaskTitle", ({ success, data }) => {
      applyUpdateTaskTitle({ addPromise, success, data });
    });

    IpcSender.onAll("task/updateTaskDueDate", ({ success, data }) => {
      applyUpdateTaskDueDate({ addPromise, success, data });
    });

    IpcSender.onAll("task/updateTaskMemo", ({ success, data }) => {
      applyUpdateTaskMemo({ addPromise, success, data });
    });

    IpcSender.onAll(
      "task/updateTaskDone",
      ({ success, data }, isRepeated, newDueDate) => {
        applyUpdateTaskDone({
          addPromise,
          success,
          data,
          isRepeated,
          newDueDate,
        });
      }
    );

    IpcSender.onAll("task/updateTaskRepeatPeriod", ({ success, data }) => {
      applyUpdateTaskRepeatPeriod({ addPromise, success, data });
    });

    IpcSender.onAll("task/createSubtask", ({ success, data }) => {
      applyCreateSubtask({ addPromise, success, data });
    });

    IpcSender.onAll("task/deleteSubtask", ({ success, data }) => {
      applyDeleteSubtask({ addPromise, success, data });
    });

    IpcSender.onAll("task/updateSubtaskTitle", ({ success, data }) => {
      applyUpdateSubtaskTitle({ addPromise, success, data });
    });

    IpcSender.onAll("task/updateSubtaskDueDate", ({ success, data }) => {
      applyUpdateSubtaskDueDate({ addPromise, success, data });
    });

    IpcSender.onAll("task/updateSubtaskDone", ({ success, data }) => {
      applyUpdateSubtaskDone({ addPromise, success, data });
    });

    IpcSender.onAll("task/addTaskCategory", ({ success, data }) => {
      applyAddTaskCategory({ addPromise, success, data });
    });

    IpcSender.onAll("task/deleteTaskCategory", ({ success, data }) => {
      applyDeleteTaskCategory({ addPromise, success, data });
    });

    IpcSender.onAll("category/updateCategoryColor", ({ success, data }) => {
      applyUpdateCategoryColor({ addPromise, success, data });
    });

    let timerThread = fastInterval(() => {
      setTimer((timer) => timer + 1);
    }, 1000);

    return () => {
      IpcSender.offAll("task/addTask");
      IpcSender.offAll("task/deleteTask");
      IpcSender.offAll("task/updateTaskOrder");
      IpcSender.offAll("task/updateTaskTitle");
      IpcSender.offAll("task/updateTaskDueDate");
      IpcSender.offAll("task/updateTaskMemo");
      IpcSender.offAll("task/updateTaskDone");
      IpcSender.offAll("task/updateTaskRepeatPeriod");
      IpcSender.offAll("task/createSubtask");
      IpcSender.offAll("task/deleteSubtask");
      IpcSender.offAll("task/updateSubtaskTitle");
      IpcSender.offAll("task/updateSubtaskDueDate");
      IpcSender.offAll("task/updateSubtaskDone");
      IpcSender.offAll("task/addTaskCategory");
      IpcSender.offAll("task/deleteTaskCategory");
      IpcSender.offAll("category/updateCategoryColor");

      clearInterval(timerThread);
    };
  }, [addPromise, taskMap, categories]);

  const taskListViewRef = createRef();

  const onScroll = (e) => {
    if (taskListViewRef.current == null) return;
    const topOffset = e.target.scrollTop;
    const bottomOffset =
      e.target.scrollHeight - e.target.scrollTop - e.target.clientHeight;

    if (bottomOffset < taskListViewRef.current.reachOffset) {
      taskListViewRef.current.onScrollReachBottom();
    } else if (topOffset < taskListViewRef.current.reachOffset) {
      taskListViewRef.current.onScrollReachTop();
    }
  };

  const listProps = {
    taskMap: taskMap,
    filteredTaskMap: filteredTaskMap,
    categories: categories,
    sorter: sorter,
    selectedId: selectedTodoItemId,
    selectTodoItemHandler: setSelectedTodoItemId,
    onTaskDragEndHandler: onTaskDragEndHandler,
    onTaskDelete: onTaskDelete,
    onTaskDone: onTaskDone,
    onTaskTitleChange: onTaskTitleChange,
    onTaskDueDateChange: onTaskDueDateChange,
    onTaskMemoChange: onTaskMemoChange,
    onTaskCategoryAdd: onTaskCategoryAdd,
    onTaskCategoryDelete: onTaskCategoryDelete,
    onTaskRepeatChange: onTaskRepeatChange,
    onSubtaskAdded: onSubtaskAdded,
    onSubtaskDelete: onSubtaskDelete,
    onSubtaskTitleChange: onSubtaskTitleChange,
    onSubtaskDueDateChange: onSubtaskDueDateChange,
    onSubtaskDone: onSubtaskDone,
  };

  return (
    <div className="todo-content" onScroll={onScroll}>
      <div
        className={
          "sidebar-flipper" +
          JsxUtil.classByCondition(hideLeftSidebar, "flipped")
        }
        onClick={(e) => setHideLeftSidebar(!hideLeftSidebar)}
      >
        <VscFoldDown />
      </div>
      <div className="header">
        <div className="title">
          {category?.title ?? "-"} ({filteredUndoneTaskCount})
        </div>
        <div className="metadata">
          <div className="last-modified">
            마지막 수정: {lastUpdateTimeText ?? "-"}
          </div>
          <div className={"settings"}>
            {category?.default === false && (
              <AutoBlurDiv
                className={"setting-item"}
                onClick={(e) => setColorPickerVisible(true)}
                blurHandler={(e) => setColorPickerVisible(false)}
                focused={colorPickerVisible}
                style={{ backgroundColor: category?.color }}
              >
                <VscSymbolColor />
                <ColorPicker
                  visible={colorPickerVisible}
                  color={category?.color ?? "#fff"}
                  setColor={(c) => onCategoryColorChange(category.id, c)}
                />
              </AutoBlurDiv>
            )}
          </div>
        </div>
        <div className="options">
          <div className="view-modes">
            {Object.keys(TASK_VIEW_MODE).map((mode) => {
              const curTaskViewMode = TASK_VIEW_MODE[mode];
              if (
                isTodayCategory &&
                (curTaskViewMode === TASK_VIEW_MODE.CALENDAR ||
                  curTaskViewMode === TASK_VIEW_MODE.LIST_CALENDAR)
              )
                return null;
              return (
                <div
                  key={mode}
                  className={
                    `view-mode` +
                    JsxUtil.classByEqual(
                      curTaskViewMode,
                      taskViewMode,
                      "selected"
                    )
                  }
                  onClick={(e) => setTaskViewMode(curTaskViewMode)}
                >
                  {curTaskViewMode}
                </div>
              );
            })}
          </div>
          <div className="sort-options">
            {taskViewMode === TASK_VIEW_MODE.LIST &&
              Object.keys(SORT_MODE).map((mode) => {
                const sortMode = SORT_MODE[mode];
                return (
                  <div
                    key={mode}
                    className={
                      `sort-option` +
                      JsxUtil.classByEqual(
                        currentSortMode,
                        sortMode,
                        "activated"
                      )
                    }
                    onClick={(e) => setCurrentSortMode(sortMode)}
                  >
                    {sortMode} 순
                  </div>
                );
              })}
          </div>
        </div>
        <div className="spliter"></div>
      </div>
      <div
        className={
          "body" +
          JsxUtil.classByEqual(
            taskViewMode,
            TASK_VIEW_MODE.LIST_CALENDAR,
            "multiview"
          )
        }
      >
        {{
          [TASK_VIEW_MODE.LIST]: (
            <TaskListView
              key={selectedTodoMenuType}
              ref={taskListViewRef}
              {...listProps}
            />
          ),
          [TASK_VIEW_MODE.CALENDAR]: (
            <TaskCalendarView
              filteredTaskMap={filteredTaskMap}
              categories={categories}
            />
          ),
          [TASK_VIEW_MODE.TIMELINE]: (
            <TaskTimelineView filteredTaskMap={filteredTaskMap} />
          ),
          [TASK_VIEW_MODE.LIST_CALENDAR]: (
            <TaskListCalendarView key={selectedTodoMenuType} {...listProps} />
          ),
          [TASK_VIEW_MODE.LIST_TIMELINE]: (
            <TaskListTimelineView key={selectedTodoMenuType} {...listProps} />
          ),
        }[taskViewMode] ?? <div>Currently not supported</div>}
      </div>
      <TodoItemAddSection
        onTaskAdd={onTaskAdd}
        category={category}
        expanded={hideLeftSidebar}
      />
    </div>
  );
};

export default TodoContent;
