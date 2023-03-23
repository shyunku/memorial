const { v4 } = require("uuid");
const assert = require("assert");
const TxContent = require("../user_modules/TxContent");

class UpdateSubtaskTitleTxContent extends TxContent {
  constructor(tid, sid, title) {
    super();

    this.tid = tid;
    this.sid = sid;
    this.title = title;
  }
}

/**
 * @param {UpdateSubtaskTitleTxContent} txReq
 */
const updateSubtaskTitle = async (db, reqId, { sender }, txReq) => {
  // assert that txReq is instance of CreateTaskTxContent
  assert(new UpdateSubtaskTitleTxContent().instanceOf(txReq), "Transaction request is not instance of class");

  await db.run("UPDATE subtasks SET title = ? WHERE sid = ?", txReq.title, txReq.sid);
  sender("task/updateSubtaskTitle", reqId, true, {
    sid: txReq.sid,
    tid: txReq.tid,
    title: txReq.title,
  });
};

module.exports = {
  updateSubtaskTitle,
  UpdateSubtaskTitleTxContent,
};
