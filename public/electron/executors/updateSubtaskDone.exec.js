const { v4 } = require("uuid");
const assert = require("assert");
const TxContent = require("../user_modules/TxContent");

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
 * @param {UpdateSubtaskDoneTxContent} txReq
 */
const updateSubtaskDone = async (db, reqId, { sender }, txReq) => {
  // assert that txReq is instance of CreateTaskTxContent
  assert(new UpdateSubtaskDoneTxContent().instanceOf(txReq), "Transaction request is not instance of class");

  await db.run("UPDATE subtasks SET done = ?, done_at = ? WHERE sid = ?", txReq.done, txReq.doneAt, txReq.sid);
  sender("task/updateSubtaskDone", reqId, true, {
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
