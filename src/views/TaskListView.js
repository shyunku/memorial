import TaskList from "components/TaskList";
import moment from "moment";
import { useMemo } from "react";
import { printf } from "utils/Common";

const TaskListView = ({ taskMap, category, outerFilter, ...rest }) => {
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
    printf("sorted", sorted);
    return sorted;
  }, [taskMap]);

  const [doneTaskList, notDoneTaskList] = useMemo(() => {
    const doneTasks = [];
    const notDoneTasks = [];

    if (outerFilter != null && typeof outerFilter === "function") {
      for (const task of taskList) {
        if (category != null && category.default === false && task.categories[category.id] == null) continue;

        if (outerFilter(task)) {
          if (task.done) {
            doneTasks.push(task);
          } else {
            notDoneTasks.push(task);
          }
        }
      }
    }

    return [doneTasks, notDoneTasks];
  }, [taskList]);

  return (
    <div className="todo-item-groups">
      <div className="todo-item-group">
        <div className="title">해야할 일 ({notDoneTaskList.length})</div>
        <TaskList taskList={notDoneTaskList} {...rest} />
      </div>
      <div className="todo-item-group">
        <div className="title">완료됨 ({doneTaskList.length})</div>
        <TaskList taskList={doneTaskList} {...rest} />
      </div>
    </div>
  );
};

export default TaskListView;
