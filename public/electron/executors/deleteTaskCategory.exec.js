const { v4 } = require("uuid");
const assert = require("assert");
const TxContent = require("../user_modules/TxContent");

class DeleteTaskCategoryTxContent extends TxContent {
  constructor(tid, cid) {
    super();

    this.tid = tid;
    this.cid = cid;
  }
}

/**
 * @param {DeleteTaskCategoryTxContent} txReq
 */
const deleteTaskCategory = async (db, reqId, { sender }, txReq) => {
  // assert that txReq is instance of CreateTaskTxContent
  assert(new DeleteTaskCategoryTxContent().instanceOf(txReq), "Transaction request is not instance of class");

  let result = await db.run("DELETE FROM tasks_categories WHERE tid = ? AND cid = ?", txReq.tid, txReq.cid);
  sender("task/deleteTaskCategory", reqId, true, {
    tid: txReq.tid,
    cid: txReq.cid,
  });
};

module.exports = {
  deleteTaskCategory,
  DeleteTaskCategoryTxContent,
};
