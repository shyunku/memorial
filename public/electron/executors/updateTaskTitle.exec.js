const { v4 } = require("uuid");
const assert = require("assert");
const TxContent = require("../objects/TxContent");

class UpdateTaskTitleTxContent extends TxContent {
  constructor(tid, title) {
    super();

    this.tid = tid;
    this.title = title;
  }
}

/**
 * @param {string} reqId?
 * @param {ServiceGroup} serviceGroup
 * @param {UpdateTaskTitleTxContent} txReq
 */
const updateTaskTitle = async (reqId, serviceGroup, txReq) => {
  // assert that txReq is instance of CreateTaskTxContent
  assert(
    new UpdateTaskTitleTxContent().instanceOf(txReq),
    "Transaction request is not instance of class"
  );

  const userId = serviceGroup.userService.getCurrent();
  const db = await serviceGroup.databaseService.getUserDatabaseContext(userId);

  await db.run(
    "UPDATE tasks SET title = ? WHERE tid = ?",
    txReq.title,
    txReq.tid
  );

  serviceGroup.ipcService.sender("task/updateTaskTitle", reqId, true, {
    tid: txReq.tid,
    title: txReq.title,
  });
};

module.exports = {
  updateTaskTitle,
  UpdateTaskTitleTxContent,
};
