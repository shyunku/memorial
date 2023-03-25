const { v4 } = require("uuid");
const assert = require("assert");
const TxContent = require("../user_modules/TxContent");

class UpdateTaskTitleTxContent extends TxContent {
  constructor(tid, title) {
    super();

    this.tid = tid;
    this.title = title;
  }
}

/**
 * @param {UpdateTaskTitleTxContent} txReq
 */
const updateTaskTitle = async (db, reqId, { sender }, txReq) => {
  // assert that txReq is instance of CreateTaskTxContent
  assert(new UpdateTaskTitleTxContent().instanceOf(txReq), "Transaction request is not instance of class");

  await db.run("UPDATE tasks SET title = ? WHERE tid = ?", txReq.title, txReq.tid);
  sender("task/updateTaskTitle", reqId, true, {
    tid: txReq.tid,
    title: txReq.title,
  });
};

module.exports = {
  updateTaskTitle,
  UpdateTaskTitleTxContent,
};
