import TaskCalendarView from "./TaskCalendarView";
import TaskListView from "./TaskListView";
import "./TaskListCalendarView.scss";
import { createRef, useState } from "react";

const TaskListCalendarView = (props) => {
  const [hoveredTaskId, setHoveredTaskId] = useState(null);
  const taskListViewRef = createRef();

  const onScroll = (e) => {
    const topOffset = e.target.scrollTop;
    const bottomOffset =
      e.target.scrollHeight - e.target.scrollTop - e.target.clientHeight;

    if (bottomOffset < taskListViewRef.current.reachOffset) {
      taskListViewRef.current.onScrollReachBottom();
    } else if (topOffset < taskListViewRef.current.reachOffset) {
      taskListViewRef.current.onScrollReachTop();
    }
  };

  return (
    <div className={`task-list-calendar-view`}>
      <div className={"view-segment list"} onScroll={onScroll}>
        <TaskListView
          {...props}
          setHoveredTaskId={setHoveredTaskId}
          hoveredTaskId={hoveredTaskId}
          ref={taskListViewRef}
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
