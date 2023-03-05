import moment from "moment";
import { useEffect, useMemo, useState } from "react";
import { IoPlay, IoPlayBack, IoPlayForward } from "react-icons/io5";
import { fastInterval } from "utils/Common";
import JsxUtil from "utils/JsxUtil";
import "./TaskCalendarView.scss";

const TaskCalendarView = ({ taskMap, filteredTaskMap }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [watchingMonth, setWatchingMonth] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState(null);

  const dateTaskMap = useMemo(() => {
    const dateMap = {};
    for (let tid in filteredTaskMap) {
      const dayDateKey = moment(filteredTaskMap[tid].dueDate).format("YYYY-M-D");
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
    return new Date(watchingMonth.getFullYear(), watchingMonth.getMonth(), 1).getDay();
  }, [watchingMonth]);
  const curMonthLastDate = useMemo(() => {
    return new Date(watchingMonth.getFullYear(), watchingMonth.getMonth() + 1, 0);
  }, [watchingMonth]);

  useEffect(() => {
    fastInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
  }, []);

  const onPrevYear = () => {
    setWatchingMonth(new Date(watchingMonth.getFullYear() - 1, watchingMonth.getMonth(), 1));
  };

  const onPrevMonth = () => {
    setWatchingMonth(new Date(watchingMonth.getFullYear(), watchingMonth.getMonth() - 1, 1));
  };

  const onCurrentMonth = () => {
    setWatchingMonth(new Date());
  };

  const onNextMonth = () => {
    setWatchingMonth(new Date(watchingMonth.getFullYear(), watchingMonth.getMonth() + 1, 1));
  };

  const onNextYear = () => {
    setWatchingMonth(new Date(watchingMonth.getFullYear() + 1, watchingMonth.getMonth(), 1));
  };

  return (
    <div className="task-view calendar">
      <div className="calendar-view">
        <div className="calendar-view-header">
          <div className="current-year-month">{watchingMoment.format("YYYY년 M월")}</div>
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
                      JsxUtil.classByCondition(hoveredDate?.getDay() == index, "focused") +
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
                  day={moment(prevMonthLastDate).date() - curMonthFirstDay + index + 1}
                  currentMoment={currentMoment}
                  dateTaskMap={dateTaskMap}
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
                  />
                ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const DayCell = ({ currentMoment, year, month, day, dateTaskMap, currentMonth = false, ...rest }) => {
  const cellDate = useMemo(() => {
    return moment(new Date(year, month, day));
  }, [year, month, day]);
  const isToday = useMemo(() => {
    return cellDate.isSame(currentMoment, "day");
  }, [cellDate]);
  const isSunday = useMemo(() => {
    return cellDate.day() == 0;
  }, [cellDate]);
  const isSaturday = useMemo(() => {
    return cellDate.day() == 6;
  }, [cellDate]);

  const dateKey = `${year}-${month + 1}-${day}`;
  const tasks = dateTaskMap[dateKey] || [];

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
        {tasks.map((task) => {
          const subtasks = Object.values(task.subtasks ?? {});
          return (
            <div className="task" key={task.id}>
              <div className="title">{task.title}</div>
              {subtasks.length > 0 && (
                <div className="subtasks">
                  ({task.getFulfilledSubTaskCount()}/{subtasks.length})
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TaskCalendarView;
