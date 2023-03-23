const { createTask } = require("../executors/createTask.exec");

const TX_TYPE = {
  INITIALIZE: 1,
  CREATE_TASK: 2,
  DELETE_TASK: 3,
};

const makeTransaction = (type, data, targetBlockNumber) => {
  const timestamp = Date.now();

  return {
    type,
    content: data,
    timestamp,
    targetBlockNumber: targetBlockNumber,
  };
};

const txExecutor = async (db, reqId, Ipc, tx, blockNumber) => {
  if (tx == null) throw new Error("Transaction is null");
  if (tx.type == null) throw new Error("Transaction type is null");

  const { setLastBlockNumberWithoutUserId } = Ipc;
  const args = [db, reqId, Ipc];

  // decode tx.content
  const rawContent = tx.content;
  const decodedBuffer = Buffer.from(JSON.stringify(rawContent));

  // insert block (as transaction) into local db
  await db.run(`INSERT INTO transactions (type, timestamp, content, block_number) VALUES (?, ?, ?, ?);`, [
    tx.type,
    tx.timestamp,
    decodedBuffer,
    blockNumber,
  ]);

  setLastBlockNumberWithoutUserId(blockNumber);

  console.debug(tx);

  switch (tx.type) {
    case TX_TYPE.CREATE_TASK:
      return await createTask(...args, tx.content);
    case TX_TYPE.DELETE_TASK:
      return await deleteTask(...args, tx.content);
    default:
      throw new Error("Transaction type is not supported");
  }
};

module.exports = { txExecutor, TX_TYPE, makeTransaction };
