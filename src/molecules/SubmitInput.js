import React, { useState, useEffect, useRef, useImperativeHandle } from "react";

const SubmitInput = ({
  placeholder,
  initial = "",
  secret = false,
  onSubmit,
  allowEmpty = false,
  innerRef,
  maxLength,
  ...rest
}) => {
  const inputRef = useRef();
  const [input, setInput] = useState(initial);
  const [warnning, setWarnning] = useState(false);

  const warn = () => {
    if (warnning) return;
    inputRef.current.classList.add("shake");
    setWarnning(true);
    setTimeout(() => {
      inputRef.current.classList.remove("shake");
      setWarnning(false);
    }, 1000);
  };

  useImperativeHandle(innerRef, () => {
    return {
      clear: () => setInput(""),
      valueOf: () => input,
      warn,
    };
  });

  const onKeyDown = async (e) => {
    if (e.key === "Enter") {
      if (allowEmpty === false && input.length === 0) {
        warn();
        return;
      }
      const success = (await onSubmit?.(input)) ?? false;
      if (success) setInput("");
      else {
        // TODO :: popup error
      }
    }
  };

  const onChange = (e) => {
    const newValue = e.target.value;
    if (maxLength != null && newValue.length > maxLength) {
      warn();
      return;
    }
    setInput(e.target.value);
  };

  useEffect(() => {
    if (inputRef.current) {
      const listener = (e) => {
        setInput("");
      };
      document.addEventListener("clear", listener);
      return () => {
        document.removeEventListener("clear", listener);
      };
    }
  }, [inputRef.current]);

  return (
    <input
      ref={inputRef}
      placeholder={placeholder}
      value={input}
      onChange={onChange}
      onKeyDown={onKeyDown}
      type={secret ? "password" : "text"}
      //   maxLength={maxLength}
      {...rest}
    />
  );
};
export default SubmitInput;
