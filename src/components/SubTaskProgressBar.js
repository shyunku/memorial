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

const SubTaskFinalCircle = ({ fulfilled = false }) => {
  return (
    <div className={"subtask-circle final" + JsxUtil.classByCondition(fulfilled, "fulfilled")} style={{ left: `100%` }}>
      <div className="complete">완료!</div>
    </div>
  );
};

const SubTaskProgressBar = ({ fulfilled = 0, total = 0, done = false }) => {
  return (
    <div className="subtask-progress-bar-wrapper">
      {total > 0 && (
        <div className="subtask-progress">
          {fulfilled}/{total}
        </div>
      )}
      <div className="subtask-progress-bar">
        <div className="filler" style={{ width: `${(100 * fulfilled) / (total + 1)}%` }}></div>
        <div className="subtask-circles">
          {total <= maxVisibleCircleCount &&
            [...Array(total + 1)].map((_, index) => (
              <SubTaskCircle index={index} total={total} fulfilled={fulfilled} />
            ))}
          <SubTaskFinalCircle fulfilled={done} />
        </div>
      </div>
    </div>
  );
};

export default SubTaskProgressBar;
