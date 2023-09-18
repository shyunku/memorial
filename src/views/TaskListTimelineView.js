import TaskListView from "./TaskListView";
import "./TaskListTimelineView.scss";
import { useState } from "react";
import TaskTimelineView from "./TaskTimelineView";

const TaskListTimelineView = (props) => {
  const [hoveredTaskId, setHoveredTaskId] = useState(null);

  return (
    <div className={`task-list-timeline-view`}>
      <div className={"view-segment list"}>
        <TaskListView
          {...props}
          setHoveredTaskId={setHoveredTaskId}
          hoveredTaskId={hoveredTaskId}
        />
      </div>
      <div className={"split-line"}></div>
      <div className={"view-segment timeline"}>
        <TaskTimelineView
          filteredTaskMap={props?.filteredTaskMap}
          setHoveredTaskId={setHoveredTaskId}
          splited={true}
        />
      </div>
    </div>
  );
};

export default TaskListTimelineView;
