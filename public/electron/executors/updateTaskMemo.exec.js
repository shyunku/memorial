const { v4 } = require("uuid");
const assert = require("assert");
const TxContent = require("../objects/TxContent");

class UpdateTaskMemoTxContent extends TxContent {
  constructor(tid, memo) {
    super();

    this.tid = tid;
    this.memo = memo;
  }
}

/**
 * @param {string} reqId?
 * @param {ServiceGroup} serviceGroup
 * @param {UpdateTaskMemoTxContent} txReq
 */
const updateTaskMemo = async (reqId, serviceGroup, txReq) => {
  // assert that txReq is instance of CreateTaskTxContent
  assert(
    new UpdateTaskMemoTxContent().instanceOf(txReq),
    "Transaction request is not instance of class"
  );

  const userId = serviceGroup.userService.getCurrent();
  const db = await serviceGroup.databaseService.getUserDatabaseContext(userId);

  await db.run(
    "UPDATE tasks SET memo = ? WHERE tid = ?",
    txReq.memo,
    txReq.tid
  );

  serviceGroup.ipcService.sender("task/updateTaskMemo", reqId, true, {
    tid: txReq.tid,
    memo: txReq.memo,
  });
};

module.exports = {
  updateTaskMemo,
  UpdateTaskMemoTxContent,
};
