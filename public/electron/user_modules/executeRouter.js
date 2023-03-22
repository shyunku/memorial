const { createTask } = require("../executors/createTask.exec");
const { TX_TYPE } = require("./transaction");

const txExecutor = async (db, reqId, Ipc, tx) => {
  if (tx == null) throw new Error("Transaction is null");
  if (tx.type == null) throw new Error("Transaction type is null");

  const args = [db, reqId, Ipc];

  console.debug(tx);

  switch (tx.type) {
    case TX_TYPE.CREATE_TASK:
      return await createTask(...args, decodedContent);
    default:
      throw new Error("Transaction type is not supported");
  }
};

module.exports = { txExecutor };
