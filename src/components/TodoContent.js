import { IoCalendarOutline } from "react-icons/io5";
import "./TodoContent.scss";
import { createRef, useEffect, useMemo, useRef, useState } from "react";

import TodoItem from "./TodoItem";

import Task from "objects/Task";
import TodoItemAddSection from "./TodoItemAddSection";
import TaskList from "./TaskList";

const TodoContent = () => {
  // main objects
  const [taskList, setTaskList] = useState([]);
  const [selectedTodoItemId, setSelectedTodoItemId] = useState(null);

  const [doneTaskList, notDoneTaskList] = useMemo(() => {
    const doneTasks = [];
    const notDoneTasks = [];

    for (let task of taskList) {
      (task.done ? doneTasks : notDoneTasks).push(task);
    }
    return [doneTasks, notDoneTasks];
  }, [taskList]);

  useEffect(() => {
    if (taskList.length > 0) return;
    for (let i = 0; i < 10; i++) {
      const randomSubTask = Math.floor(Math.random() * 13);
      const randomSubTaskDone = Math.floor(Math.random() * randomSubTask);
      const randomDate = new Date(Date.now() + Math.floor(Math.random() * 1000000000));

      let newTodo = new Task(`할 일 ${i + 1}`, null, randomDate);
      for (let j = 0; j < randomSubTask; j++) {
        let subtask = newTodo.addSubtask(`서브 할 일 ${j + 1}`);
        if (j < randomSubTaskDone) subtask.fulfilled();
      }

      if (Math.random() < 0.2) newTodo.fulfilled();

      setTaskList((tasks) => {
        return [...tasks, newTodo];
      });
    }
  }, []);

  // handlers
  const addTodoItemHandler = (task) => {
    if (!(task instanceof Task)) {
      return;
    }

    setTaskList((list) => {
      return [...list, task];
    });
  };

  const onTaskTitleChange = (tid, title) => {
    setTaskList((list) => {
      return list.map((t) => {
        if (t.id === tid) {
          t.title = title;
        }
        return t;
      });
    });
  };

  const onTaskDone = (tid, done) => {
    setTaskList((list) => {
      return list.map((t) => {
        if (t.id === tid) {
          t.done = done;
        }
        return t;
      });
    });
  };

  const onTaskDelete = (tid) => {
    setTaskList((list) => {
      return list.filter((t) => t.id !== tid);
    });
  };

  const onTaskTitleEndDateChange = (tid, endDate) => {
    setTaskList((list) => {
      return list.map((t) => {
        if (t.id === tid) {
          t.endDate = endDate;
        }
        return t;
      });
    });
  };

  const onSubtaskAdded = (tid, subtask) => {
    setTaskList((list) => {
      return list.map((t) => {
        if (t.id === tid) {
          t.addSubtask(subtask.title, subtask.endDate);
        }
        return t;
      });
    });
  };

  const onSubtaskTitleChange = (tid, sid, title) => {
    setTaskList((list) => {
      return list.map((t) => {
        if (t.id === tid) {
          t.getSubTaskList().map((s) => {
            if (s.id === sid) {
              s.title = title;
            }
            return s;
          });
        }
        return t;
      });
    });
  };

  const onSubtaskDone = (tid, sid, done) => {
    setTaskList((list) => {
      return list.map((t) => {
        if (t.id === tid) {
          t.getSubTaskList().map((s) => {
            if (s.id === sid) {
              s.done = done;
            }
            return s;
          });
        }
        return t;
      });
    });
  };

  const onSubtaskDelete = (tid, sid) => {
    setTaskList((list) => {
      return list.map((t) => {
        if (t.id === tid) {
          t.subtasks = t.getSubTaskList().filter((s) => s.id !== sid);
        }
        return t;
      });
    });
  };

  return (
    <div className="todo-content">
      <div className="header">
        <div className="title">모든 할일 ({taskList.length})</div>
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
            <div className="title">해야할 일 ({notDoneTaskList.length})</div>
            <div className="todo-list">
              <TaskList
                list={notDoneTaskList}
                selectedId={selectedTodoItemId}
                selectTodoItemHandler={setSelectedTodoItemId}
                onTaskTitleChange={onTaskTitleChange}
                onTaskDone={onTaskDone}
                onSubtaskAdded={onSubtaskAdded}
                onSubtaskTitleChange={onSubtaskTitleChange}
                onTaskTitleEndDateChange={onTaskTitleEndDateChange}
                onSubtaskDone={onSubtaskDone}
                onTaskDelete={onTaskDelete}
                onSubtaskDelete={onSubtaskDelete}
              />
            </div>
          </div>
          <div className="todo-item-group">
            <div className="title">완료됨 ({doneTaskList.length})</div>
            <div className="todo-list">
              <TaskList
                list={doneTaskList}
                selectedId={selectedTodoItemId}
                selectTodoItemHandler={setSelectedTodoItemId}
                onTaskTitleChange={onTaskTitleChange}
                onTaskDone={onTaskDone}
                onSubtaskAdded={onSubtaskAdded}
                onSubtaskTitleChange={onSubtaskTitleChange}
                onTaskTitleEndDateChange={onTaskTitleEndDateChange}
                onSubtaskDone={onSubtaskDone}
                onTaskDelete={onTaskDelete}
                onSubtaskDelete={onSubtaskDelete}
              />
            </div>
          </div>
        </div>
      </div>
      <TodoItemAddSection addTodoItemHandler={addTodoItemHandler} />
    </div>
  );
};

export default TodoContent;
