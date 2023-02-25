import { useState } from "react";

const useThrottle = (fn, limit = 0, saveLastValue = false) => {
  let lock = false,
    lastValue;
  // const [lock, setLock] = useState(false);
  // const [lastValue, setLastValue] = useState(null);

  return (...args) => {
    if (lock) return saveLastValue ? lastValue : null;
    // setLock(true);
    lock = true;
    setTimeout(() => {
      lock = false;
    }, limit);
    let newVal = fn(...args);
    // setLastValue(newVal);
    lastValue = newVal;
    return newVal;
  };
};

export default useThrottle;
