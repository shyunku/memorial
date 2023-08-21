import moment from "moment";
import "moment/locale/ko";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  IoChevronBackOutline,
  IoChevronForwardOutline,
  IoPlaySkipBack,
  IoPlaySkipForward,
} from "react-icons/io5";
import { VscDebugContinue, VscDebugReverseContinue } from "react-icons/vsc";
import { fastInterval } from "utils/Common";
import {
  floorMinutesByStep,
  circularDistance,
  hours12,
  hours12tohours24,
  ceilMinutesByStep,
} from "utils/DateTime";
import JsxUtil from "utils/JsxUtil";
import { ContextMenu } from "./CustomContextMenu";
import "./CustomDateTimePicker.scss";

moment.locale("ko");

const DateTimePicker = ({
  onSelect = () => {},
  closer,
  visible,
  date,
  datePickerRef,
  ...rest
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState(null);
  const [attachEndMode, setAttachEndMode] = useState(false);
  const [hovered, setHovered] = useState(false);

  // watching
  const [watchingMonth, setWatchingMonth] = useState(date ?? new Date());
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

  const currentMoment = useMemo(() => {
    return moment(currentDate);
  }, [currentDate]);
  const watchingMoment = useMemo(() => {
    return moment(watchingMonth);
  }, [watchingMonth]);

  const [selectedDate, setSelectedDate] = useState(
    (() => {
      if (!date) return null;
      const initialDate = new Date(date);
      initialDate.setMinutes(floorMinutesByStep(date.getMinutes(), 5));
      return initialDate;
    })()
  );
  const selectedDaytime = useMemo(() => {
    return selectedDate ? selectedDate.getHours() >= 12 : false;
  }, [selectedDate]);
  const selectedHour = useMemo(() => {
    return selectedDate ? hours12(selectedDate) : 12;
  }, [selectedDate]);
  const selectedMinute = useMemo(() => {
    return selectedDate ? selectedDate.getMinutes() : 0;
  }, [selectedDate]);

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

  // selection
  const selectToday = () => {
    const today = new Date();
    today.setHours(23);
    today.setMinutes(59);
    today.setSeconds(59);
    setAttachEndMode(true);
    setSelectedDate(today);
    setWatchingMonth(today);
  };

  const selectDate = (date) => {
    const newDate = new Date(selectedDate);
    newDate.setFullYear(watchingMonth.getFullYear());
    newDate.setMonth(watchingMonth.getMonth());
    newDate.setDate(date);

    newDate.setHours(23);
    newDate.setMinutes(59);
    newDate.setSeconds(59);
    setAttachEndMode(true);

    setSelectedDate(newDate);
  };

  const selectPrevMonthDate = (date) => {
    const newDate = new Date(selectedDate);
    newDate.setFullYear(watchingMonth.getFullYear());
    newDate.setMonth(watchingMonth.getMonth() - 1);
    newDate.setDate(date);
    newDate.setMinutes(floorMinutesByStep(newDate.getMinutes(), 5));
    newDate.setSeconds(0);
    goToPrevMonth();
    setAttachEndMode(false);
    setSelectedDate(newDate);
  };

  const selectNextMonthDate = (date) => {
    const newDate = new Date(selectedDate);
    newDate.setFullYear(watchingMonth.getFullYear());
    newDate.setMonth(watchingMonth.getMonth() + 1);
    newDate.setDate(date);
    newDate.setMinutes(floorMinutesByStep(newDate.getMinutes(), 5));
    newDate.setSeconds(0);
    goToNextMonth();
    setAttachEndMode(false);
    setSelectedDate(newDate);
  };

  const onDaytimeSelect = (val) => {
    const newDate = new Date(selectedDate);
    newDate.setHours(
      val === "오후" ? (newDate.getHours() % 12) + 12 : newDate.getHours() % 12
    );
    newDate.setMinutes(floorMinutesByStep(newDate.getMinutes(), 5));
    setAttachEndMode(false);
    setSelectedDate(newDate);
  };

  const onHourSelect = (hour) => {
    const newDate = new Date(selectedDate);
    const convertedHour24 = hours12tohours24(hour, newDate.getHours() >= 12);
    newDate.setHours(convertedHour24);
    newDate.setMinutes(floorMinutesByStep(newDate.getMinutes(), 5));
    newDate.setSeconds(0);
    setAttachEndMode(false);
    setSelectedDate(newDate);
  };

  const onMinuteSelect = (minute) => {
    const newDate = new Date(selectedDate);
    newDate.setMinutes(minute);
    newDate.setSeconds(0);
    setAttachEndMode(false);
    setSelectedDate(newDate);
  };

  const onDayStart = () => {
    const newDate = new Date(selectedDate);
    newDate.setHours(0);
    newDate.setMinutes(0);
    newDate.setSeconds(0);
    setAttachEndMode(false);
    setSelectedDate(newDate);
  };

  const onDayEnd = () => {
    const newDate = new Date(selectedDate);
    newDate.setHours(23);
    newDate.setMinutes(59);
    newDate.setSeconds(59);
    setAttachEndMode(true);
    setSelectedDate(newDate);
  };

  const closeHandler = (e) => {
    onSelect(selectedDate);
    closer(e);
  };

  useEffect(() => {
    setSelectedDate(date);
    const d = new Date(date);
    setAttachEndMode(d.getMinutes() === 59);
  }, [date]);

  // useEffect(() => {
  //   console.log("selectedDate", selectedDate, selectedMinute);
  // }, [selectedDate]);

  return (
    <ContextMenu
      reference={datePickerRef}
      visible={visible}
      sticky={true}
      onMouseEnter={(e) => setHovered(true)}
      onMouseLeave={(e) => setHovered(false)}
      {...rest}
    >
      <div className="datetime-picker">
        <DatePicker
          goToPrevMonth={goToPrevMonth}
          goToNextMonth={goToNextMonth}
          watchingMonth={watchingMonth}
          hoveredDate={hoveredDate}
          setHoveredDate={setHoveredDate}
          curMonthFirstDay={curMonthFirstDay}
          prevMonthLastDate={prevMonthLastDate}
          selectToday={selectToday}
          selectPrevMonthDate={selectPrevMonthDate}
          selectNextMonthDate={selectNextMonthDate}
          curMonthLastDate={curMonthLastDate}
          currentMoment={currentMoment}
          watchingMoment={watchingMoment}
          selectedDate={selectedDate}
          selectDate={selectDate}
          closer={closeHandler}
        />
        <TimePicker
          hovered={hovered}
          daytime={selectedDaytime}
          hour={selectedHour}
          minute={selectedMinute}
          onDaytimeSelect={onDaytimeSelect}
          onHourSelect={onHourSelect}
          onMinuteSelect={onMinuteSelect}
          onDayStart={onDayStart}
          onDayEnd={onDayEnd}
          attachEndMode={attachEndMode}
          disabled={selectedDate == null}
          closer={closeHandler}
        />
      </div>
    </ContextMenu>
  );
};

const DatePicker = ({
  goToPrevMonth,
  goToNextMonth,
  watchingMonth,
  hoveredDate,
  setHoveredDate,
  curMonthFirstDay,
  prevMonthLastDate,
  selectToday,
  selectPrevMonthDate,
  selectNextMonthDate,
  curMonthLastDate,
  currentMoment,
  watchingMoment,
  selectedDate,
  selectDate,
  closer,
}) => {
  return (
    <div className="date-picker">
      <div className="date-picker-header">
        <div className="date-picker-controls" onClick={goToPrevMonth}>
          <IoChevronBackOutline />
        </div>
        <div className="current-month">
          {moment(watchingMonth).format("YYYY년 MM월")}
        </div>
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
                    "date-picker-weekday" +
                    JsxUtil.classByCondition(
                      hoveredDate?.getDay() == index,
                      "focused"
                    )
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
                const day =
                  moment(prevMonthLastDate).date() -
                  curMonthFirstDay +
                  index +
                  1;

                return (
                  <div
                    className={"date-picker-day not-current"}
                    key={index}
                    onClick={selectPrevMonthDate.bind(null, day)}
                    onMouseEnter={(e) => {
                      const date = new Date(
                        watchingMonth.getFullYear(),
                        watchingMonth.getMonth() - 1,
                        day
                      );
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

              const date = new Date(
                watchingMonth.getFullYear(),
                watchingMonth.getMonth(),
                index + 1
              );

              return (
                <div
                  className={
                    "date-picker-day" +
                    JsxUtil.classByCondition(isToday, "today") +
                    JsxUtil.classByCondition(selected, "selected") +
                    JsxUtil.classByCondition(date.getDay() === 6, "saturday") +
                    JsxUtil.classByCondition(date.getDay() === 0, "sunday")
                  }
                  key={index}
                  onClick={selectDate.bind(null, index + 1)}
                  onMouseEnter={(e) => {
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
                      const date = new Date(
                        watchingMonth.getFullYear(),
                        watchingMonth.getMonth() + 1,
                        index + 1
                      );
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
      <div className="picker-footer">
        <div className="picker-btn" onClick={selectToday}>
          오늘
        </div>
        <div
          className={
            "picker-btn" +
            JsxUtil.classByCondition(selectedDate != null, "confirm") +
            JsxUtil.classByCondition(selectedDate == null, "show")
          }
          onClick={closer}
        >
          {selectedDate != null ? "확인" : "취소"}
        </div>
      </div>
    </div>
  );
};

const TimePicker = ({
  hovered,
  daytime,
  hour,
  minute,
  onDaytimeSelect,
  onHourSelect,
  onMinuteSelect,
  onDayStart,
  onDayEnd,
  attachEndMode,
  disabled,
  closer,
}) => {
  const [attachStartHovered, setAttachStartHovered] = useState(false);
  const [attachEndHovered, setAttachEndHovered] = useState(false);

  return (
    <div
      className={"time-picker" + JsxUtil.classByCondition(disabled, "disabled")}
    >
      <div className="picker-header">
        <div
          className="picker-btn"
          onMouseEnter={(e) => setAttachStartHovered(true)}
          onMouseLeave={(e) => setAttachStartHovered(false)}
          onClick={onDayStart}
        >
          {attachStartHovered ? "하루의 시작" : <VscDebugReverseContinue />}
        </div>
        <div
          className="picker-btn"
          onMouseEnter={(e) => setAttachEndHovered(true)}
          onMouseLeave={(e) => setAttachEndHovered(false)}
          onClick={onDayEnd}
        >
          {attachEndHovered ? "하루의 끝" : <VscDebugContinue />}
        </div>
      </div>
      <div className="time-rollers">
        <TimeRoller
          selectedValue={daytime}
          minValue={0}
          maxValue={1}
          array={["오전", "오후"]}
          onSelect={onDaytimeSelect}
        />
        <TimeRoller
          selectedValue={hour}
          minValue={1}
          maxValue={12}
          onSelect={onHourSelect}
          postfix="시"
        />
        <TimeRoller
          selectedValue={minute}
          minValue={0}
          maxValue={55}
          step={5}
          onSelect={onMinuteSelect}
          postfix="분"
          lastMax={attachEndMode ? 59 : null}
        />
      </div>
      <div className="picker-footer">
        {/* <div className="picker-btn" onClick={onDaytimeSelect.bind(null, 0)}>현시각</div> */}
        <div className="left"></div>
        <div className="right">
          <div
            className={
              "picker-btn confirm" +
              JsxUtil.classByCondition(!hovered && !disabled, "show")
            }
            onClick={closer}
          >
            확인
          </div>
        </div>
      </div>
    </div>
  );
};

const TimeRoller = ({
  selectedValue = 0,
  minValue = 0,
  maxValue = 11,
  lastMax = null,
  step = 1,
  angle = 30,
  far = 85,
  array = null,
  postfix = "",
  onSelect,
}) => {
  const selectedIndex = useMemo(
    () => Math.floor((selectedValue - minValue) / step),
    [selectedValue, minValue]
  );

  // count increment min to max by step
  const count = useMemo(() => {
    return Math.floor((maxValue - minValue) / step) + 1;
  });
  const isCircular = useMemo(() => {
    let trueAngle = 360 / count;
    return trueAngle <= angle;
  });

  const [prevSelectedValue, setPrevSelectedValue] = useState(selectedValue);
  const [rotateX, setRotateX] = useState(selectedIndex * angle);

  const onScroll = (e) => {
    const delta = e.deltaY;
    let newValue =
      (lastMax == selectedValue ? maxValue : selectedValue) +
      (delta > 0 ? 1 : -1) * step;
    if (newValue < minValue) {
      if (!isCircular) return;
      newValue = maxValue;
    }
    if (newValue > maxValue) {
      if (!isCircular) return;
      newValue = minValue;
    }
    onSelect(array ? array?.[newValue] : newValue);
  };

  useEffect(() => {
    let selectedVal = selectedValue === lastMax ? maxValue : selectedValue;
    let newIsBig = selectedVal > prevSelectedValue;
    const absDiff = Math.abs(selectedVal - prevSelectedValue);
    const diff = circularDistance(
      prevSelectedValue,
      selectedVal,
      minValue,
      maxValue,
      step
    );
    if (isCircular && diff < absDiff) {
      newIsBig = !newIsBig;
    }
    const newRotateX =
      rotateX + (newIsBig ? 1 : -1) * angle * Math.floor(diff / step);
    setRotateX(newRotateX);
    setPrevSelectedValue(selectedVal);
  }, [selectedValue, lastMax]);

  return (
    <div className="roller-frame" onWheel={onScroll}>
      <div className="roller-wrapper">
        <div
          className="roller minute"
          style={{ transform: `rotateX(${rotateX}deg)` }}
        >
          {Array(count)
            .fill(0)
            .map((_, index) => {
              const isLast = lastMax != null && index === count - 1;
              let colValue = isLast ? lastMax : minValue + index * step;
              let value = array ? array?.[colValue] : colValue;
              if (isLast) {
                value = lastMax;
              }

              const dist =
                circularDistance(
                  selectedValue,
                  value,
                  minValue,
                  maxValue,
                  step
                ) / step;
              const hidden = dist > 4;

              return (
                <div
                  className={
                    "roll-item" +
                    JsxUtil.classByEqual(colValue, selectedValue, "highlight") +
                    JsxUtil.classByCondition(hidden, "hidden") +
                    JsxUtil.classByCondition(isLast, "last")
                  }
                  key={index}
                  style={{
                    transform: `rotateX(${
                      -index * angle
                    }deg) translateZ(${far}px)`,
                  }}
                  onClick={onSelect?.bind(null, value)}
                >
                  {value}
                  {postfix}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default DateTimePicker;
