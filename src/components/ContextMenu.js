import { createRef, useEffect, useRef, useState } from "react";
import * as uuid from "uuid";

const direction = ["left", "right", "top", "bottom"];

const ContextMenuStyle = {
  position: "absolute",
  //   left: "0px",
  //   top: "0px",
  opacity: "1",
  visibility: "hidden",
  backgroundColor: "#00000050",
  backdropFilter: "blur(5px)",
  zIndex: "1000",
};

export const ContextMenu = ({ reference, children }) => {
  return (
    <div ref={reference} className="context-menu" style={ContextMenuStyle}>
      {children}
    </div>
  );
};

export const useContextMenu = ({ contextId = null }) => {
  const [visiblity, setVisibility] = useState(false);
  const [contextMenuX, setContextMenuX] = useState(0);
  const [contextMenuY, setContextMenuY] = useState(0);

  const contextMenuRef = useRef();
  const recentActivatedElement = useRef();

  const onContextMenuHandler = (e) => {
    e.preventDefault();

    if (visiblity) {
      setVisibility(false);
      return;
    }

    setContextMenuX(e.clientX);
    setContextMenuY(e.clientY);
    setVisibility(true);
    recentActivatedElement.current = e.target;
  };

  console.log(visiblity);

  useEffect(() => {
    const onOutsideClick = (e) => {
      if (
        contextMenuRef.current != null &&
        !contextMenuRef.current.contains(e.target) &&
        e.target != recentActivatedElement.current
      ) {
        setVisibility(false);
      }
    };

    document.addEventListener("click", onOutsideClick);
    return () => {
      document.removeEventListener("click", onOutsideClick);
    };
  }, [contextMenuRef, visiblity, recentActivatedElement]);

  useEffect(() => {
    if (contextMenuRef.current != null) {
      console.log(document.clientX);
      contextMenuRef.current.style.left = `${contextMenuX}px`;
      contextMenuRef.current.style.top = `${contextMenuY}px`;
      contextMenuRef.current.style.visibility = visiblity ? "visible" : "hidden";
    }
  }, [contextMenuRef, contextMenuX, contextMenuY, visiblity]);

  return [contextMenuRef, onContextMenuHandler];
};

export default {};
