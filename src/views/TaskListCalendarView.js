import TaskCalendarView from "./TaskCalendarView";
import TaskListView from "./TaskListView";
import "./TaskListCalendarView.scss";
import { useState } from "react";

const TaskListCalendarView = (props) => {
  const [hoveredTaskId, setHoveredTaskId] = useState(null);

  return (
    <div className={`task-list-calendar-view`}>
      <div className={"view-segment list"}>
        <TaskListView
          {...props}
          setHoveredTaskId={setHoveredTaskId}
          hoveredTaskId={hoveredTaskId}
        />
      </div>
      <div className={"split-line"}></div>
      <div className={"view-segment calendar"}>
        <TaskCalendarView
          filteredTaskMap={props?.filteredTaskMap}
          setHoveredTaskId={setHoveredTaskId}
          hoveredTaskId={hoveredTaskId}
          categories={props?.categories}
        />
      </div>
    </div>
  );
};

export default TaskListCalendarView;
