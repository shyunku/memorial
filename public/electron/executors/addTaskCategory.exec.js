const { v4 } = require("uuid");
const assert = require("assert");
const TxContent = require("../user_modules/TxContent");

class AddTaskCategoryTxContent extends TxContent {
  constructor(tid, cid) {
    super();

    this.tid = tid;
    this.cid = cid;
  }
}

/**
 * @param {AddTaskCategoryTxContent} txReq
 */
const addTaskCategory = async (db, reqId, { sender }, txReq) => {
  // assert that txReq is instance of CreateTaskTxContent
  assert(new AddTaskCategoryTxContent().instanceOf(txReq), "Transaction request is not instance of class");

  await db.run("INSERT INTO tasks_categories (tid, cid) VALUES (?, ?)", txReq.tid, txReq.cid);
  sender("task/addTaskCategory", reqId, true, {
    tid: txReq.tid,
    cid: txReq.cid,
  });
};

module.exports = {
  addTaskCategory,
  AddTaskCategoryTxContent,
};
