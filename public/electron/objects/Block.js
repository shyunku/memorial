const sha256 = require("sha256");

class Block {
  constructor(number, txHash, prevBlockHash) {
    this.number = number;
    this.txHash = txHash;
    this.prevBlockHash = prevBlockHash;
    this.hash = this.getHash();
  }

  getHash() {
    const raw = {
      number: this.number,
      txHash: this.txHash,
      prevBlockHash: this.prevBlockHash,
    };
    const buffer = jsonMarshal(raw);
    const hash = sha256(buffer);
    return hash;
  }

  static emptyBlock() {
    return new Block(0, "", "");
  }
}

module.exports = Block;