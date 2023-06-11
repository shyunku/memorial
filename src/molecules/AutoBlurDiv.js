import { useEffect, useRef } from "react";

/**
 *
 * @param {*?} reference is not required, but it is recommended to use it
 * if you want to prevent blurring when clicking on the reference element
 * @param {function?} blurHandler is used to be executed when the blur event occurs
 * if not provided, the blur event will be ignored
 * @returns {JSX}
 */
const AutoBlurDiv = ({
  reference,
  children,
  blurHandler = () => {},
  focused = false,
  ...rest
}) => {
  const ref = useRef();

  useEffect(() => {
    if (!focused) return;

    const onOutsideClick = (e) => {
      if (reference?.current != null && reference?.current.contains(e.target))
        return;
      if (ref.current != null && ref.current.contains(e.target)) return;
      blurHandler?.();
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
