const { v4 } = require("uuid");
const assert = require("assert");
const TxContent = require("../user_modules/TxContent");

class DeleteSubtaskTxContent extends TxContent {
  constructor(tid, sid) {
    super();

    this.tid = tid;
    this.sid = sid;
  }
}

/**
 * @param {DeleteSubtaskTxContent} txReq
 */
const deleteSubtask = async (db, reqId, { sender }, txReq) => {
  // assert that txReq is instance of CreateTaskTxContent
  assert(new DeleteSubtaskTxContent().instanceOf(txReq), "Transaction request is not instance of class");

  let result = await db.run("DELETE FROM subtasks WHERE sid = ?", txReq.sid);
  sender("task/deleteSubtask", reqId, true, {
    sid: txReq.sid,
    tid: txReq.tid,
  });
};

module.exports = {
  deleteSubtask,
  DeleteSubtaskTxContent,
};
