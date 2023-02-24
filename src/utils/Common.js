export function fastInterval(callback, interval) {
  callback();
  let id = setInterval(callback, interval);
  return id;
}

export function debounce(callback, interval, resolve) {
  let timeout = null;
  return function (...args) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      resolve(callback.apply(this, args));
      timeout = null;
    }, interval);
  };
}

export default {};
