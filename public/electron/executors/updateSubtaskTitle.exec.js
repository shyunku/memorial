const { v4 } = require("uuid");
const assert = require("assert");
const TxContent = require("../objects/TxContent");

class UpdateSubtaskTitleTxContent extends TxContent {
  constructor(tid, sid, title) {
    super();

    this.tid = tid;
    this.sid = sid;
    this.title = title;
  }
}

/**
 * @param {string} reqId?
 * @param {ServiceGroup} serviceGroup
 * @param {UpdateSubtaskTitleTxContent} txReq
 */
const updateSubtaskTitle = async (reqId, serviceGroup, txReq) => {
  // assert that txReq is instance of CreateTaskTxContent
  assert(
    new UpdateSubtaskTitleTxContent().instanceOf(txReq),
    "Transaction request is not instance of class"
  );

  const userId = serviceGroup.userService.getCurrent();
  const db = await serviceGroup.databaseService.getUserDatabaseContext(userId);

  await db.run(
    "UPDATE subtasks SET title = ? WHERE sid = ?",
    txReq.title,
    txReq.sid
  );

  serviceGroup.ipcService.sender("task/updateSubtaskTitle", reqId, true, {
    sid: txReq.sid,
    tid: txReq.tid,
    title: txReq.title,
  });
};

module.exports = {
  updateSubtaskTitle,
  UpdateSubtaskTitleTxContent,
};
