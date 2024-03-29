const { v4 } = require("uuid");
const assert = require("assert");
const TxContent = require("../objects/TxContent");

class UpdateSubtaskDueDateTxContent extends TxContent {
  constructor(tid, sid, dueDate) {
    super();

    this.tid = tid;
    this.sid = sid;
    this.dueDate = dueDate;
  }
}

/**
 * @param {string} reqId?
 * @param {ServiceGroup} serviceGroup
 * @param {UpdateSubtaskDueDateTxContent} txReq
 */
const updateSubtaskDueDate = async (reqId, serviceGroup, txReq) => {
  // assert that txReq is instance of CreateTaskTxContent
  assert(
    new UpdateSubtaskDueDateTxContent().instanceOf(txReq),
    "Transaction request is not instance of class"
  );

  const userId = serviceGroup.userService.getCurrent();
  const db = await serviceGroup.databaseService.getUserDatabaseContext(userId);

  await db.run(
    "UPDATE subtasks SET due_date = ? WHERE sid = ?",
    txReq.dueDate,
    txReq.sid
  );

  serviceGroup.ipcService.sender("task/updateSubtaskDueDate", reqId, true, {
    sid: txReq.sid,
    tid: txReq.tid,
    dueDate: txReq.dueDate,
  });
};

module.exports = {
  updateSubtaskDueDate,
  UpdateSubtaskDueDateTxContent,
};
