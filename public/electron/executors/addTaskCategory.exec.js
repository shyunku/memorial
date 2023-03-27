const { v4 } = require("uuid");
const assert = require("assert");
const TxContent = require("../objects/TxContent");

class AddTaskCategoryTxContent extends TxContent {
  constructor(tid, cid) {
    super();

    this.tid = tid;
    this.cid = cid;
  }
}

/**
 * @param {string} reqId?
 * @param {ServiceGroup} serviceGroup
 * @param {AddTaskCategoryTxContent} txReq
 */
const addTaskCategory = async (reqId, serviceGroup, txReq) => {
  // assert that txReq is instance of CreateTaskTxContent
  assert(
    new AddTaskCategoryTxContent().instanceOf(txReq),
    "Transaction request is not instance of class"
  );

  const userId = serviceGroup.userService.getCurrent();
  const db = await serviceGroup.databaseService.getUserDatabaseContext(userId);

  await db.run(
    "INSERT INTO tasks_categories (tid, cid) VALUES (?, ?)",
    txReq.tid,
    txReq.cid
  );
  serviceGroup.ipcService.sender("task/addTaskCategory", reqId, true, {
    tid: txReq.tid,
    cid: txReq.cid,
  });
};

module.exports = {
  addTaskCategory,
  AddTaskCategoryTxContent,
};
