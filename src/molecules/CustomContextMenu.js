import { createRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import JsxUtil from "utils/JsxUtil";
import { v4 } from "uuid";
import "./CustomContextMenu.scss";

/**
 * If you want to make a context menu bundle as "button", with visible part & context menu,
 * you have to seperate visible part & context menu. (same layer for two)
 * Then, you can follow this steps.
 *
 * 1. Create context with using @function useContextMenu hook.
 *    ex) const context = useContextMenu({ ... });
 * 2. Add openerRef and opener function to visible part.
 *    ex) <div ref={context.openerRef} onClick={context.opener}>...</div>
 * 3. Add reference to context menu.
 *    ex) <ContextMenu reference={context.ref}>...</ContextMenu>
 * 4. Add closer function to somewhere else. (Optional)
 *    ex) <div onClick={context.closer}>...</div>
 *
 * There are more options for context menu.
 * 1. You can set sticky option to context menu. (default: false)
 *    If you set sticky option to true, context menu will be shown sticky to visible part.
 *      ex) <ContextMenu reference={context.ref} sticky={true}>...</ContextMenu>
 *    You can also set sticky direction to it. (In this case, this option should be set with hook)
 *      ex) const context = useContextMenu({ horizontal: true });
 *    And Also you can set where context menu stick to. (default: visible part)
 * 2. You can set onBlur function to context menu. (default: () => {})
 *    If you set onBlur function to context menu, it will be called when context menu is closed.
 * 3. You can set context menu position offset. (default: { offsetX: 5, offsetY: 5 })
 *    Originally, context menu will be shown at the mouse position (if sticky option is disabled).
 *    You can set offset to context menu position.
 * 4. You can set preventCloseIdList to context menu. (default: [])
 *    Context menu will not be closed when clicked on the element which has id in preventCloseIdList.
 * 5. You can set clearInputsOnBlur to context menu. (default: false)
 *    If enabled, Context menu will clear all inputs in it when context menu is closed.
 *
 * What you don't need to do (automatically processed)
 * 1. Context menu will be closed when clicked outside of context menu.
 * 2. Pointer events of non-context-menu child in openerRef will be disabled (to not interrupt click event for opener).
 */

export const DIRECTON = {
  LEFT: "left",
  RIGHT: "right",
  TOP: "top",
  BOTTOM: "bottom",
};

const ContextMenuStyle = {
  position: "fixed",
  opacity: "0",
  visibility: "hidden",
  zIndex: "1000",
  pointerEvents: "none",
};

export const ContextMenu = ({ className = "", reference, children, defaultStyle = false, sticky = false, ...rest }) => {
  const [contextMenuId] = useState(v4());
  return (
    <div
      id={contextMenuId}
      ref={reference}
      className={"context-menu " + className + JsxUtil.classByCondition(defaultStyle, "default-style")}
      style={ContextMenuStyle}
      sticky={`${sticky}`}
      {...rest}
    >
      {children}
    </div>
  );
};

export const Seperator = () => {
  return <div className="seperator"></div>;
};

export const useContextMenu = ({
  offsetX = 5,
  offsetY = 5,
  stickRefTo,
  onBlur = () => {},
  clearInputsOnBlur = false,
  preventCloseIdList = [],
  horizontal = true,
}) => {
  const [visiblity, setVisibility] = useState(false);
  const [contextMenuX, setContextMenuX] = useState(0);
  const [contextMenuY, setContextMenuY] = useState(0);
  const [clickedTargetBoundary, setClickedTargetBoundary] = useState({});
  const [contextMenuChanger, setContextMenuChanger] = useState(0);

  const openerRef = useRef();
  const contextMenuRef = useRef();
  const recentActivatedElement = useRef();

  const contextMenuObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      setContextMenuChanger((prev) => prev + 1);
      if (mutation.attributeName === "class" && mutation.type === "attributes") {
        if (contextMenuRef.current.classList.contains("hide")) {
          console.log("close by hider");
          setVisibility(false);
          blurHandler();
        }
      }
    });
  });

  const blurHandler = useCallback(() => {
    if (clearInputsOnBlur && contextMenuRef.current != null) {
      const inputs = contextMenuRef.current.querySelectorAll("input");
      inputs.forEach((input) => {
        input.dispatchEvent(new Event("clear", { bubbles: true }));
      });
    }
    onBlur();
  }, [contextMenuRef.current, clearInputsOnBlur, onBlur]);

  const sticky = useMemo(() => {
    return contextMenuRef.current != null && contextMenuRef.current.getAttribute("sticky") == "true";
  }, [contextMenuRef.current, contextMenuChanger]);

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

    const finalize = () => {
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
      }
      setContextMenuX(e.clientX);
      setContextMenuY(e.clientY);

      setVisibility(true);
      recentActivatedElement.current = e.target;
    };

    if (e.currentTarget != e.target) {
      console.log(e.currentTarget, e.target);
      // if ancestor of e.target is openerRef, just open context menu & make children as no pointer events
      let foundOpener = false;
      let parent = e.target.parentElement;
      while (parent != null) {
        if (parent == openerRef.current) {
          foundOpener = true;
          break;
        }
        parent = parent.parentElement;
      }

      if (foundOpener) {
        const children = openerRef.current.children;
        let foundNonContextMenu = false;

        // check if children of openerRef has this context menu
        // children that doesn't have this context would have "pointer-events: none"
        for (let i = 0; i < children.length; i++) {
          if (!children[i].classList.contains("context-menu")) {
            children[i].style.pointerEvents = "none";
          }
        }

        console.log("opened with in-openerRef handler", openerRef.current);
        finalize();
        return;
      }

      // if ancestor of e.target is contextMenu, don't close context menu
      let foundContextMenu = false;
      parent = e.target.parentElement;
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
        blurHandler();
      }
    } else {
      console.log("opened with exact target click handler");
      finalize();
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

    console.log("close by closer");
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
        }
      }
    }
  }, [openerRef.current]);

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
        blurHandler();
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
      for (let dir of Object.values(DIRECTON)) contextMenuRef.current.style[dir] = null;

      let targetZindexRaw = recentActivatedElement.current
        ? window.getComputedStyle(recentActivatedElement.current).getPropertyValue("z-index")
        : 0;
      let targetZindex = targetZindexRaw == "auto" ? 0 : targetZindexRaw;
      contextMenuRef.current.style.zIndex = Math.max(1000 + layer, targetZindex + 1);

      let horiz = contextMenuX < midX ? ["left", contextMenuX + offsetX] : ["right", width - contextMenuX + offsetX];
      let verti = contextMenuY < midY ? ["top", contextMenuY + offsetY] : ["bottom", height - contextMenuY + offsetY];
      let verticalInd = contextMenuY < midY ? 1 : -1;

      contextMenuRef.current.style.transition = "none";
      if (sticky) {
        // set context menu position to proper position
        // set clicked target boundary
        let rect = clickedTargetBoundary;

        if (horizontal) {
          if (rect.left < midX) {
            // to right
            contextMenuRef.current.style.left = `${rect.right}px`;
          } else {
            // to left
            contextMenuRef.current.style.right = `${width - rect.left}px`;
          }

          if (rect.top < midY) {
            // to bottom
            contextMenuRef.current.style.top = `${rect.top}px`;
          } else {
            // to top
            contextMenuRef.current.style.bottom = `${height - rect.bottom}px`;
          }
        } else {
          if (rect.left < midX) {
            // to right
            contextMenuRef.current.style.left = `${rect.left}px`;
          } else {
            // to left
            contextMenuRef.current.style.right = `${width - rect.right}px`;
          }

          if (rect.top < midY) {
            // to bottom
            contextMenuRef.current.style.top = `${rect.bottom}px`;
          } else {
            // to top
            contextMenuRef.current.style.bottom = `${height - rect.top}px`;
          }
        }
      } else {
        contextMenuRef.current.style[horiz[0]] = `${horiz[1]}px`;
        contextMenuRef.current.style[verti[0]] = `${verti[1]}px`;
      }

      let _ = contextMenuRef.current.offsetHeight; // must need to flush css changes
      contextMenuRef.current.style.transform = visiblity ? "translateY(0px)" : `translateY(${30 * verticalInd}px)`;
      contextMenuRef.current.style.visibility = visiblity ? "visible" : "hidden";
      contextMenuRef.current.style.opacity = visiblity ? "1" : "0";
      contextMenuRef.current.style.transition = "0.3s ease-in-out";
      contextMenuRef.current.style.pointerEvents = visiblity ? "auto" : "none";
    }
  }, [contextMenuRef, contextMenuX, contextMenuY, visiblity, recentActivatedElement]);

  return { ref: contextMenuRef, openerRef, opener: onContextMenuOpenHandler, closer: onContextMenuCloseHandler };
};

export default {};
