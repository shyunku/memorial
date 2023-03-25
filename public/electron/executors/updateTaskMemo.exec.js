const { v4 } = require("uuid");
const assert = require("assert");
const TxContent = require("../user_modules/TxContent");

class UpdateTaskMemoTxContent extends TxContent {
  constructor(tid, memo) {
    super();

    this.tid = tid;
    this.memo = memo;
  }
}

/**
 * @param {UpdateTaskMemoTxContent} txReq
 */
const updateTaskMemo = async (db, reqId, { sender }, txReq) => {
  // assert that txReq is instance of CreateTaskTxContent
  assert(new UpdateTaskMemoTxContent().instanceOf(txReq), "Transaction request is not instance of class");

  await db.run("UPDATE tasks SET memo = ? WHERE tid = ?", txReq.memo, txReq.tid);
  sender("task/updateTaskMemo", reqId, true, {
    tid: txReq.tid,
    memo: txReq.memo,
  });
};

module.exports = {
  updateTaskMemo,
  UpdateTaskMemoTxContent,
};
