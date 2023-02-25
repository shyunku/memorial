import useThrottle from "hooks/UseThrottle";
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
  const [lastDragPos, setLastDragPos] = useState([]);
  const [droppingInfo, setDroppingInfo] = useState({});

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
    // console.log("drag start", e);

    const isDragZone = e.currentTarget.classList.contains("draggable-zone");
    console.log(isDragZone);
    if (!isDragZone) {
      // exclude if point is not on dragging zone
      const dragZones = e.currentTarget.querySelectorAll(".draggable-zone");
      if (dragZones.length == 0) {
        e.preventDefault();
        return;
      }

      for (let i = 0; i < dragZones.length; i++) {
        const rect = dragZones[i].getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
          break;
        }
        if (i == dragZones.length - 1) {
          e.preventDefault();
          return;
        }
      }
    }

    setDragging(true);
    setOriginalStyles({
      position: e.currentTarget.style.position,
      left: e.currentTarget.style.left,
      top: e.currentTarget.style.top,
      transition: e.currentTarget.style.transition,
    });
  };

  const onDragEnd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // console.log("drag end", e);
    setDragging(false);

    // drag end failed, return to original status
    if (dragEndHandler(e) === true) return;
    originalize(e.currentTarget);
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // console.log("drop", draggableDivId, e);
  };

  const onDragOver = (e) => {
    e.preventDefault();
  };

  const onDrag = useThrottle((e) => {
    e.preventDefault();

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (lastDragPos[0] == x && lastDragPos[1] == y) return;
    setLastDragPos([x, y]);

    const draggableDiv = e.currentTarget;
    const predictResult = dropPredictHandler(e);
    const id = predictResult?.[0];
    const isFirst = predictResult?.[1];
    const closeItem = id ? document.getElementById(id) : null;

    // console.log(id, isFirst);

    if (closeItem) {
      if (droppingInfo.id == id && droppingInfo.isFirst == isFirst) return;
      //   console.log(id);
      // move the draggable div element to next of the prev item
      if (isFirst) {
        closeItem.parentNode.insertBefore(e.currentTarget, closeItem);
      } else {
        closeItem.parentNode.insertBefore(e.currentTarget, closeItem.nextSibling);
      }

      originalize(e.currentTarget);
    } else {
      draggableDiv.style.position = "fixed";
      draggableDiv.style.left = x + "px";
      draggableDiv.style.top = y + "px";
    }

    setDroppingInfo({ id, isFirst });
  }, 20);

  return (
    <div
      id={draggableDivId}
      className={"draggable-div" + JsxUtil.classByCondition(dragging, "dragging") + " " + className}
      draggable={true}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDrag={onDrag}
      {...rest}
    >
      {children}
    </div>
  );
};

export const DraggableZone = ({ children, className = "", ...rest }) => {
  return (
    <div className={"draggable-zone " + className} {...rest}>
      {children}
    </div>
  );
};

export default {};
