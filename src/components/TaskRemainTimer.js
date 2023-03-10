import { useEffect, useMemo, useState } from "react";
import { fastInterval, fromRelativeTime, toRelativeTime } from "utils/Common";
import JsxUtil from "utils/JsxUtil";

const TaskRemainTimer = ({ dueDate }) => {
  const [counter, setCounter] = useState(0);
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
    return fromRelativeTime(remainMilliSeconds < 0 ? -remainMilliSeconds : remainMilliSeconds, {
      showLayerCount: null,
    });
  }, [dueDate, counter]);

  useEffect(() => {
    if (dueDate != null) {
      const counterId = fastInterval(() => {
        setCounter((c) => c + 1);
      }, 500);

      return () => {
        clearInterval(counterId);
      };
    }
  }, [dueDate]);

  return (
    <div className={"remain-time" + JsxUtil.classByCondition(remainMilliSeconds < 0, "overdue")}>
      <div className="label">{dueDate != null && remainMilliSeconds < 0 ? "지난" : "남은"} 시간</div>
      <div className={"value" + JsxUtil.classByCondition(dueDate != null, "active")}>{remainTimeText}</div>
    </div>
  );
};

export default TaskRemainTimer;
