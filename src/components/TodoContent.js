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

const TASK_VIEW_MODE = {
  LIST: "리스트",
  CALENDAR: "캘린더",
  // TIMELINE: "타임라인",
  // DASHBOARD: "대시보드",
};

const SORT_MODE = {
  IMPORTANT: "중요도",
  DUE_DATE: "기한",
  REMAIN_DATE: "남은 기한",
  CREATED_DATE: "생성일",
};

const TodoContent = () => {
  const props = useOutletContext();
  const { selectedTodoMenuType, category: passedCategory, categories } = props;

  const [currentSortMode, setCurrentSortMode] = useState(SORT_MODE.IMPORTANT);
  const [timer, setTimer] = useState(0);
  const [lastTxUpdateTime, setLastTxUpdateTime] = useState(null);
  const lastUpdateTimeText = useMemo(() => {
    if (lastTxUpdateTime == null) return null;
    const now = Date.now();
    const diff = now - lastTxUpdateTime;
    return (
      fromRelativeTime(diff, { showLayerCount: 1 }) + (diff > 0 ? " 전" : " 후")
    );
  }, [lastTxUpdateTime, timer]);

  // main objects
  const [taskMap, setTaskMap] = useState({});
  const [selectedTodoItemId, setSelectedTodoItemId] = useState(null);
  const [taskViewMode, setTaskViewMode] = useState(TASK_VIEW_MODE.LIST);

  const category = useMemo(() => {
    return passedCategory ?? new Category(selectedTodoMenuType, false, true);
  }, [selectedTodoMenuType, passedCategory]);

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
            category.default === false &&
            task.categories[category.id] == null
          ) {
            return false;
          }
          return true;
        };
    }
  }, [category]);

  const secretFilter = useMemo(() => {
    return (task) => {
      const categories = Object.values(task.categories);
      for (let c of categories) {
        // not current category & it's secret >> hidden
        if (c.id != category.id && c.secret) {
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

  const getTaskListSync = useCallback(() => {
    return new Promise((resolve, reject) => {
      IpcSender.req.task.getTaskList(({ success, data }) => {
        if (success) {
          // covert to Task objects
          setTaskMap((taskMap) => {
            const newTaskMap = {};
            for (let i = 0; i < data.length; i++) {
              const raw = data[i];
              const task = Task.fromEntity(raw);
              newTaskMap[task.id] = task;
            }

            // rearrange tasks and set next/prev nodes (linked list)
            for (let rawTask of data) {
              const nextTaskId = rawTask.next;
              const nextTask =
                nextTaskId != null ? newTaskMap[nextTaskId] : null;
              const curTask = newTaskMap[rawTask.tid];

              if (curTask) curTask.next = nextTask;
              if (nextTask) nextTask.prev = curTask;
            }
            return { ...taskMap, ...newTaskMap };
          });
          resolve();
        } else {
          console.error("failed to get task list");
          reject();
        }
      });
    });
  }, []);

  const getSubTaskListSync = useCallback(() => {
    return new Promise((resolve, reject) => {
      // fetch all subtasks
      IpcSender.req.task.getSubtaskList(({ success, data }) => {
        if (success) {
          setTaskMap((taskMap) => {
            for (let i = 0; i < data.length; i++) {
              const subtaskEntity = data[i];
              const subtask = Subtask.fromEntity(subtaskEntity);
              const taskId = subtaskEntity.tid;
              if (taskMap[taskId]) {
                taskMap[taskId].addSubtask(subtask);
              }
            }
            return { ...taskMap };
          });
          resolve();
        } else {
          console.error("failed to get subtask list");
          reject();
        }
      });
    });
  }, []);

  const getTasksCategoriesListSync = useCallback(() => {
    return new Promise((resolve, reject) => {
      IpcSender.req.tasks_categories.getTasksCategoriesList(
        ({ success, data }) => {
          if (success) {
            setTaskMap((taskMap) => {
              for (let i = 0; i < data.length; i++) {
                const taskCategoryEntity = data[i];
                const taskId = taskCategoryEntity.tid;
                const categoryId = taskCategoryEntity.cid;
                const category = categories[categoryId];
                if (taskMap[taskId]) {
                  taskMap[taskId].addCategory(category);
                }
              }
              return { ...taskMap };
            });
            resolve();
          } else {
            console.error("failed to get task list");
            reject();
          }
        }
      );
    });
  }, [categories]);

  useEffect(() => {
    if (!categories) return;
    (async () => {
      await getTaskListSync();
      await getSubTaskListSync();
      await getTasksCategoriesListSync();
    })();

    IpcSender.onAll("system/initializeState", async () => {
      await getTaskListSync();
      await getSubTaskListSync();
      await getTasksCategoriesListSync();
    });

    return () => {
      IpcSender.offAll("system/initializeState");
    };
  }, [categories]);

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

  // printf("taskMap", taskMap);

  useEffect(() => {
    // get last update time
    IpcSender.req.system.getLastTxUpdateTime(null);
    IpcSender.onAll("system/lastTxUpdateTime", ({ success, data }) => {
      setLastTxUpdateTime(data);
    });

    IpcSender.onAll("task/addTask", ({ success, data }) => {
      if (success) {
        const task = new Task();
        task.id = data.tid;
        task.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
        task.doneAt = data.doneAt ? new Date(data.doneAt) : null;
        task.dueDate = data.dueDate ? new Date(data.dueDate) : null;
        task.title = data.title;
        task.memo = data.memo;
        task.done = data.done;
        task.categories = data.categories;
        task.repeatPeriod = data.repeatPeriod;
        task.repeatStartAt = data.repeatStartAt
          ? new Date(data.repeatStartAt)
          : null;

        setTaskMap((taskMap) => {
          const updated = { ...taskMap };
          let prevTask = taskMap[data.prevTaskId];
          if (prevTask) {
            prevTask.next = task;
            updated[prevTask.id] = prevTask;
          }
          task.prev = prevTask;
          updated[task.id] = task;
          console.log(updated, task);
          return updated;
        });
      } else {
        console.error("failed to add task");
      }
    });

    IpcSender.onAll("task/deleteTask", ({ success, data }) => {
      if (success) {
        let delTaskId = data.tid;
        setTaskMap((taskMap) => {
          const newTaskMap = { ...taskMap };
          let origNext = newTaskMap[delTaskId]?.next;
          let origPrev = newTaskMap[delTaskId]?.prev;
          if (origNext) {
            origNext.prev = origPrev;
          }
          if (origPrev) {
            origPrev.next = origNext;
          }
          delete newTaskMap[delTaskId];
          return newTaskMap;
        });
      } else {
        console.error("failed to delete task");
      }
    });

    IpcSender.onAll("task/updateTaskOrder", ({ success, data }) => {
      if (success) {
        const { tid: currentTaskId, targetTaskId, afterTarget } = data;

        setTaskMap((taskMap) => {
          const newTaskMap = { ...taskMap };
          const targetTask = newTaskMap[targetTaskId];
          const currentTask = newTaskMap[currentTaskId];
          const prevTask = currentTask.prev;
          const nextTask = currentTask.next;

          if (prevTask) prevTask.next = nextTask;
          if (nextTask) nextTask.prev = prevTask;

          if (afterTarget) {
            currentTask.prev = targetTask;
            currentTask.next = targetTask.next;
            if (targetTask.next) {
              targetTask.next.prev = currentTask;
            }
            targetTask.next = currentTask;
          } else {
            currentTask.next = targetTask;
            currentTask.prev = targetTask.prev;
            if (targetTask.prev) {
              targetTask.prev.next = currentTask;
            }
            targetTask.prev = currentTask;
          }

          return newTaskMap;
        });
      } else {
        console.error("failed to update task order");
      }
    });

    IpcSender.onAll("task/updateTaskTitle", ({ success, data }) => {
      if (success) {
        const { tid, title } = data;
        setTaskMap((taskMap) => {
          const task = taskMap[tid];
          task.title = title;
          return { ...taskMap, [tid]: task };
        });
      } else {
        console.error("failed to update task title");
      }
    });

    IpcSender.onAll("task/updateTaskDueDate", ({ success, data }) => {
      if (success) {
        let { tid, dueDate } = data;
        if (dueDate != null) {
          dueDate = new Date(dueDate);
        }

        setTaskMap((taskMap) => {
          const task = taskMap[tid];
          task.dueDate = dueDate;
          if (dueDate == null) {
            task.repeatPeriod = null;
            task.repeatStartAt = null;
          } else {
            task.repeatStartAt = dueDate;
          }
          return { ...taskMap, [tid]: task };
        });
      } else {
        console.error("failed to update task due date");
      }
    });

    IpcSender.onAll("task/updateTaskMemo", ({ success, data }) => {
      if (success) {
        const { tid, memo } = data;
        setTaskMap((taskMap) => {
          const task = taskMap[tid];
          task.memo = memo;
          return { ...taskMap, [tid]: task };
        });
      } else {
        console.error("failed to update task memo");
      }
    });

    IpcSender.onAll(
      "task/updateTaskDone",
      ({ success, data }, isRepeated, newDueDate) => {
        if (success) {
          const { tid, done, doneAt } = data;

          setTaskMap((taskMap) => {
            const task = taskMap[tid];
            if (isRepeated) {
              task.done = false;
              task.dueDate = new Date(newDueDate);
            } else {
              task.done = done;
              task.doneAt = doneAt;
            }
            return { ...taskMap, [tid]: task };
          });
        } else {
          console.error("failed to update task done");
        }
      }
    );

    IpcSender.onAll("task/updateTaskRepeatPeriod", ({ success, data }) => {
      if (success) {
        const { tid, repeatPeriod } = data;
        setTaskMap((taskMap) => {
          const task = taskMap[tid];
          task.repeatPeriod = repeatPeriod;
          if (task.repeatStartAt == null) {
            task.repeatStartAt = task.dueDate;
          }
          return { ...taskMap, [tid]: task };
        });
      } else {
        Toast.error("failed to update task repeat period");
        console.error("failed to update task repeat period");
      }
    });

    IpcSender.onAll("task/createSubtask", ({ success, data }) => {
      if (success) {
        const { tid, sid, title, createdAt, doneAt, dueDate, done } = data;
        const subtask = new Subtask();
        subtask.id = sid;
        subtask.title = title;
        subtask.createdAt = new Date(createdAt);
        subtask.doneAt = doneAt ? new Date(doneAt) : null;
        subtask.dueDate = dueDate ? new Date(dueDate) : null;
        subtask.done = done;

        setTaskMap((taskMap) => {
          const task = taskMap[tid];
          task.addSubtask(subtask);
          return { ...taskMap, [tid]: task };
        });
      } else {
        console.error("failed to add subtask");
      }
    });

    IpcSender.onAll("task/deleteSubtask", ({ success, data }) => {
      if (success) {
        const { tid, sid } = data;
        setTaskMap((taskMap) => {
          const task = taskMap[tid];
          task.deleteSubtask(sid);
          return { ...taskMap, [tid]: task };
        });
      } else {
        console.error("failed to delete subtask");
      }
    });

    IpcSender.onAll("task/updateSubtaskTitle", ({ success, data }) => {
      if (success) {
        const { tid, sid, title } = data;
        setTaskMap((taskMap) => {
          const task = taskMap[tid];
          const subtask = task.subtasks[sid];
          if (subtask == null) {
            console.error("subtask is null", tid, sid, title);
            return taskMap;
          }
          subtask.title = title;
          return { ...taskMap, [tid]: task };
        });
      } else {
        console.error("failed to update subtask title");
      }
    });

    IpcSender.onAll("task/updateSubtaskDueDate", ({ success, data }) => {
      if (success) {
        const { tid, sid, dueDate } = data;
        setTaskMap((taskMap) => {
          const task = taskMap[tid];
          const subtask = task.subtasks[sid];
          if (subtask == null) {
            console.error("subtask is null", tid, sid, dueDate);
            return taskMap;
          }
          subtask.dueDate = dueDate ? new Date(dueDate) : null;
          return { ...taskMap, [tid]: task };
        });
      } else {
        console.error("failed to update subtask due date");
      }
    });

    IpcSender.onAll("task/updateSubtaskDone", ({ success, data }) => {
      if (success) {
        const { tid, sid, done, doneAt } = data;
        setTaskMap((taskMap) => {
          const task = taskMap[tid];
          const subtask = task.subtasks[sid];
          if (subtask == null) {
            console.error("subtask is null", tid, sid, done, doneAt);
            return taskMap;
          }
          subtask.done = done;
          subtask.doneAt = doneAt ? new Date(doneAt) : null;
          return { ...taskMap, [tid]: task };
        });
      } else {
        console.error("failed to update subtask done");
      }
    });

    let timerThread = fastInterval(() => {
      setTimer((timer) => timer + 1);
    }, 1000);

    return () => {
      IpcSender.offAll("system/lastTxUpdateTime");
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

      clearInterval(timerThread);
    };
  }, [categories]);

  useEffect(() => {
    IpcSender.onAll("task/addTaskCategory", ({ success, data }) => {
      if (success) {
        const { tid, cid } = data;
        console.log(taskMap, categories);
        setTaskMap((taskMap) => {
          const task = taskMap[tid];
          const category = categories[cid];
          console.log(task);
          task.addCategory(category);
          return { ...taskMap, [tid]: task };
        });
      } else {
        console.error("failed to add task category");
      }
    });

    IpcSender.onAll("task/deleteTaskCategory", ({ success, data }) => {
      if (success) {
        const { tid, cid } = data;
        setTaskMap((taskMap) => {
          const task = taskMap[tid];
          task.deleteCategory(cid);
          return { ...taskMap, [tid]: task };
        });
      } else {
        console.error("failed to delete task category");
      }
    });

    return () => {
      IpcSender.offAll("task/addTaskCategory");
      IpcSender.offAll("task/deleteTaskCategory");
    };
  }, [categories]);

  return (
    <div className="todo-content">
      <div className="header">
        <div className="title">
          {category?.title ?? "-"} ({Object.keys(filteredTaskMap).length})
        </div>
        <div className="metadata">
          <div className="last-modified">
            마지막 수정: {lastUpdateTimeText ?? "-"}
          </div>
        </div>
        <div className="options">
          <div className="view-modes">
            {Object.keys(TASK_VIEW_MODE).map((mode) => {
              const curTaskViewMode = TASK_VIEW_MODE[mode];
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
      <div className="body">
        {{
          [TASK_VIEW_MODE.LIST]: (
            <TaskListView
              key={selectedTodoMenuType}
              taskMap={taskMap}
              filteredTaskMap={filteredTaskMap}
              categories={categories}
              sorter={sorter}
              selectedId={selectedTodoItemId}
              selectTodoItemHandler={setSelectedTodoItemId}
              onTaskDragEndHandler={onTaskDragEndHandler}
              onTaskDelete={onTaskDelete}
              onTaskDone={onTaskDone}
              onTaskTitleChange={onTaskTitleChange}
              onTaskDueDateChange={onTaskDueDateChange}
              onTaskMemoChange={onTaskMemoChange}
              onTaskCategoryAdd={onTaskCategoryAdd}
              onTaskCategoryDelete={onTaskCategoryDelete}
              onTaskRepeatChange={onTaskRepeatChange}
              onSubtaskAdded={onSubtaskAdded}
              onSubtaskDelete={onSubtaskDelete}
              onSubtaskTitleChange={onSubtaskTitleChange}
              onSubtaskDueDateChange={onSubtaskDueDateChange}
              onSubtaskDone={onSubtaskDone}
            />
          ),
          [TASK_VIEW_MODE.CALENDAR]: (
            <TaskCalendarView filteredTaskMap={filteredTaskMap} />
          ),
        }[taskViewMode] ?? <div>Currently not supported</div>}
      </div>
      <TodoItemAddSection onTaskAdd={onTaskAdd} category={category} />
    </div>
  );
};

export default TodoContent;
