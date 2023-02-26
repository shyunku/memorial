import BigNumber from "bignumber.js";

export function fastInterval(callback, interval) {
  callback();
  let id = setInterval(callback, interval);
  return id;
}

export const colorize = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  magenta: (text) => `\x1b[35m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  white: (text) => `\x1b[37m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`,
};

export const printf = (varName, variable, ...args) => {
  console.log(`${colorize.green(varName)}`, variable, ...args);
};

export const errorf = (varName, variable, ...args) => {
  console.error(`${colorize.red(varName)}`, variable, ...args);
};

// absolute time to relative time text
export function toRelativeTime(milli, progress = false) {
  if (milli == null) return "-";

  const now = Date.now();
  let diff = now - milli;

  let rel = diff < 0 ? "left" : "ago";
  if (diff < 0) {
    diff = -diff;
  }

  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hour = Math.floor(min / 60);
  const day = Math.floor(hour / 24);
  const week = Math.floor(day / 7);
  const month = Math.floor(day / 30);
  const year = Math.floor(day / 365);

  if (year > 10) return `> 10 years ${rel}`;
  if (year > 0) return `${year} years ${rel}`;
  if (month > 0) return `${month} months ${rel}`;
  if (week > 0) return `${week} weeks ${rel}`;
  if (day > 0) return `${day} days ${rel}`;
  if (hour > 0) return `${hour} hours ${rel}`;
  if (min > 0) return `${min} minutes ${rel}`;
  if (sec > 0) return `${sec} seconds ${rel}`;
  if (diff > 0) return `0 second ${rel}`;
  return progress ? "Done" : "Just now";
}

const YEAR = 365 * 24 * 60 * 60 * 1000;
const MONTH = 30 * 24 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const SECOND = 1000;

// relative time to relative time text
const defaultOptions = {
  showLayerCount: 4,
  showMillisec: false,
};
export function fromRelativeTime(milli, rawOptions = defaultOptions) {
  if (milli == null) return "-";
  let inversed = milli < 0;
  if (inversed) milli = -milli;

  const options = { ...defaultOptions, ...rawOptions };

  const year = Math.floor(milli / YEAR);
  milli %= YEAR;
  const month = Math.floor(milli / MONTH);
  milli %= MONTH;
  const day = Math.floor(milli / DAY);
  milli %= DAY;
  const hour = Math.floor(milli / HOUR);
  milli %= HOUR;
  const min = Math.floor(milli / MINUTE);
  milli %= MINUTE;
  const sec = Math.floor(milli / SECOND);
  milli %= SECOND;
  const msec = milli;

  const segments = [
    { value: year, unit: "년" },
    { value: month, unit: "개월" },
    { value: day, unit: "일" },
    { value: hour, unit: "시간" },
    { value: min, unit: "분" },
    { value: sec, unit: "초" },
    { value: msec, unit: "밀리초" },
  ];

  const showLayerCount = options?.showLayerCount ?? 0;

  const texts = [];
  let flag = false;
  for (let i = 0, j = 0; i < segments.length; i++) {
    const { value, unit } = segments[i];
    if (options?.showMillisec === false && unit === "밀리초") continue;
    if (value > 0 || flag) {
      let valText = unit === "밀리초" ? value.toString().padStart(3, "0") : value;
      texts.push(`${valText}${unit}`);
      j++;
      flag = true;
    }
    if (showLayerCount && j >= showLayerCount) break;
  }

  return (inversed ? "-" : "") + texts.join(" ");
}

function formatSize(value) {
  if (value >= 100) return new BigNumber(value).toFormat(0);
  if (value >= 10) return new BigNumber(value).toFormat(1);
  return new BigNumber(value).toFormat(2);
}

export function shortenSize(size) {
  if (Number.isNaN(size) || size == null) return "-";
  if (size < 1000) return formatSize(size) + "B";
  size /= 1000;
  if (size < 1000) return formatSize(size) + "KB";
  size /= 1000;
  if (size < 1000) return formatSize(size) + "MB";
  size /= 1000;
  if (size < 1000) return formatSize(size) + "GB";
  size /= 1000;
  return formatSize(size) + "TB";
}

export default {};
