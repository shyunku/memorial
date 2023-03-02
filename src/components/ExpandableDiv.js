import { useEffect, useMemo, useRef, useState } from "react";

export const VERTICAL = "vertical";
export const HORIZONTAL = "horizontal";

const ExpandableDiv = ({
  children,
  expand = true,
  direction = VERTICAL,
  transition = 500,
  reference = null,
  ...rest
}) => {
  const directionStyle = useMemo(() => {
    return direction === VERTICAL ? "height" : "width";
  }, [direction]);

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      // if expand is true, recalculating height/width
      const directionStyle = direction === VERTICAL ? "height" : "width";
      if (expand) {
        const originalHeight = reference.current.clientHeight;
        reference.current.style[directionStyle] = "auto";
        const height = reference.current.clientHeight;
        reference.current.style[directionStyle] = `${originalHeight}px`;

        setTimeout(() => {
          reference.current.style.transition = `${directionStyle} ${transition}ms ease-in-out`;
          reference.current.style[directionStyle] = `${height}px`;
        }, 0);
      } else {
        reference.current.style[directionStyle] = "0px";
      }
    });
    observer.observe(reference.current, {
      subtree: true,
      childList: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [reference, expand, transition]);

  useEffect(() => {
    if (expand && reference.current?.style != null) {
      // expand
      // disable transition & calculate height/width
      reference.current.style[directionStyle] = "auto";
      const height = reference.current.clientHeight;
      reference.current.style[directionStyle] = "0px";
      // enable transition & set height/width
      setTimeout(() => {
        if (reference.current?.style == null) return;
        reference.current.style.transition = `${directionStyle} ${transition}ms ease-in-out`;
        reference.current.style[directionStyle] = `${height}px`;
      }, 0);
    } else {
      // collapse
      reference.current.style[directionStyle] = "0px";
    }
  }, [expand]);

  const onTransitionEnd = () => {
    // console.log("transition end");
    // reference.current.style[directionStyle] = "auto";
  };

  return (
    <div ref={reference} className="collapsable-div" onTransitionEnd={onTransitionEnd} {...rest}>
      {children}
    </div>
  );
};

export default ExpandableDiv;
