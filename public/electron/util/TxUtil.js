const jsonMarshal = (v) => {
  if (v === null || v === undefined) {
    return Buffer.from([]);
  } else {
    const str = JSON.stringify(v);
    return Buffer.from(str, "utf8");
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

module.exports = {
  jsonMarshal,
  decodeParseBase64,
  sortFields,
};
