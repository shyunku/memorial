import JsxUtil from "utils/JsxUtil";
import "./SubTaskProgressBar.scss";
import { useState } from "react";

const maxVisibleCircleCount = 7;

const SubTaskCircle = ({ index, total, fulfilled }) => {
  return (
    <div
      className={
        "subtask-circle" +
        JsxUtil.classByCondition(index < fulfilled, "fulfilled")
      }
      key={index}
      style={{ left: `${100 * ((index + 1) / (total + 1))}%` }}
    ></div>
  );
};

const SubTaskFinalCircle = ({
  fulfilled = false,
  subtaskDone,
  subtaskTotal,
  doneHandler,
}) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={
        "subtask-circle final" +
        JsxUtil.classByCondition(fulfilled, "fulfilled")
      }
      onClick={(e) => doneHandler?.(!fulfilled)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="complete">
        {subtaskTotal === 0 || hovered
          ? fulfilled
            ? "취소"
            : "완료!"
          : `${subtaskDone}/${subtaskTotal}`}
      </div>
    </div>
  );
};

const SubTaskProgressBar = ({
  overdue = false,
  fulfilled = 0,
  total = 0,
  done = false,
  doneHandler,
}) => {
  const allDone = fulfilled === total && done;
  return (
    <div
      className={
        "subtask-progress-bar-wrapper" +
        JsxUtil.classByCondition(overdue, "overdue") +
        JsxUtil.classByCondition(done, "done")
      }
    >
      {/*{total > 0 && (*/}
      {/*  <div className="subtask-progress">*/}
      {/*    {fulfilled}/{total}*/}
      {/*  </div>*/}
      {/*)}*/}
      <div className={"standalone-completion"}>
        <SubTaskFinalCircle
          fulfilled={done}
          doneHandler={doneHandler}
          subtaskDone={fulfilled}
          subtaskTotal={total}
        />
      </div>
      {/*<div className="subtask-progress-bar">*/}
      {/*  <div*/}
      {/*    className="filler"*/}
      {/*    style={{*/}
      {/*      width: `${(100 * (fulfilled + (allDone ? 1 : 0))) / (total + 1)}%`,*/}
      {/*    }}*/}
      {/*  ></div>*/}
      {/*  <div className="subtask-circles">*/}
      {/*    {total <= maxVisibleCircleCount &&*/}
      {/*      [...Array(total + 1)].map((_, index) => (*/}
      {/*        <SubTaskCircle*/}
      {/*          index={index}*/}
      {/*          total={total}*/}
      {/*          fulfilled={fulfilled}*/}
      {/*          key={index}*/}
      {/*        />*/}
      {/*      ))}*/}
      {/*    <SubTaskFinalCircle fulfilled={done} doneHandler={doneHandler} />*/}
      {/*  </div>*/}
      {/*</div>*/}
    </div>
  );
};

export default SubTaskProgressBar;
