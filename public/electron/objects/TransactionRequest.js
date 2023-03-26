const Transaction = require("./Transaction");

class TransactionRequest extends Transaction {
  constructor(version, type, timestamp, content, blockNumber, blockHash) {
    super(version, type, timestamp, content, blockNumber);
    this.blockHash = blockHash;
  }

  static fromTransaction(tx, blockHash) {
    if (tx == null) throw new Error("Transaction is null");
    if (!(tx instanceof Transaction))
      throw new Error("tx is not instance of Transaction");
    return new TransactionRequest(
      tx.version,
      tx.type,
      tx.timestamp,
      tx.content,
      tx.blockNumber,
      blockHash
    );
  }
}

module.exports = TransactionRequest;