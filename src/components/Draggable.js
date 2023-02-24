import { useCallback, useEffect, useState } from "react";
import JsxUtil from "utils/JsxUtil";
import { v4 } from "uuid";
import "./Draggable.scss";

export const DraggableDiv = ({
  children,
  className = "",
  dropPredictHandler = () => null,
  dragEndHandler = () => false,
  ...rest
}) => {
  const [draggableDivId, _] = useState(`draggable_div_${v4()}`);
  const [dragging, setDragging] = useState(false);
  const [originalStyles, setOriginalStyles] = useState({});

  const originalize = useCallback(
    (draggableDiv) => {
      if (draggableDiv) {
        draggableDiv.style.position = originalStyles.position;
        draggableDiv.style.left = originalStyles.left;
        draggableDiv.style.top = originalStyles.top;
        draggableDiv.style.transition = originalStyles.transition;
      }
    },
    [draggableDivId, originalStyles]
  );

  const onDragStart = (e) => {
    e.stopPropagation();
    console.log("drag start", e);
    setDragging(true);
    setOriginalStyles({
      position: e.currentTarget.style.position,
      left: e.currentTarget.style.left,
      top: e.currentTarget.style.top,
      transition: e.currentTarget.style.transition,
    });

    // e.currentTarget.style.transition = "none";
  };

  const onDragEnd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("drag end", e);
    setDragging(false);

    // drag end failed, return to original status
    if (dragEndHandler(e) === true) return;
    originalize(e.currentTarget);
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("drop", draggableDivId, e);
  };

  //   const onDragOver = (e) => {
  //     e.preventDefault();
  //     e.stopPropagation();
  //     return;
  //   };

  const onDrag = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // console.log("x", x, "y", y);

    const draggableDiv = e.currentTarget;
    const id = dropPredictHandler(e);
    // console.log(id);
    const prevItem = id ? document.getElementById(id) : null;

    if (prevItem) {
      //   console.log(id);
      // move the draggable div element to next of the prev item
      prevItem.parentNode.insertBefore(e.currentTarget, prevItem.nextSibling);
      originalize(e.currentTarget);
    } else {
      draggableDiv.style.position = "fixed";
      draggableDiv.style.left = x + "px";
      draggableDiv.style.top = y + "px";
    }
  };

  return (
    <div
      id={draggableDivId}
      className={"draggable-div" + JsxUtil.classByCondition(dragging, "dragging") + " " + className}
      draggable={true}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      //   onDragOver={onDragOver}
      onDrag={onDrag}
      {...rest}
    >
      {children}
    </div>
  );
};

export const DroppableDiv = ({ children, ...rest }) => {
  return (
    <div className="droppable-div" {...rest}>
      {children}
    </div>
  );
};

export default {};
