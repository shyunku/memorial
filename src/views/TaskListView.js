import TaskList from "components/TaskList";
import moment from "moment";
import { useMemo } from "react";
import { printf } from "utils/Common";

const TaskListView = ({ taskMap, filteredTaskMap, sorter, ...rest }) => {
  // Convert taskMap to taskList while checking if the task list is sorted correctly
  const taskList = useMemo(() => {
    // follow linked list flow
    const sorted = [];
    let task = Object.values(taskMap).find((task) => task.prev == null);
    while (task != null) {
      sorted.push(task);
      task = task.next;
    }
    if (sorted.length != Object.values(taskMap).length) {
      console.error("Task list is not sorted correctly");
      console.log(sorted, taskMap);
      for (let t of Object.values(taskMap)) {
        if (sorted.indexOf(t) == -1) {
          sorted.push(t);
          console.log(t);
        }
      }
    }
    return sorted;
  }, [taskMap]);

  // Filter sorted task list (taskList)
  const sortedAndFilteredTaskList = useMemo(() => {
    let sorted = [];
    for (let task of taskList) {
      if (filteredTaskMap[task.id]) {
        sorted.push(task);
      }
    }

    // sort by outer sorter if provided
    if (sorter != null && typeof sorter == "function") {
      sorted = sorted.sort(sorter);
    }
    return sorted;
  }, [taskList, filteredTaskMap, sorter]);

  // Split task list into done and not done
  const [doneTaskList, notDoneTaskList] = useMemo(() => {
    const doneTasks = [];
    const notDoneTasks = [];

    for (const task of sortedAndFilteredTaskList) {
      if (task.done) {
        doneTasks.push(task);
      } else {
        notDoneTasks.push(task);
      }
    }

    return [doneTasks, notDoneTasks];
  }, [sortedAndFilteredTaskList]);

  return (
    <div className="todo-item-groups">
      <div className="todo-item-group">
        <div className="title">해야할 일 ({notDoneTaskList.length})</div>
        <TaskList taskList={notDoneTaskList} draggable={sorter == null} {...rest} />
      </div>
      <div className="todo-item-group">
        <div className="title">완료됨 ({doneTaskList.length})</div>
        <TaskList taskList={doneTaskList} draggable={sorter == null} {...rest} />
      </div>
    </div>
  );
};

export default TaskListView;
