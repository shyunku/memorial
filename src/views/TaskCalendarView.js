import moment from "moment";
import { useEffect, useMemo, useState } from "react";
import { IoPlay, IoPlayBack, IoPlayForward } from "react-icons/io5";
import { fastInterval, fromRelativeTime } from "utils/Common";
import JsxUtil from "utils/JsxUtil";
import "./TaskCalendarView.scss";

const TaskCalendarView = ({
  taskMap,
  filteredTaskMap,
  setHoveredTaskId,
  hoveredTaskId,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [watchingMonth, setWatchingMonth] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState(null);

  const dateTaskMap = useMemo(() => {
    const dateMap = {};
    for (let tid in filteredTaskMap) {
      const dayDateKey = moment(filteredTaskMap[tid].dueDate).format(
        "YYYY-M-D"
      );
      if (dateMap[dayDateKey] == null) dateMap[dayDateKey] = [];
      dateMap[dayDateKey].push(filteredTaskMap[tid]);
    }
    return dateMap;
  }, [filteredTaskMap]);

  const currentMoment = useMemo(() => {
    return moment(currentDate);
  }, [currentDate]);
  const watchingMoment = useMemo(() => {
    return moment(watchingMonth);
  }, [watchingMonth]);

  const prevMonthLastDate = useMemo(() => {
    return new Date(watchingMonth.getFullYear(), watchingMonth.getMonth(), 0);
  }, [watchingMonth]);
  const curMonthFirstDay = useMemo(() => {
    return new Date(
      watchingMonth.getFullYear(),
      watchingMonth.getMonth(),
      1
    ).getDay();
  }, [watchingMonth]);
  const curMonthLastDate = useMemo(() => {
    return new Date(
      watchingMonth.getFullYear(),
      watchingMonth.getMonth() + 1,
      0
    );
  }, [watchingMonth]);

  useEffect(() => {
    fastInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
  }, []);

  const onPrevYear = () => {
    setWatchingMonth(
      new Date(watchingMonth.getFullYear() - 1, watchingMonth.getMonth(), 1)
    );
  };

  const onPrevMonth = () => {
    setWatchingMonth(
      new Date(watchingMonth.getFullYear(), watchingMonth.getMonth() - 1, 1)
    );
  };

  const onCurrentMonth = () => {
    setWatchingMonth(new Date());
  };

  const onNextMonth = () => {
    setWatchingMonth(
      new Date(watchingMonth.getFullYear(), watchingMonth.getMonth() + 1, 1)
    );
  };

  const onNextYear = () => {
    setWatchingMonth(
      new Date(watchingMonth.getFullYear() + 1, watchingMonth.getMonth(), 1)
    );
  };

  return (
    <div className="task-view calendar">
      <div className="calendar-view">
        <div className="calendar-view-header">
          <div className="current-year-month">
            {watchingMoment.format("YYYY년 M월")}
          </div>
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
        <div className="calendar-view-body">
          <div className="week-cells">
            {Array(7)
              .fill(0)
              .map((_, index) => {
                return (
                  <div
                    className={
                      "week-cell cell" +
                      JsxUtil.classByCondition(
                        hoveredDate?.getDay() == index,
                        "focused"
                      ) +
                      JsxUtil.classByCondition(index == 0, "sunday") +
                      JsxUtil.classByCondition(index == 6, "saturday")
                    }
                    key={index}
                  >
                    {moment().weekday(index).format("dd")}
                  </div>
                );
              })}
          </div>
          <div className="day-cells">
            {Array(curMonthFirstDay)
              .fill(0)
              .map((_, index) => (
                <DayCell
                  key={index}
                  year={watchingMoment.year()}
                  month={watchingMoment.month() - 1}
                  day={
                    moment(prevMonthLastDate).date() -
                    curMonthFirstDay +
                    index +
                    1
                  }
                  currentMoment={currentMoment}
                  dateTaskMap={dateTaskMap}
                  setHoveredTaskId={setHoveredTaskId}
                  hoveredTaskId={hoveredTaskId}
                />
              ))}
            {Array(curMonthLastDate.getDate())
              .fill(0)
              .map((_, index) => (
                <DayCell
                  key={index}
                  year={watchingMoment.year()}
                  month={watchingMoment.month()}
                  day={index + 1}
                  currentMoment={currentMoment}
                  dateTaskMap={dateTaskMap}
                  currentMonth={true}
                  setHoveredTaskId={setHoveredTaskId}
                  hoveredTaskId={hoveredTaskId}
                />
              ))}
            {curMonthLastDate.getDay() < 6 &&
              Array(6 - curMonthLastDate.getDay())
                .fill(0)
                .map((_, index) => (
                  <DayCell
                    key={index}
                    year={watchingMoment.year()}
                    month={watchingMoment.month() + 1}
                    day={index + 1}
                    currentMoment={currentMoment}
                    dateTaskMap={dateTaskMap}
                    setHoveredTaskId={setHoveredTaskId}
                    hoveredTaskId={hoveredTaskId}
                  />
                ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const DayCell = ({
  currentMoment,
  year,
  month,
  day,
  dateTaskMap,
  currentMonth = false,
  setHoveredTaskId,
  hoveredTaskId,
  ...rest
}) => {
  const cellDate = useMemo(() => {
    return moment(new Date(year, month, day));
  }, [year, month, day]);
  const isToday = useMemo(() => {
    return cellDate.isSame(currentMoment, "day");
  }, [cellDate]);
  const isSunday = useMemo(() => {
    return cellDate.day() === 0;
  }, [cellDate]);
  const isSaturday = useMemo(() => {
    return cellDate.day() === 6;
  }, [cellDate]);

  const dateKey = `${year}-${month + 1}-${day}`;
  const tasks = dateTaskMap[dateKey] || [];

  const sortedTasks = useMemo(() => {
    return tasks.sort((a, b) => {
      if (a.done && !b.done) return 1;
      if (!a.done && b.done) return -1;

      const aMoment = moment(a.dueDate);
      const bMoment = moment(b.dueDate);
      if (aMoment.isBefore(bMoment)) return -1;
      if (aMoment.isAfter(bMoment)) return 1;
      return 0;
    });
  }, [tasks]);

  return (
    <div
      className={
        "day-cell cell" +
        JsxUtil.classByCondition(isToday, "today") +
        JsxUtil.classByCondition(currentMonth, "current-month") +
        JsxUtil.classByCondition(isSunday, "sunday") +
        JsxUtil.classByCondition(isSaturday, "saturday")
      }
      {...rest}
    >
      <div className="day-cell-header">
        <div className="date">{day}</div>
      </div>
      <div className="tasks">
        {sortedTasks.map((task) => {
          return (
            <TaskCell
              task={task}
              key={task.id}
              setHoveredTaskId={setHoveredTaskId}
              hoveredTaskId={hoveredTaskId}
            />
          );
        })}
      </div>
    </div>
  );
};

const TaskCell = ({ task, setHoveredTaskId, hoveredTaskId }) => {
  const [counter, setCounter] = useState(0);

  const dueDate = useMemo(() => {
    if (task.dueDate == null) return null;
    return moment(task.dueDate).toDate();
  }, [task.date]);

  const subtasks = useMemo(() => {
    return Object.values(task.subtasks ?? {});
  });

  const remainMilliSeconds = useMemo(() => {
    if (dueDate == null) {
      return null;
    }
    const remain = dueDate.valueOf() - Date.now();
    return remain;
  }, [dueDate, counter]);

  const remainTimeText = useMemo(() => {
    if (dueDate == null) {
      return "미정";
    }
    return fromRelativeTime(
      remainMilliSeconds < 0 ? -remainMilliSeconds : remainMilliSeconds,
      {
        showLayerCount: 1,
      }
    );
  }, [dueDate, counter]);

  const categoryColor = useMemo(() => {
    for (let category of Object.values(task.categories)) {
      if (category.color != null) {
        return category.color;
      }
    }
    return null;
  }, [task.categories]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCounter((c) => c + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={
        "task" +
        JsxUtil.classByCondition(task.done, "done") +
        JsxUtil.classByEqual(hoveredTaskId, task.id, "hovered")
      }
      key={task.id}
      onMouseEnter={() => setHoveredTaskId?.(task.id)}
      onMouseLeave={() => setHoveredTaskId?.(null)}
    >
      <div
        className={"color-label"}
        style={{ backgroundColor: categoryColor }}
      ></div>
      <div className="title">{task.title}</div>
      {subtasks.length > 0 && (
        <div className="subtasks">
          ({task.getFulfilledSubTaskCount()}/{subtasks.length})
        </div>
      )}
      {dueDate != null && !task.done && remainMilliSeconds != null && (
        <div className="remain-time">
          {remainTimeText} {remainMilliSeconds < 0 ? "지남" : "남음"}
        </div>
      )}
    </div>
  );
};

export default TaskCalendarView;
