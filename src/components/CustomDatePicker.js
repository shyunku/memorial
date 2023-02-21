import moment from "moment";
import "moment/locale/ko";
import { useEffect, useMemo, useState } from "react";
import { IoChevronBackOutline, IoChevronForwardOutline } from "react-icons/io5";
import { fastInterval } from "utils/Common";
import JsxUtil from "utils/JsxUtil";
import { ContextMenu, useContextMenu } from "./CustomContextMenu";
import "./CustomDatePicker.scss";

moment.locale("ko");

const DatePicker = ({ onSelect = () => {}, visible, datePickerRef, ...rest }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const [hoveredDate, setHoveredDate] = useState(null);

  // watching
  const [watchingMonth, setWatchingMonth] = useState(new Date());
  const prevMonthLastDate = useMemo(() => {
    return new Date(watchingMonth.getFullYear(), watchingMonth.getMonth(), 0);
  }, [watchingMonth]);
  const curMonthFirstDay = useMemo(() => {
    return new Date(watchingMonth.getFullYear(), watchingMonth.getMonth(), 1).getDay();
  }, [watchingMonth]);
  const curMonthLastDate = useMemo(() => {
    return new Date(watchingMonth.getFullYear(), watchingMonth.getMonth() + 1, 0);
  }, [watchingMonth]);

  const currentMoment = useMemo(() => {
    return moment(currentDate);
  }, [currentDate]);
  const watchingMoment = useMemo(() => {
    return moment(watchingMonth);
  }, [watchingMonth]);

  const [selectedDate, setSelectedDate] = useState(currentDate);

  useEffect(() => {
    fastInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
  }, []);

  const goToPrevMonth = () => {
    setWatchingMonth((m) => {
      return new Date(m.getFullYear(), m.getMonth() - 1, 1);
    });
  };

  const goToNextMonth = () => {
    setWatchingMonth((m) => {
      return new Date(m.getFullYear(), m.getMonth() + 1, 1);
    });
  };

  const selectToday = () => {
    setSelectedDate(new Date());
    setWatchingMonth(new Date());
  };

  const selectDate = (date) => {
    const newDate = new Date(watchingMonth.getFullYear(), watchingMonth.getMonth(), date);
    setSelectedDate(newDate);
  };

  const selectPrevMonthDate = (date) => {
    const newDate = new Date(watchingMonth.getFullYear(), watchingMonth.getMonth() - 1, date);
    goToPrevMonth();
    setSelectedDate(newDate);
  };

  const selectNextMonthDate = (date) => {
    const newDate = new Date(watchingMonth.getFullYear(), watchingMonth.getMonth() + 1, date);
    goToNextMonth();
    setSelectedDate(newDate);
  };

  const finallyDecided = () => {
    onSelect(selectedDate);
  };

  return (
    <ContextMenu reference={datePickerRef} visible={visible} sticky={true} {...rest}>
      <div className="date-picker">
        <div className="date-picker-header">
          <div className="date-picker-controls" onClick={goToPrevMonth}>
            <IoChevronBackOutline />
          </div>
          <div className="current-month">{moment(watchingMonth).format("YYYY년 MM월")}</div>
          <div className="date-picker-controls" onClick={goToNextMonth}>
            <IoChevronForwardOutline />
          </div>
        </div>
        <div className="date-picker-body">
          <div className="date-picker-weekdays">
            {Array(7)
              .fill(0)
              .map((_, index) => {
                return (
                  <div
                    className={
                      "date-picker-weekday" + JsxUtil.classByCondition(hoveredDate?.getDay() == index, "focused")
                    }
                    key={index}
                  >
                    {moment().weekday(index).format("dd")}
                  </div>
                );
              })}
          </div>
          <div className="date-picker-days">
            {curMonthFirstDay > 0 &&
              Array(curMonthFirstDay)
                .fill(0)
                .map((_, index) => {
                  const day = moment(prevMonthLastDate).date() - curMonthFirstDay + index + 1;

                  return (
                    <div
                      className="date-picker-day not-current"
                      key={index}
                      onClick={selectPrevMonthDate.bind(null, day)}
                      onMouseEnter={(e) => {
                        const date = new Date(watchingMonth.getFullYear(), watchingMonth.getMonth() - 1, day);
                        setHoveredDate(date);
                      }}
                      onMouseLeave={(e) => {
                        setHoveredDate(null);
                      }}
                    >
                      {day}
                    </div>
                  );
                })}
            {Array(curMonthLastDate.getDate())
              .fill(0)
              .map((_, index) => {
                const isToday =
                  currentMoment.date() === index + 1 &&
                  currentMoment.month() === watchingMoment.month() &&
                  currentMoment.year() === watchingMoment.year();

                const selected =
                  selectedDate != null &&
                  selectedDate.getDate() === index + 1 &&
                  selectedDate.getMonth() === watchingMoment.month() &&
                  selectedDate.getFullYear() === watchingMoment.year();
                return (
                  <div
                    className={
                      "date-picker-day" +
                      JsxUtil.classByCondition(isToday, "today") +
                      JsxUtil.classByCondition(selected, "selected")
                    }
                    key={index}
                    onClick={selectDate.bind(null, index + 1)}
                    onMouseEnter={(e) => {
                      const date = new Date(watchingMonth.getFullYear(), watchingMonth.getMonth(), index + 1);
                      setHoveredDate(date);
                    }}
                    onMouseLeave={(e) => {
                      setHoveredDate(null);
                    }}
                  >
                    {index + 1}
                  </div>
                );
              })}
            {curMonthLastDate.getDay() < 6 &&
              Array(6 - curMonthLastDate.getDay())
                .fill(0)
                .map((_, index) => {
                  return (
                    <div
                      className="date-picker-day not-current"
                      key={index}
                      onClick={selectNextMonthDate.bind(null, index + 1)}
                      onMouseEnter={(e) => {
                        const date = new Date(watchingMonth.getFullYear(), watchingMonth.getMonth() + 1, index + 1);
                        setHoveredDate(date);
                      }}
                      onMouseLeave={(e) => {
                        setHoveredDate(null);
                      }}
                    >
                      {index + 1}
                    </div>
                  );
                })}
          </div>
        </div>
        <div className="date-picker-footer">
          <div className="date-picker-footer-btn" onClick={selectToday}>
            오늘
          </div>
          <div className="blank"></div>
          <div className="date-picker-footer-btn confirm" onClick={finallyDecided}>
            확인
          </div>
          <div className="date-picker-footer-btn">취소</div>
        </div>
      </div>
    </ContextMenu>
  );
};

export default DatePicker;
