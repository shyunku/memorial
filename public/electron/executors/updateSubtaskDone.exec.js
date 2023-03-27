const { v4 } = require("uuid");
const assert = require("assert");
const TxContent = require("../objects/TxContent");

class UpdateSubtaskDoneTxContent extends TxContent {
  constructor(tid, sid, done, doneAt) {
    super();

    this.tid = tid;
    this.sid = sid;
    this.done = done;
    this.doneAt = doneAt;
  }
}

/**
 * @param {string} reqId?
 * @param {ServiceGroup} serviceGroup
 * @param {UpdateSubtaskDoneTxContent} txReq
 */
const updateSubtaskDone = async (reqId, serviceGroup, txReq) => {
  // assert that txReq is instance of CreateTaskTxContent
  assert(
    new UpdateSubtaskDoneTxContent().instanceOf(txReq),
    "Transaction request is not instance of class"
  );

  const userId = serviceGroup.userService.getCurrent();
  const db = await serviceGroup.databaseService.getUserDatabaseContext(userId);

  await db.run(
    "UPDATE subtasks SET done = ?, done_at = ? WHERE sid = ?",
    txReq.done,
    txReq.doneAt,
    txReq.sid
  );

  serviceGroup.ipcService.sender("task/updateSubtaskDone", reqId, true, {
    sid: txReq.sid,
    tid: txReq.tid,
    done: txReq.done,
    doneAt: txReq.doneAt,
  });
};

module.exports = {
  updateSubtaskDone,
  UpdateSubtaskDoneTxContent,
};
