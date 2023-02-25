import TaskList from "components/TaskList";
import moment from "moment";
import { useMemo } from "react";

const TaskListView = ({ taskMap, outerFilter, ...rest }) => {
  console.log(outerFilter);
  const [doneTaskMap, notDoneTaskMap] = useMemo(() => {
    const doneTasks = {};
    const notDoneTasks = {};

    if (outerFilter != null && typeof outerFilter === "function") {
      for (const taskId in taskMap) {
        const task = taskMap[taskId];

        // console.log(
        //   task.dueDate,
        //   outerFilter(task),
        //   moment(task.dueDate),
        //   moment(task.dueDate).isSame(moment(), "day")
        // );
        if (outerFilter(task)) {
          if (task.done) {
            doneTasks[taskId] = task;
          } else {
            notDoneTasks[taskId] = task;
          }
        }
      }
    }

    return [doneTasks, notDoneTasks];
  }, [taskMap]);

  return (
    <div className="todo-item-groups">
      <div className="todo-item-group">
        <div className="title">해야할 일 ({Object.keys(notDoneTaskMap).length})</div>
        <TaskList tasks={notDoneTaskMap} {...rest} />
      </div>
      <div className="todo-item-group">
        <div className="title">완료됨 ({Object.keys(doneTaskMap).length})</div>
        <TaskList tasks={doneTaskMap} {...rest} />
      </div>
    </div>
  );
};

export default TaskListView;
