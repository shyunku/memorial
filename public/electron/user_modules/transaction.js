const TRANSACTION_TYPE = {
  INITIALIZE: 0,
  CREATE_TASK: 1,
};

const makeTransaction = (type, data, curLastBlockNumber) => {
  const timestamp = Date.now();

  return {
    type,
    content: data,
    timestamp,
    targetBlockNumber: curLastBlockNumber + 1,
  };
};

const makeInitializeTx = (data, curLastBlockNumber) => {
  return makeTransaction(TRANSACTION_TYPE.INITIALIZE, data, curLastBlockNumber);
};

const createTaskTx = (data, curLastBlockNumber) => {
  return makeTransaction(
    TRANSACTION_TYPE.CREATE_TASK,
    data,
    curLastBlockNumber
  );
};

module.exports = {
  TRANSACTION_TYPE,
  makeTransaction,
  makeInitializeTx,
  createTaskTx,
};
