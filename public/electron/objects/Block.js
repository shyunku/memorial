const sha256 = require("sha256");
const { jsonMarshal } = require("../util/TxUtil");

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
    return sha256(buffer);
  }

  static emptyBlock() {
    return new Block(0, "", "");
  }
}

module.exports = Block;
