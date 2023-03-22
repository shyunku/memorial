const TX_TYPE = {
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
  return makeTransaction(TX_TYPE.INITIALIZE, data, curLastBlockNumber);
};

module.exports = {
  TX_TYPE,
  makeTransaction,
  makeInitializeTx,
};
