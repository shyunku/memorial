const TRANSACTION_TYPE = {
  INITIALIZE: 0,
  CREATE_TASK: 1,
};

const makeTransaction = (type, data, targetBlockNumber) => {
  // convert data to byte[] (content)
  const strData = JSON.stringify(data);
  const content = new Uint8Array(Buffer.from(strData, "utf8"));
  const timestamp = Date.now();

  return {
    type,
    content,
    timestamp,
    targetBlockNumber,
  };
};

const makeInitializeTx = (data, targetBlockNumber) => {
  return makeTransaction(TRANSACTION_TYPE.INITIALIZE, data, targetBlockNumber);
};

const createTaskTx = (data, targetBlockNumber) => {
  return makeTransaction(TRANSACTION_TYPE.CREATE_TASK, {}, targetBlockNumber);
};

module.exports = {
  TRANSACTION_TYPE,
  makeTransaction,
  makeInitializeTx,
  createTaskTx,
};
