const { v4 } = require("uuid");
const assert = require("assert");
const TxContent = require("../user_modules/TxContent");

class UpdateTaskDueDateTxContent extends TxContent {
  constructor(tid, dueDate) {
    super();

    this.tid = tid;
    this.dueDate = dueDate;
  }
}

/**
 * @param {UpdateTaskDueDateTxContent} txReq
 */
const updateTaskDueDate = async (db, reqId, { sender }, txReq) => {
  // assert that txReq is instance of CreateTaskTxContent
  assert(new UpdateTaskDueDateTxContent().instanceOf(txReq), "Transaction request is not instance of class");

  if (txReq.dueDate == null) {
    await db.run("UPDATE tasks SET repeat_period = NULL, repeat_start_at = NULL WHERE tid = ?", txReq.tid);
  } else {
    await db.run("UPDATE tasks SET repeat_start_at = ? WHERE tid = ?", txReq.dueDate, txReq.tid);
  }
  await db.run("UPDATE tasks SET due_date = ? WHERE tid = ?", txReq.dueDate, txReq.tid);
  sender("task/updateTaskDueDate", reqId, true, {
    tid: txReq.tid,
    dueDate: txReq.dueDate,
  });
};

module.exports = {
  updateTaskDueDate,
  UpdateTaskDueDateTxContent,
};
