const JsxUtil = {
  classByCondition: (condition, className) => {
    return condition ? ` ${className}` : "";
  },
  classByEqual: (a, b, className) => {
    return a == b ? ` ${className}` : "";
  },
  classByNonEqual: (a, b, className) => {
    return a != b ? ` ${className}` : "";
  },
  class: (...classNames) => {
    return " " + classNames.join(" ");
  },
  fastInterval: (func, period) => {
    func();
    return setInterval(func, period);
  },
};

export default JsxUtil;
