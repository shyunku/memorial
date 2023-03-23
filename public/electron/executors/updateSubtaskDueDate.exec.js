const { v4 } = require("uuid");
const assert = require("assert");
const TxContent = require("../user_modules/TxContent");

class UpdateSubtaskDueDateTxContent extends TxContent {
  constructor(tid, sid, dueDate) {
    super();

    this.tid = tid;
    this.sid = sid;
    this.dueDate = dueDate;
  }
}

/**
 * @param {UpdateSubtaskDueDateTxContent} txReq
 */
const updateSubtaskDueDate = async (db, reqId, { sender }, txReq) => {
  // assert that txReq is instance of CreateTaskTxContent
  assert(new UpdateSubtaskDueDateTxContent().instanceOf(txReq), "Transaction request is not instance of class");

  await db.run("UPDATE subtasks SET due_date = ? WHERE sid = ?", txReq.dueDate, txReq.sid);
  sender("task/updateSubtaskDueDate", reqId, true, {
    sid: txReq.sid,
    tid: txReq.tid,
    dueDate: txReq.dueDate,
  });
};

module.exports = {
  updateSubtaskDueDate,
  UpdateSubtaskDueDateTxContent,
};
