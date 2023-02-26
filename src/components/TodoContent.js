import { IoCalendarOutline } from "react-icons/io5";
import "./TodoContent.scss";
import React, { createRef, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { TODO_MENU_TYPE } from "components/LeftSidebar";

import Task from "objects/Task";
import TodoItemAddSection from "./TodoItemAddSection";
import TaskList from "./TaskList";
import { useOutletContext } from "react-router-dom";
import TaskListView from "views/TaskListView";
import JsxUtil from "utils/JsxUtil";
import IpcSender from "utils/IpcSender";
import Subtask from "objects/Subtask";
import { printf } from "utils/Common";
import moment from "moment";
import Category from "objects/Category";

const TASK_VIEW_MODE = {
  LIST: "리스트",
  CARD: "카드",
  CALENDAR: "캘린더",
  TIMELINE: "타임라인",
  DASHBOARD: "대시보드",
};

const TodoContent = () => {
  const props = useOutletContext();
  const { selectedTodoMenuType, category: passedCategory, categories } = props;
  const category = useMemo(() => {
    return passedCategory ?? new Category(selectedTodoMenuType, false, true);
  }, [selectedTodoMenuType, passedCategory]);

  // main objects
  const [taskMap, setTaskMap] = useState({});
  const [selectedTodoItemId, setSelectedTodoItemId] = useState(null);
  const [taskViewMode, setTaskViewMode] = useState(TASK_VIEW_MODE.LIST);

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
              const nextTask = nextTaskId != null ? newTaskMap[nextTaskId] : null;
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
            const newTaskmap = {};
            for (let i = 0; i < data.length; i++) {
              const subtaskEntity = data[i];
              const subtask = Subtask.fromEntity(subtaskEntity);
              const taskId = subtaskEntity.tid;
              if (taskMap[taskId]) {
                taskMap[taskId].addSubtask(subtask);
              }
            }
            return { ...taskMap, ...newTaskmap };
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
      IpcSender.req.tasks_categories.getTasksCategoriesList(({ success, data }) => {
        if (success) {
          setTaskMap((taskMap) => {
            const newTaskMap = {};
            for (let i = 0; i < data.length; i++) {
              const taskCategoryEntity = data[i];
              const taskId = taskCategoryEntity.tid;
              const categoryId = taskCategoryEntity.cid;
              const category = categories[categoryId];
              if (taskMap[taskId]) {
                taskMap[taskId].addCategory(category);
              }
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
  }, [categories]);

  useEffect(() => {
    if (!categories) return;
    (async () => {
      console.log(categories);
      await getTaskListSync();
      await getSubTaskListSync();
      await getTasksCategoriesListSync();
    })();
  }, [categories]);

  printf("taskMap", taskMap);
  printf("categories", categories);

  // handlers
  const onTaskAdd = (task) => {
    if (!(task instanceof Task)) {
      return;
    }
    IpcSender.req.task.addTask(task.toEntity(), ({ success, data }) => {
      if (success) {
        task.id = data.tid;
        setTaskMap((taskMap) => {
          const updated = { ...taskMap };
          let prevTask = taskMap[data.prevTaskId];
          if (prevTask) {
            prevTask.next = task;
            updated[prevTask.id] = prevTask;
          }
          task.prev = prevTask;
          updated[task.id] = task;
          return updated;
        });
      } else {
        console.error("failed to add task");
      }
    });
  };

  const onTaskDelete = (tid) => {
    IpcSender.req.task.deleteTask(tid, ({ success, data }) => {
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
  };

  const onTaskDragEndHandler = (result) => {
    const { targetId, currentId, afterTarget } = result;
    let targetTaskId = document.getElementById(targetId)?.getAttribute("todo-id");
    let currentTaskId = document.getElementById(currentId)?.getAttribute("todo-id");
    if (targetTaskId && currentTaskId) {
      targetTaskId = parseInt(targetTaskId);
      currentTaskId = parseInt(currentTaskId);

      // check if the target.next is current when afterTarget
      if (afterTarget === true && taskMap[targetTaskId].next?.id == currentTaskId) {
        return;
      }
      // check if the target.prev is current when beforeTarget
      if (afterTarget === false && taskMap[targetTaskId].prev?.id == currentTaskId) {
        return;
      }

      IpcSender.req.task.updateTaskOrder(currentTaskId, targetTaskId, afterTarget, ({ success, data }) => {
        if (success) {
          setTaskMap((taskMap) => {
            const newTaskMap = { ...taskMap };
            const targetTask = newTaskMap[targetTaskId];
            const targetNextTask = targetTask.next;
            const currentTask = newTaskMap[currentTaskId];
            const prevTask = currentTask.prev;
            const nextTask = currentTask.next;

            if (prevTask) prevTask.next = nextTask;
            if (nextTask) nextTask.prev = prevTask;

            if (afterTarget) {
              targetTask.next = currentTask;
              currentTask.prev = targetTask;
              currentTask.next = targetNextTask;
              if (targetNextTask) targetNextTask.prev = currentTask;
            } else {
              currentTask.next = targetTask;
              targetTask.prev = currentTask;
              currentTask.prev = null;
            }

            return newTaskMap;
          });
        } else {
          console.error("failed to update task order");
        }
      });
    } else {
      console.log(result);
    }
  };

  const onTaskTitleChange = (tid, title) => {
    IpcSender.req.task.updateTaskTitle(tid, title, ({ success, data }) => {
      if (success) {
        setTaskMap((taskMap) => {
          const task = taskMap[tid];
          task.title = title;
          return { ...taskMap, [tid]: task };
        });
      } else {
        console.error("failed to update task title");
      }
    });
  };

  const onTaskDueDateChange = (tid, dueDate) => {
    IpcSender.req.task.updateTaskDueDate(tid, dueDate, ({ success, data }) => {
      if (success) {
        setTaskMap((taskMap) => {
          const task = taskMap[tid];
          task.dueDate = dueDate;
          return { ...taskMap, [tid]: task };
        });
      } else {
        console.error("failed to update task due date");
      }
    });
  };

  const onTaskMemoChange = (tid, memo) => {
    IpcSender.req.task.updateTaskMemo(tid, memo, ({ success, data }) => {
      if (success) {
        setTaskMap((taskMap) => {
          const task = taskMap[tid];
          task.memo = memo;
          return { ...taskMap, [tid]: task };
        });
      } else {
        console.error("failed to update task memo");
      }
    });
  };

  const onTaskCategoryAdd = (tid, category) => {
    IpcSender.req.task.addTaskCategory(tid, category.id, ({ success, data }) => {
      if (success) {
        setTaskMap((taskMap) => {
          const task = taskMap[tid];
          task.addCategory(category);
          return { ...taskMap, [tid]: task };
        });
      } else {
        console.error("failed to add task category");
      }
    });
  };

  const onTaskCategoryDelete = (tid, cid) => {
    IpcSender.req.task.deleteTaskCategory(tid, cid, ({ success, data }) => {
      if (success) {
        setTaskMap((taskMap) => {
          const task = taskMap[tid];
          task.deleteCategory(cid);
          return { ...taskMap, [tid]: task };
        });
      } else {
        console.error("failed to delete task category");
      }
    });
  };

  const onTaskDone = (tid, done) => {
    const now = new Date();
    IpcSender.req.task.updateTaskDone(tid, done, now.getTime(), ({ success, data }) => {
      if (success) {
        setTaskMap((taskMap) => {
          const task = taskMap[tid];
          task.done = done;
          task.doneAt = now;
          return { ...taskMap, [tid]: task };
        });
      } else {
        console.error("failed to update task done");
      }
    });
  };

  const onSubtaskAdded = (tid, subtask) => {
    if (!(subtask instanceof Subtask)) {
      return;
    }

    IpcSender.req.task.addSubtask(subtask.toEntity(), tid, ({ success, data }) => {
      if (success) {
        setTaskMap((taskMap) => {
          const task = taskMap[tid];
          task.addSubtask(subtask);
          return { ...taskMap, [tid]: task };
        });
      } else {
        console.error("failed to add subtask");
      }
    });
  };

  const onSubtaskDelete = (tid, sid) => {
    IpcSender.req.task.deleteSubtask(sid, ({ success, data }) => {
      if (success) {
        setTaskMap((taskMap) => {
          const task = taskMap[tid];
          task.deleteSubtask(sid);
          return { ...taskMap, [tid]: task };
        });
      } else {
        console.error("failed to delete subtask");
      }
    });
  };

  const onSubtaskTitleChange = (tid, sid, title) => {
    IpcSender.req.task.updateSubtaskTitle(sid, title, ({ success, data }) => {
      if (success) {
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
  };

  const onSubtaskDueDateChange = (tid, sid, dueDate) => {
    IpcSender.req.task.updateSubtaskDueDate(sid, dueDate, ({ success, data }) => {
      if (success) {
        setTaskMap((taskMap) => {
          const task = taskMap[tid];
          const subtask = task.subtasks[sid];
          if (subtask == null) {
            console.error("subtask is null", tid, sid, dueDate);
            return taskMap;
          }
          subtask.dueDate = dueDate;
          return { ...taskMap, [tid]: task };
        });
      } else {
        console.error("failed to update subtask due date");
      }
    });
  };

  const onSubtaskDone = (tid, sid, done) => {
    const now = new Date();
    IpcSender.req.task.updateSubtaskDone(sid, done, now.getTime(), ({ success, data }) => {
      if (success) {
        setTaskMap((taskMap) => {
          const task = taskMap[tid];
          const subtask = task.subtasks[sid];
          if (subtask == null) {
            console.error("subtask is null", tid, sid, done, now);
            return taskMap;
          }
          subtask.done = done;
          subtask.doneAt = now;
          return { ...taskMap, [tid]: task };
        });
      } else {
        console.error("failed to update subtask done");
      }
    });
  };

  const outerFilter = useCallback(() => {
    switch (selectedTodoMenuType) {
      case TODO_MENU_TYPE.ALL:
        return () => true;
      case TODO_MENU_TYPE.TODAY:
        return (task) => task.dueDate != null && moment(task.dueDate).isSame(moment(), "day");
      default:
        return () => true;
    }
  }, [selectedTodoMenuType]);

  return (
    <div className="todo-content">
      <div className="header">
        <div className="title">
          {category?.title ?? "-"} ({Object.keys(taskMap).length})
        </div>
        <div className="metadata">
          <div className="last-modified">마지막 수정: 5 분전</div>
        </div>
        <div className="options">
          <div className="view-modes">
            {Object.keys(TASK_VIEW_MODE).map((mode) => {
              const curTaskViewMode = TASK_VIEW_MODE[mode];
              return (
                <div
                  key={mode}
                  className={`view-mode` + JsxUtil.classByEqual(curTaskViewMode, taskViewMode, "selected")}
                  onClick={(e) => setTaskViewMode(curTaskViewMode)}
                >
                  {curTaskViewMode}
                </div>
              );
            })}
          </div>
          <div className="filter-options">
            <div className="filter-option activated">중요도 순</div>
            <div className="filter-option">시간 순</div>
          </div>
        </div>
        <div className="spliter"></div>
      </div>
      <div className="body">
        <TaskListView
          key={selectedTodoMenuType}
          taskMap={taskMap}
          category={category}
          categories={categories}
          outerFilter={(task) => outerFilter()(task)}
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
          onSubtaskAdded={onSubtaskAdded}
          onSubtaskDelete={onSubtaskDelete}
          onSubtaskTitleChange={onSubtaskTitleChange}
          onSubtaskDueDateChange={onSubtaskDueDateChange}
          onSubtaskDone={onSubtaskDone}
        />
      </div>

      <TodoItemAddSection onTaskAdd={onTaskAdd} />
    </div>
  );
};

export default TodoContent;
