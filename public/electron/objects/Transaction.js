const sha256 = require("sha256");
const {
  decodeParseBase64,
  jsonMarshal,
  sortFields,
} = require("../util/TxUtil");

class Transaction {
  constructor(version, type, timestamp, content, blockNumber) {
    // decode content if needed
    if (typeof content === "string") {
      console.error("decode");
      content = decodeParseBase64(content);
    }

    this.version = version;
    this.type = type;
    this.timestamp = timestamp;
    this.content = sortFields(content);
    this.blockNumber = blockNumber;
    this.hash = this.getHash();
  }

  /**
   * @returns {string}
   */
  getHash() {
    const raw = {
      version: this.version,
      type: this.type,
      timestamp: this.timestamp,
      content: this.content,
    };
    const buffer = jsonMarshal(raw);
    return sha256(buffer);
  }
}

module.exports = Transaction;
