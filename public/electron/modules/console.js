const moment = require("moment");

global.TRACE_MAX_LENGTH = 0;
global.ERROR_TRACE_SIZE = 5;

const rgbANSI = (r, g, b) => `\x1b[38;2;${r};${g};${b}m`;

module.exports = (loggerModule) => {
  (console.RESET = "\x1b[0m"), (console.BRIGHT = "\x1b[1m");

  console.BLACK = "\x1b[30m";
  console.RED = "\x1b[31m";
  console.GREEN = "\x1b[32m";
  console.YELLOW = "\x1b[33m";
  console.BLUE = "\x1b[34m";
  console.MAGENTA = "\x1b[35m";
  console.CYAN = "\x1b[36m";
  console.WHITE = "\x1b[37m";

  // extra
  console.ORANGE = rgbANSI(255, 131, 59);
  console.LIME = rgbANSI(241, 255, 138);
  console.PURPLE = rgbANSI(184, 148, 255);
  console.PINK = rgbANSI(242, 99, 255);
  console.AQUA = rgbANSI(66, 255, 198);
  console.RGB = rgbANSI;

  console.bBLACK = "\x1b[40m";
  console.bRED = "\x1b[41m";
  console.bGREEN = "\x1b[42m";
  console.bYELLOW = "\x1b[43m";
  console.bBLUE = "\x1b[44m";
  console.bMAGENTA = "\x1b[45m";
  console.bCYAN = "\x1b[46m";
  console.bWHITE = "\x1b[47m";

  console.wrap = (content, colorCode) => {
    return (colorCode ?? "") + content + console.RESET;
  };

  console.wlog = (content, colorCode) => {
    console.log(colorCode + content + console.RESET);
  };

  const shorten = (value, newLineLimit = null) => {
    switch (typeof value) {
      case "string":
        return value;
      case "object":
        if (value instanceof Error) {
          const errorStack = value.stack;
          const matched = errorStack.match(/[.a-zA-Z0-9]+\:[0-9]+/g);
          const matchedTraces = matched ? matched.slice(0, global.ERROR_TRACE_SIZE) : [];
          let traceTexts = [];

          for (let trace of matchedTraces) {
            const filenameSegments = trace.split(".");
            const lineSegments = trace.split(":");

            const filename =
              filenameSegments.length > 1
                ? filenameSegments.slice(0, filenameSegments.length - 1).join(".")
                : lineSegments[0];

            const lastSegment = lineSegments[lineSegments.length - 1];
            const [line] = lastSegment.match(/([0-9]+)/g);
            traceTexts.push(`${filename}(${line})`);
          }

          traceTexts = traceTexts.reverse();
          return (
            console.wrap(`[Trace: ${traceTexts.length > 0 ? traceTexts.join(".") : "unknown"}]`, console.RED) +
            " " +
            value.message
          );
        }
      default:
        try {
          let stringifiedContent = JSON.stringify(value);
          if (newLineLimit && stringifiedContent.length > newLineLimit) {
            return "\n" + JSON.stringify(param, null, 4);
          }
          return stringifiedContent;
        } catch (err) {
          return "[Circular Object]";
        }
    }
  };

  const tracer = () => {
    const priorStackTrace = Error.prepareStackTrace;
    Error.prepareStackTrace = (err, stack) =>
      stack.map((frame) => ({
        file: frame.getFileName(),
        column: frame.getColumnNumber(),
        line: frame.getLineNumber(),
        functionName: frame.getFunctionName(),
      }));

    const errorStack = new Error().stack;
    Error.prepareStackTrace = priorStackTrace;

    const slicedCallStack = errorStack.slice(3, 5);
    let callStackTraceMsg = slicedCallStack
      .map((entry) => {
        let { column, line, file } = entry;
        if (file === null) return "null";

        let pathSegments = file.split("\\");
        let lastSegment = pathSegments.last();
        let cleanFileName = lastSegment.split(".").first();
        let shortenFileName = cleanFileName.split("/").last();

        return `${shortenFileName}(${line})`;
      })
      .reverse()
      .join(".");

    global.TRACE_MAX_LENGTH = Math.max(global.TRACE_MAX_LENGTH, callStackTraceMsg.length);
    return callStackTraceMsg;
  };

  const logger = (level, ...arg) => {
    let currentDate = new Date();
    let levelColorCode = getColorCodeByLevel(level);

    let timeSegment = moment(currentDate).format("YY/MM/DD HH:mm:ss.SSS");
    let levelSegment = console.wrap(level.padEnd(6, " "), levelColorCode);
    let traceSegment = console.wrap(tracer().padEnd(global.TRACE_MAX_LENGTH, " "), console.YELLOW);
    let contentSegment = arg.map((argument) => shorten(argument)).join(" ");

    const finalString = `${timeSegment} ${levelSegment} ${traceSegment} ${contentSegment}`;

    if (loggerModule) {
      let levelLowerCode = level === "SYSTEM" ? "info" : level.toLowerCase();
      if (loggerModule[levelLowerCode]) {
        loggerModule[levelLowerCode](`${traceSegment} ${contentSegment}`);
      }
    }

    // need within stdout
    console.log(finalString);
  };

  console.debug = (...arg) => logger("DEBUG", ...arg);
  console.info = (...arg) => logger("INFO", ...arg);
  console.warn = (...arg) => logger("WARN", ...arg);
  console.error = (...arg) => logger("ERROR", ...arg);
  console.system = (...arg) => logger("SYSTEM", ...arg);
  console.shorten = shorten;
};

function getColorCodeByLevel(level) {
  switch (level) {
    case "DEBUG":
      return console.MAGENTA;
    case "INFO":
      return console.CYAN;
    case "WARN":
      return console.YELLOW;
    case "ERROR":
      return console.RED;
    case "SYSTEM":
      return console.BLUE;
    default:
      return console.RESET;
  }
}
