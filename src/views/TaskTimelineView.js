import { useEffect, useMemo, useState } from "react";
import moment from "moment";
import "./TaskTimelineView.scss";
import JsxUtil from "../utils/JsxUtil";
import { fromRelativeTime } from "../utils/Common";
import { IoPlay, IoPlayBack, IoPlayForward } from "react-icons/io5";

const TIMELINE_VIEW_COLS = 4;

const TaskTimelineView = ({ filteredTaskMap, splited }) => {
  const [hoveredTaskId, setHoveredTaskId] = useState(null);
  /** @type {[Date, Function]} */
  const [focusedDate, setFocusedDate] = useState(new Date());
  const splitMode = useMemo(() => {
    return splited ?? false;
  }, [splited]);

  const timelineTasks = useMemo(() => {
    // const filterLowerBound = new moment(focusedDate)
    //   .startOf("day")
    //   .subtract(3, "day");
    // const filterUpperBound = new moment(focusedDate).endOf("day").add(3, "day");
    // const filteredTasks = Object.values(filteredTaskMap).filter((task) => {
    //   const taskDate = new moment(task.date);
    //   return (
    //     taskDate.isAfter(filterLowerBound) &&
    //     taskDate.isBefore(filterUpperBound)
    //   );
    // });
    const classifiedTasks = {};
    Object.values(filteredTaskMap).forEach((task) => {
      const dayCode = new moment(task.dueDate).format("YYYYMMDD");
      if (!classifiedTasks[dayCode]) {
        classifiedTasks[dayCode] = {};
      }
      classifiedTasks[dayCode][task.id] = task;
    });
    return classifiedTasks;
  }, [focusedDate, filteredTaskMap]);

  const timelineScrollHandler = (e) => {
    const isNext = e.deltaY > 0 || (e.deltaY === 0 && e.deltaX > 0);
    const isPrev = e.deltaY < 0 || (e.deltaY === 0 && e.deltaX < 0);
    if (!isNext && !isPrev) return;

    setFocusedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + (isNext ? 1 : -1));
      return next;
    });
  };

  const onPrevYear = () => {
    setFocusedDate(new moment(focusedDate).subtract(1, "year").toDate());
  };

  const onPrevMonth = () => {
    setFocusedDate(new moment(focusedDate).subtract(1, "month").toDate());
  };

  const onCurrentMonth = () => {
    setFocusedDate(new moment());
  };

  const onNextMonth = () => {
    setFocusedDate(new moment(focusedDate).add(1, "month").toDate());
  };

  const onNextYear = () => {
    setFocusedDate(new moment(focusedDate).add(1, "year").toDate());
  };

  return (
    <div className={`task-timeline-view`} onWheel={timelineScrollHandler}>
      <div className="timeline-view-header view-header">
        <div className="options">
          <div className="option ltr" onClick={onPrevYear}>
            <div className="icon-wrapper">
              <IoPlayBack />
            </div>
            <div className="label">지난 해</div>
          </div>
          <div className="option ltr" onClick={onPrevMonth}>
            <div className="icon-wrapper">
              <IoPlay style={{ transform: `rotate(180deg)` }} />
            </div>
            <div className="label">지난 달</div>
          </div>
          <div className="option" onClick={onCurrentMonth}>
            <div className="label">현재</div>
          </div>
          <div className="option rtl" onClick={onNextMonth}>
            <div className="label">다음 달</div>
            <div className="icon-wrapper">
              <IoPlay />
            </div>
          </div>
          <div className="option rtl" onClick={onNextYear}>
            <div className="label">다음 해</div>
            <div className="icon-wrapper">
              <IoPlayForward />
            </div>
          </div>
        </div>
      </div>
      <div
        className={
          "view-body" + JsxUtil.classByCondition(splitMode, "split-mode")
        }
      >
        {Array(2 * TIMELINE_VIEW_COLS + 1)
          .fill(0)
          .map((_, index) => {
            const date = new Date(focusedDate);
            date.setDate(date.getDate() + index - TIMELINE_VIEW_COLS);
            const dayCode = moment(date).format("YYYYMMDD");
            const tasks = timelineTasks[dayCode] ?? {};

            const style = {};
            if (splitMode) {
              style.top = `calc((100% + 30px) * ${
                index - TIMELINE_VIEW_COLS
              }px)`;
            } else {
              style.left = `calc(50% + ${
                (500 + 30) * (index - TIMELINE_VIEW_COLS)
              }px)`;
            }

            return (
              <TaskTimelineDayColumn
                key={dayCode}
                targetDate={date}
                current={index === TIMELINE_VIEW_COLS}
                tasks={tasks}
                style={style}
                onClick={() => setFocusedDate(date)}
              />
            );
          })}
      </div>
    </div>
  );
};

const TaskTimelineDayColumn = ({ targetDate, tasks, current, ...rest }) => {
  const focusedDateLabel = useMemo(() => {
    return moment(targetDate).format("YY년 MM월 DD일 (ddd)");
  }, [targetDate]);

  const isToday = useMemo(() => {
    return moment(targetDate).isSame(new Date(), "day");
  }, [targetDate]);

  const isSaturday = useMemo(() => {
    return moment(targetDate).day() === 6;
  }, [targetDate]);

  const isSunday = useMemo(() => {
    return moment(targetDate).day() === 0;
  }, [targetDate]);

  const classifiedTasks = useMemo(() => {
    const classifiedTasks = {};
    Object.values(tasks).forEach((task) => {
      const hourCode = moment(task.dueDate).format("YYYYMMDDHH");
      if (!classifiedTasks[hourCode]) {
        classifiedTasks[hourCode] = {};
      }
      classifiedTasks[hourCode][task.id] = task;
    });
    return classifiedTasks;
  }, [tasks]);

  return (
    <div
      className={
        "task-list-day-column" +
        JsxUtil.classByCondition(isToday, "today") +
        JsxUtil.classByCondition(current, "current") +
        JsxUtil.classByCondition(isSaturday, "saturday") +
        JsxUtil.classByCondition(isSunday, "sunday")
      }
      {...rest}
    >
      <div className={"task-list-header-row"}>{focusedDateLabel}</div>
      <div className={"task-list-body-row"}>
        {Array(24)
          .fill(0)
          .map((_, index) => {
            const date = new Date(targetDate);
            date.setHours(index);
            const hourCode = moment(date).format("YYYYMMDDHH");
            const hourTasks = classifiedTasks[hourCode] ?? {};
            return (
              <TaskTimelineTimeColumn
                targetDate={date}
                tasks={hourTasks}
                key={date.getTime()}
              />
            );
          })}
        <div className={"time-cell-header"}></div>
      </div>
    </div>
  );
};

const TaskTimelineTimeColumn = ({ targetDate, tasks, ...rest }) => {
  const isCurrentSection = useMemo(() => {
    return moment(targetDate).isSame(new Date(), "hour");
  }, [targetDate]);

  const isAfternoon = useMemo(() => {
    return moment().format("a") === "오후";
  }, []);

  const currentSectionRatio = useMemo(() => {
    const currentSectionStart = new moment(targetDate).startOf("hour");
    const currentSectionEnd = new moment(targetDate).endOf("hour");
    const currentSectionDuration = currentSectionEnd.diff(
      currentSectionStart,
      "seconds"
    );
    const currentSectionPassed = new moment().diff(
      currentSectionStart,
      "seconds"
    );
    return currentSectionPassed / currentSectionDuration;
  }, [targetDate]);

  const sortedTasks = useMemo(() => {
    return Object.values(tasks).sort((a, b) => {
      return new Date(a.dueDate).valueOf() - new Date(b.dueDate).valueOf();
    });
  }, [tasks]);

  return (
    <div className={"time-cell-row"} {...rest}>
      <div className={"time-cell-header"}>
        {moment(targetDate).format("a h시")}
      </div>
      <div className={"time-cell-body"}>
        {isCurrentSection && (
          <div
            className={"current-time-indicator"}
            style={{ top: `${currentSectionRatio * 100}%` }}
          >
            <div className={"line"}></div>
            <div
              className={
                "label" + JsxUtil.classByCondition(isAfternoon, "afternoon")
              }
            >
              {moment().format("a h시 mm분 ss초")}
            </div>
          </div>
        )}
        <div className={"time-cell-body-inner"}>
          <div className={"time-tasks"}>
            {sortedTasks.map((task) => {
              return <TimelineTaskCell task={task} key={task.id} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const TimelineTaskCell = ({ task }) => {
  const [counter, setCounter] = useState(0);

  const dueDate = useMemo(() => {
    if (task.dueDate == null) {
      return null;
    }
    return new Date(task.dueDate);
  }, [task.dueDate]);

  const overdue = useMemo(() => {
    if (dueDate == null) {
      return false;
    }
    return dueDate.valueOf() < Date.now();
  }, [dueDate, counter]);

  // const remainMilliSeconds = useMemo(() => {
  //   if (dueDate == null) {
  //     return null;
  //   }
  //   const remain = dueDate.valueOf() - Date.now();
  //   return remain;
  // }, [dueDate, counter]);

  // const remainTimeText = useMemo(() => {
  //   if (dueDate == null) {
  //     return "미정";
  //   }
  //   return (
  //     fromRelativeTime(
  //       remainMilliSeconds < 0 ? -remainMilliSeconds : remainMilliSeconds,
  //       {
  //         showLayerCount: 2,
  //       }
  //     ) + (remainMilliSeconds < 0 ? " 지남" : " 남음")
  //   );
  // }, [dueDate, counter]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCounter((c) => c + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={
        "task-item" +
        JsxUtil.classByCondition(overdue, "overdue") +
        JsxUtil.classByCondition(task.done, "done")
      }
    >
      <div className={"title"}>{task.title}</div>
      {/* <div className={"remain-time"}>({remainTimeText})</div> */}
      <div className="minute">{moment(dueDate).format("m분")}</div>
    </div>
  );
};

export default TaskTimelineView;
