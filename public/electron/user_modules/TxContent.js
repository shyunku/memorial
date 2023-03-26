class TxContent {
  constructor() {}

  instanceOf(object) {
    // check object
    if (object == null) throw new Error("Object is null");
    if (typeof object !== "object") throw new Error(`Data is not object (actual: ${typeof object}))`);

    // check properties
    // iterate properties
    for (let key in object) {
      if (!this.hasOwnProperty(key)) {
        console.debug(this);
        console.error(`Property ${key} is missing in tx content constructor`);
        return false;
      }
    }
    return true;
  }
}

module.exports = TxContent;
