const { createTask } = require("../executors/createTask.exec");
const { deleteTask } = require("../executors/deleteTask.exec");
const { updateTaskOrder } = require("../executors/updateTaskOrder.exec");

const TX_TYPE = {
  INITIALIZE: 1,
  CREATE_TASK: 2,
  DELETE_TASK: 3,
  UPDATE_TASK_ORDER: 4,
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

  console.debug(tx);

  switch (tx.type) {
    case TX_TYPE.CREATE_TASK:
      await createTask(...args, tx.content);
      break;
    case TX_TYPE.DELETE_TASK:
      await deleteTask(...args, tx.content);
      break;
    case TX_TYPE.UPDATE_TASK_ORDER:
      await updateTaskOrder(...args, tx.content);
      break;
    default:
      throw new Error("Transaction type is not supported");
  }

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
};

module.exports = { txExecutor, TX_TYPE, makeTransaction };
