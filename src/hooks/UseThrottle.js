import { useState } from "react";

const useThrottle = (fn, limit = 0, saveLastValue = false) => {
  const [lock, setLock] = useState(false);
  const [lastValue, setLastValue] = useState(null);

  return (...args) => {
    console.log("locked");
    if (lock) return saveLastValue ? lastValue : null;
    setLock(true);
    setTimeout(setLock(false), limit);
    let newVal = fn(...args);
    setLastValue(newVal);
    return newVal;
  };
};

export default useThrottle;
