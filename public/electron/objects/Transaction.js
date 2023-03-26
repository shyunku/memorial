const sha256 = require("sha256");

class Transaction {
  constructor(version, type, timestamp, content, blockNumber) {
    // decode content if needed
    if (typeof content === "string") {
      content = decodeParseBase64(content);
    }

    this.version = version;
    this.type = type;
    this.timestamp = timestamp;
    this.content = content;
    this.blockNumber = blockNumber;
    this.hash = this.getHash();
  }

  getHash() {
    const raw = {
      version: this.version,
      type: this.type,
      timestamp: this.timestamp,
      content: this.content,
    };
    const buffer = jsonMarshal(raw);
    const hash = sha256(buffer);
    return hash;
  }
}

module.exports = Transaction;