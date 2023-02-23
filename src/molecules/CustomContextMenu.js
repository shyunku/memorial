import { createRef, useEffect, useMemo, useRef, useState } from "react";
import { v4 } from "uuid";

const direction = ["left", "right", "top", "bottom"];

const ContextMenuStyle = {
  position: "fixed",
  opacity: "1",
  visibility: "hidden",
  zIndex: "1000",
};

export const ContextMenu = ({ className = "", reference, children, sticky = false, ...rest }) => {
  const [contextMenuId] = useState(v4());
  return (
    <div
      id={contextMenuId}
      ref={reference}
      className={"context-menu " + className}
      style={ContextMenuStyle}
      sticky={`${sticky}`}
      {...rest}
    >
      {children}
    </div>
  );
};

export const useContextMenu = ({ offsetX = 5, offsetY = 5, stickRefTo, preventCloseIdList = [] }) => {
  const [visiblity, setVisibility] = useState(false);
  const [contextMenuX, setContextMenuX] = useState(0);
  const [contextMenuY, setContextMenuY] = useState(0);
  const [clickedTargetBoundary, setClickedTargetBoundary] = useState({});

  const openerRef = useRef();
  const contextMenuRef = useRef();
  const recentActivatedElement = useRef();

  const contextMenuObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === "class" && mutation.type === "attributes") {
        if (contextMenuRef.current.classList.contains("hide")) {
          setVisibility(false);
        }
      }
    });
  });

  const sticky = useMemo(() => {
    return contextMenuRef.current != null && contextMenuRef.current.getAttribute("sticky") == "true";
  }, [contextMenuRef.current]);

  const layer = useMemo(() => {
    let contextMenuLayer = 0;
    if (contextMenuRef.current != null) {
      let parent = contextMenuRef.current.parentElement;
      while (parent != null) {
        if (parent.classList.contains("context-menu")) {
          contextMenuLayer++;
        }
        parent = parent.parentElement;
      }
    }
    return contextMenuLayer;
  }, [contextMenuRef.current]);

  useEffect(() => {
    if (contextMenuRef.current != null) {
      contextMenuObserver.observe(contextMenuRef.current, { attributes: true });
    }
  }, [contextMenuRef.current]);

  const onContextMenuOpenHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // console.log(e.currentTarget, e.target);

    if (e.currentTarget != e.target) {
      // if ancestor of e.target is contextMenu, don't close context menu
      let foundContextMenu = false;
      let parent = e.target.parentElement;
      while (parent != null) {
        if (parent.classList.contains("context-menu")) {
          foundContextMenu = true;
          break;
        }
        parent = parent.parentElement;
      }

      if (foundContextMenu) {
        return;
      }

      // if ancestor has autoclose attribute and it's not false, close context menu
      let foundAutoClose = false;
      parent = e.target.parentElement;
      while (parent != null) {
        if (parent.getAttribute("autoclose") != null && parent.getAttribute("autoclose") != "false") {
          foundAutoClose = true;
          break;
        }
        parent = parent.parentElement;
      }

      if (!foundAutoClose) {
        console.log("closed with autoclose handler");
        setVisibility(false);
      }
    } else {
      if (sticky) {
        // set context menu position to proper position
        // set clicked target boundary
        let rect = (stickRefTo?.current ?? e.target).getBoundingClientRect();
        setClickedTargetBoundary({
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
        });
      } else {
        setContextMenuX(e.clientX);
        setContextMenuY(e.clientY);
      }

      setVisibility(true);
      recentActivatedElement.current = e.target;
    }
  };

  const onContextMenuCloseHandler = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // close all context menu of recent activated element's ancestor
    let parent = recentActivatedElement.current.parentElement;
    while (parent != null) {
      if (parent.classList.contains("context-menu")) {
        parent.classList.add("hide");
      }
      parent = parent.parentElement;
    }

    setVisibility(false);
  };

  useEffect(() => {
    if (openerRef?.current != null) {
      const children = openerRef.current.children;
      // check if children has this context menu
      // children that doesn't have this context would have "pointer-events: none"
      for (let i = 0; i < children.length; i++) {
        if (!children[i].classList.contains("context-menu")) {
          children[i].style.pointerEvents = "none";
        } else {
        }
      }
    }
  }, [openerRef]);

  useEffect(() => {
    const onOutsideClick = (e) => {
      if (
        contextMenuRef.current != null &&
        !contextMenuRef.current.contains(e.target) &&
        e.target != recentActivatedElement.current &&
        visiblity == true
      ) {
        // check if clicked element's ancestor is in preventCloseIdList
        let parent = e.target.parentElement;
        while (parent != null) {
          if (preventCloseIdList.includes(parent.id)) {
            return;
          }

          parent = parent.parentElement;
        }
        console.log("closed with outside handler");
        setVisibility(false);
      }
    };

    document.addEventListener("mousedown", onOutsideClick);
    return () => {
      document.removeEventListener("mousedown", onOutsideClick);
    };
  }, [contextMenuRef, visiblity, recentActivatedElement]);

  useEffect(() => {
    if (contextMenuRef.current != null) {
      let width = document.documentElement.clientWidth;
      let height = document.documentElement.clientHeight;

      let midX = width / 2;
      let midY = height / 2;

      // initialize
      for (let i = 0; i < direction.length; i++) {
        contextMenuRef.current.style[direction[i]] = null;
      }

      let targetZindexRaw = recentActivatedElement.current
        ? window.getComputedStyle(recentActivatedElement.current).getPropertyValue("z-index")
        : 0;
      let targetZindex = targetZindexRaw == "auto" ? 0 : targetZindexRaw;
      contextMenuRef.current.style.zIndex = Math.max(1000 + layer, targetZindex + 1);

      let horizontal =
        contextMenuX < midX ? ["left", contextMenuX + offsetX] : ["right", width - contextMenuX + offsetX];
      let vertical =
        contextMenuY < midY ? ["top", contextMenuY + offsetY] : ["bottom", height - contextMenuY + offsetY];

      let verticalInd = contextMenuY < midY ? 1 : -1;

      contextMenuRef.current.style.transition = "none";

      if (sticky) {
        // set context menu position to proper position
        // set clicked target boundary
        let rect = clickedTargetBoundary;

        if (rect.left < midX) {
          contextMenuRef.current.style.left = `${rect.left}px`;
        } else {
          contextMenuRef.current.style.right = `${width - rect.left}px`;
        }

        if (rect.top < midY) {
          contextMenuRef.current.style.top = `${rect.bottom + (rect.top - rect.bottom)}px`;
        } else {
          contextMenuRef.current.style.bottom = `${height - rect.top + (rect.top - rect.bottom)}px`;
        }
        verticalInd = -verticalInd;
      } else {
        contextMenuRef.current.style[horizontal[0]] = `${horizontal[1]}px`;
        contextMenuRef.current.style[vertical[0]] = `${vertical[1]}px`;
      }

      let _ = contextMenuRef.current.offsetHeight; // must need to flush css changes
      contextMenuRef.current.style.transform = visiblity ? "translateY(0px)" : `translateY(${30 * verticalInd}px)`;

      contextMenuRef.current.style.visibility = visiblity ? "visible" : "hidden";
      contextMenuRef.current.style.opacity = visiblity ? "1" : "0";

      contextMenuRef.current.style.transition = "0.3s ease-in-out";
    }
  }, [contextMenuRef, contextMenuX, contextMenuY, visiblity, recentActivatedElement]);

  return [contextMenuRef, openerRef, onContextMenuOpenHandler, onContextMenuCloseHandler];
};

export default {};
