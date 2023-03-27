const { v4 } = require("uuid");
const assert = require("assert");
const TxContent = require("../objects/TxContent");

class DeleteTaskCategoryTxContent extends TxContent {
  constructor(tid, cid) {
    super();

    this.tid = tid;
    this.cid = cid;
  }
}

/**
 * @param {string} reqId?
 * @param {ServiceGroup} serviceGroup
 * @param {DeleteTaskCategoryTxContent} txReq
 */
const deleteTaskCategory = async (reqId, serviceGroup, txReq) => {
  // assert that txReq is instance of CreateTaskTxContent
  assert(
    new DeleteTaskCategoryTxContent().instanceOf(txReq),
    "Transaction request is not instance of class"
  );

  const userId = serviceGroup.userService.getCurrent();
  const db = await serviceGroup.databaseService.getUserDatabaseContext(userId);

  await db.run(
    "DELETE FROM tasks_categories WHERE tid = ? AND cid = ?",
    txReq.tid,
    txReq.cid
  );

  serviceGroup.ipcService.sender("task/deleteTaskCategory", reqId, true, {
    tid: txReq.tid,
    cid: txReq.cid,
  });
};

module.exports = {
  deleteTaskCategory,
  DeleteTaskCategoryTxContent,
};
