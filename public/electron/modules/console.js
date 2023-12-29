const moment = require("moment");
const ElectronLogger = require("electron-log/main");

global.TRACE_MAX_LENGTH = 0;
global.ERROR_TRACE_SIZE = 5;
global.TRACE_SEGMENT_SIZE = 3;

const rgbANSI = (r, g, b) => `\x1b[38;2;${r};${g};${b}m`;

module.exports = (loggerModule) => {
  console.RESET = "\x1b[0m";
  console.BRIGHT = "\x1b[1m";

  console.BLACK = "\x1b[30m";
  console.RED = "\x1b[31m";
  console.GREEN = "\x1b[32m";
  console.YELLOW = "\x1b[33m";
  console.BLUE = "\x1b[34m";
  console.MAGENTA = "\x1b[35m";
  console.CYAN = "\x1b[36m";
  console.WHITE = "\x1b[37m";

  // extra
  console.ORANGE = rgbANSI(255, 150, 70);
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
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    switch (typeof value) {
      case "string":
        return value;
      case "object":
        if (value instanceof Error) {
          const errorStack = value.stack;
          const matched = errorStack.match(/[.a-zA-Z0-9]+\:[0-9]+/g);
          const matchedTraces = matched
            ? matched.slice(0, global.ERROR_TRACE_SIZE)
            : [];
          let traceTexts = [];

          for (let trace of matchedTraces) {
            const filenameSegments = trace.split(".");
            const lineSegments = trace.split(":");
            const filename = filenamePrettier(trace);

            const lastSegment = lineSegments[lineSegments.length - 1];
            const [line] = lastSegment.match(/([0-9]+)/g);
            traceTexts.push(`${filename}(${line})`);
          }

          traceTexts = traceTexts.reverse();
          return (
            console.wrap(
              `[Trace: ${
                traceTexts.length > 0 ? traceTexts.join(".") : "unknown"
              }]`,
              console.RED
            ) +
            " " +
            value.message
          );
        }
      default:
        try {
          let stringifiedContent = JSON.stringify(value);
          if (newLineLimit && stringifiedContent.length > newLineLimit) {
            return "\n" + JSON.stringify(value, null, 4);
          }
          return stringifiedContent;
        } catch (err) {
          return "[Circular Object]";
        }
    }
  };

  const filenamePrettier = (fullFilename) => {
    // should include extension
    const segments = fullFilename.split(".");
    if (segments.length === 1) return fullFilename;
    let filename = "";
    for (let i = 0; i < segments.length - 1; i++) {
      let segment = segments[i];
      if (i > 0) {
        // make camel
        segment = segment[0].toUpperCase() + segment.slice(1);
      }
      filename += segment;
    }
    return filename;
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

    const slicedCallStack = errorStack.slice(3, 3 + global.TRACE_SEGMENT_SIZE);
    let lastSegmentTrace = "";
    let callStackTraceMsg = slicedCallStack
      .reverse()
      .map((entry) => {
        let {column, line, file} = entry;
        if (file === null) return "null";

        let pathSegments = file.split("\\");
        let lastSegment = pathSegments.last();
        let cleanFileName = filenamePrettier(lastSegment);
        let shortenFileName = cleanFileName.split("/").last();

        if (shortenFileName === lastSegmentTrace) {
          shortenFileName = "&";
        } else {
          lastSegmentTrace = shortenFileName;
        }
        return `${shortenFileName}(${line})`;
      })
      .join(".");

    global.TRACE_MAX_LENGTH = Math.max(
      global.TRACE_MAX_LENGTH,
      callStackTraceMsg.length
    );
    return callStackTraceMsg;
  };

  const logger = (level, ...arg) => {
    let currentDate = new Date();
    let levelColorCode = getColorCodeByLevel(level);

    let timeSegment = moment(currentDate).format("YY/MM/DD HH:mm:ss.SSS");
    let levelSegment = console.wrap(level.padEnd(6, " "), levelColorCode);
    let traceSegment = console.wrap(
      tracer().padEnd(global.TRACE_MAX_LENGTH, " "),
      console.YELLOW
    );

    let contentSegment = arg.map((argument) => shorten(argument)).join(" ");
    if (level === "ERROR")
      contentSegment = console.wrap(contentSegment, console.RED);

    const finalString = `${timeSegment} ${levelSegment} ${traceSegment} ${contentSegment}`;

    if (loggerModule) {
      let levelLowerCode = level === "SYSTEM" ? "info" : level.toLowerCase();
      if (loggerModule[levelLowerCode]) {
        loggerModule[levelLowerCode](`${traceSegment} ${contentSegment}`);
      }
    }

    // need within stdout
    console.log(finalString);

    const colorSanitizedString = finalString.replace(
      /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
      ""
    );

    try {
      switch (level) {
        case "DEBUG":
          ElectronLogger.debug(colorSanitizedString);
          break;
        case "INFO":
          ElectronLogger.info(colorSanitizedString);
          break;
        case "WARN":
          ElectronLogger.warn(colorSanitizedString);
          break;
        case "ERROR":
          ElectronLogger.error(colorSanitizedString);
          break;
        case "SYSTEM":
          ElectronLogger.info(colorSanitizedString);
          break;
        default:
          ElectronLogger.verbose(colorSanitizedString);
          break;
      }
    } catch (err) {
    }
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
