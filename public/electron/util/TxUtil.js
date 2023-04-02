/**
 * Object to Buffer[]
 * @param v {Object?}
 * @returns {Buffer}
 */
const jsonMarshal = (v) => {
  if (v === null || v === undefined) {
    return Buffer.from([]);
  } else {
    const str = JSON.stringify(v);
    const buf = Buffer.from(str, "utf8");
    if (str !== buf.toString("utf8"))
      throw new Error("Buffer conversion failed");
    return buf;
  }
};

/**
 * Buffer[] to Object
 * @param v
 * @returns {any|null}
 */
const jsonUnmarshal = (v) => {
  if (v === null || v === undefined) {
    return null;
  } else {
    const buffer = Buffer.from(v, "utf8");
    const str = buffer.toString("utf8");
    return JSON.parse(str);
  }
};

const decodeParseBase64 = (byteString) => {
  if (typeof byteString !== "string")
    throw new Error("byteString is not string");
  if (byteString.length === 0) return null;
  const str = Buffer.from(byteString, "base64").toString("utf8");
  return JSON.parse(str);
};

const sortFields = (obj) => {
  if (obj == null || typeof obj !== "object") return obj;
  let keys = Object.keys(obj);
  keys.sort();
  let newObj = {};
  for (let key of keys) {
    newObj[key] = sortFields(obj[key]);
  }
  return newObj;
};

const isFieldsSorted = (obj) => {
  if (obj == null || typeof obj !== "object") return true;
  let keys = Object.keys(obj);
  let prevKey = "";
  for (let key of keys) {
    if (prevKey > key) {
      console.warn(`prevKey: ${prevKey}, key: ${key}`);
      return false;
    }
    if (!isFieldsSorted(obj[key])) return false;
    prevKey = key;
  }
  return true;
};

module.exports = {
  jsonMarshal,
  jsonUnmarshal,
  decodeParseBase64,
  sortFields,
  isFieldsSorted,
};
