const { v4 } = require("uuid");
const assert = require("assert");
const TxContent = require("../objects/TxContent");

class DeleteSubtaskTxContent extends TxContent {
  constructor(tid, sid) {
    super();

    this.tid = tid;
    this.sid = sid;
  }
}

/**
 * @param {string} reqId?
 * @param {ServiceGroup} serviceGroup
 * @param {DeleteSubtaskTxContent} txReq
 */
const deleteSubtask = async (reqId, serviceGroup, txReq) => {
  // assert that txReq is instance of CreateTaskTxContent
  assert(
    new DeleteSubtaskTxContent().instanceOf(txReq),
    "Transaction request is not instance of class"
  );

  const userId = serviceGroup.userService.getCurrent();
  const db = await serviceGroup.databaseService.getUserDatabaseContext(userId);

  await db.run("DELETE FROM subtasks WHERE sid = ?", txReq.sid);

  serviceGroup.ipcService.sender("task/deleteSubtask", reqId, true, {
    sid: txReq.sid,
    tid: txReq.tid,
  });
};

module.exports = {
  deleteSubtask,
  DeleteSubtaskTxContent,
};
