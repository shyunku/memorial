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

const TASK_VIEW_MODE = {
  LIST: "리스트",
  CARD: "카드",
  CALENDAR: "캘린더",
  TIMELINE: "타임라인",
  DASHBOARD: "대시보드",
};

const TodoContent = () => {
  const props = useOutletContext();
  const { selectedTodoMenuType } = props;

  console.log(selectedTodoMenuType);

  // main objects
  const [taskMap, setTaskMap] = useState({});
  const [selectedTodoItemId, setSelectedTodoItemId] = useState(null);
  const [taskViewMode, setTaskViewMode] = useState(TASK_VIEW_MODE.LIST);

  useEffect(() => {
    IpcSender.req.task.getTaskList(({ success, data }) => {
      if (success) {
        // covert to Task objects
        setTaskMap((taskMap) => {
          const newTaskMap = {};
          for (let i = 0; i < data.length; i++) {
            const task = Task.fromEntity(data[i]);
            newTaskMap[task.id] = task;
          }
          return { ...taskMap, ...newTaskMap };
        });
      } else {
        console.error("failed to get task list");
      }

      // fetch all subtasks
      IpcSender.req.task.getSubtaskList(({ success, data }) => {
        if (success) {
          setTaskMap((taskMap) => {
            const newTaskMap = {};
            for (let i = 0; i < data.length; i++) {
              const subtaskEntity = data[i];
              const subtask = Subtask.fromEntity(subtaskEntity);
              const taskId = subtaskEntity.tid;
              if (taskMap[taskId]) {
                taskMap[taskId].addSubtask(subtask);
              }
            }
            return { ...taskMap, ...newTaskMap };
          });
        } else {
          console.error("failed to get subtask list");
        }
      });
    });
  }, []);

  printf("taskMap", taskMap);

  // handlers
  const onTaskAdd = (task) => {
    if (!(task instanceof Task)) {
      return;
    }
    IpcSender.req.task.addTask(task.toEntity(), ({ success, data }) => {
      if (success) {
        setTaskMap((taskMap) => {
          return { ...taskMap, [task.id]: task };
        });
      } else {
        console.error("failed to add task");
      }
    });
  };

  const onTaskDelete = (tid) => {
    IpcSender.req.task.deleteTask(tid, ({ success, data }) => {
      if (success) {
        setTaskMap((taskMap) => {
          const newTaskMap = { ...taskMap };
          delete newTaskMap[tid];
          return newTaskMap;
        });
      } else {
        console.error("failed to delete task");
      }
    });
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
    IpcSender.req.task.deleteSubtask(tid, sid, ({ success, data }) => {
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
        <div className="title">모든 할일 ({Object.keys(taskMap).length})</div>
        <div className="metadata">
          <div className="last-modified">마지막 수정: 3분전</div>
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
          outerFilter={(task) => outerFilter()(task)}
          selectedId={selectedTodoItemId}
          selectTodoItemHandler={setSelectedTodoItemId}
          onTaskDelete={onTaskDelete}
          onTaskDone={onTaskDone}
          onTaskTitleChange={onTaskTitleChange}
          onTaskDueDateChange={onTaskDueDateChange}
          onTaskMemoChange={onTaskMemoChange}
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
