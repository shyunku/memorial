import JsxUtil from "utils/JsxUtil";
import "./SubTaskProgressBar.scss";

const maxVisibleCircleCount = 7;

const SubTaskCircle = ({ index, total, fulfilled }) => {
  return (
    <div
      className={"subtask-circle" + JsxUtil.classByCondition(index < fulfilled, "fulfilled")}
      key={index}
      style={{ left: `${100 * ((index + 1) / (total + 1))}%` }}
    ></div>
  );
};

const SubTaskFinalCircle = ({ fulfilled = false, doneHandler }) => {
  return (
    <div
      className={"subtask-circle final" + JsxUtil.classByCondition(fulfilled, "fulfilled")}
      style={{ left: `100%` }}
      onClick={(e) => doneHandler?.(!fulfilled)}
    >
      <div className="complete">{fulfilled ? "취소" : "완료!"}</div>
    </div>
  );
};

const SubTaskProgressBar = ({ overdue = false, fulfilled = 0, total = 0, done = false, doneHandler }) => {
  const allDone = fulfilled === total && done;
  return (
    <div className={"subtask-progress-bar-wrapper" + JsxUtil.classByCondition(overdue, "overdue")}>
      <div className="subtask-progress-bar">
        <div className="filler" style={{ width: `${(100 * (fulfilled + (allDone ? 1 : 0))) / (total + 1)}%` }}></div>
        <div className="subtask-circles">
          {total <= maxVisibleCircleCount &&
            [...Array(total + 1)].map((_, index) => (
              <SubTaskCircle index={index} total={total} fulfilled={fulfilled} key={index} />
            ))}
          <SubTaskFinalCircle fulfilled={done} doneHandler={doneHandler} />
        </div>
      </div>
      <div className="subtask-progress">
        {fulfilled}/{total}
      </div>
    </div>
  );
};

export default SubTaskProgressBar;
