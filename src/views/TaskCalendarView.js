import moment from "moment";
import { useEffect, useMemo, useState } from "react";
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

  return (
    <div className="task-view calendar">
      <div className="calendar-view">
        <div className="calendar-view-header">
          <div className="current-year-month">2023년 3월</div>
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
                      JsxUtil.classByCondition(index == 0, "sunday")
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
                  day={moment(prevMonthLastDate).date() - curMonthFirstDay + index}
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
  const isToday = useMemo(() => {
    return currentMoment.date() === day && currentMoment.month() === month && currentMoment.year() === year;
  }, [currentMoment, year, month, day]);

  const dateKey = `${year}-${month + 1}-${day}`;
  const tasks = dateTaskMap[dateKey] || [];

  return (
    <div
      className={
        "day-cell cell" +
        JsxUtil.classByCondition(isToday, "today") +
        JsxUtil.classByCondition(currentMonth, "current-month")
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
