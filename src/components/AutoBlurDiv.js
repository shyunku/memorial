import { useEffect, useRef } from "react";

const AutoBlurDiv = ({ reference, children, blurHandler = () => {}, focused = false, ...rest }) => {
  const ref = useRef();

  useEffect(() => {
    if (!focused) return;

    const onOutsideClick = (e) => {
      if (reference.current != null && !reference.current.contains(e.target)) {
        if (ref.current != null && ref.current.contains(e.target)) return;
        blurHandler?.();
      }
    };

    document.addEventListener("mouseup", onOutsideClick);
    return () => {
      document.removeEventListener("mouseup", onOutsideClick);
    };
  }, [reference, focused, blurHandler]);

  return (
    <div ref={ref} {...rest}>
      {children}
    </div>
  );
};

export default AutoBlurDiv;
