const { v4 } = require("uuid");
const assert = require("assert");
const TxContent = require("../objects/TxContent");

class CreateSubtaskTxContent extends TxContent {
  constructor(tid, sid, title, createdAt, doneAt, dueDate, done) {
    super();

    this.tid = tid;
    this.sid = sid;
    this.title = title;
    this.createdAt = createdAt;
    this.doneAt = doneAt;
    this.dueDate = dueDate;
    this.done = done;
  }
}

const createSubtaskPre = async () => {
  return {
    sid: v4(),
  };
};

/**
 * @param {string} reqId?
 * @param {ServiceGroup} serviceGroup
 * @param {CreateSubtaskTxContent} txReq
 */
const createSubtask = async (reqId, serviceGroup, txReq) => {
  // assert that txReq is instance of CreateTaskTxContent
  assert(
    new CreateSubtaskTxContent().instanceOf(txReq),
    "Transaction request is not instance of class"
  );

  const userId = serviceGroup.userService.getCurrent();
  const db = await serviceGroup.databaseService.getUserDatabaseContext(userId);

  await db.run(
    "INSERT INTO subtasks (sid, title, created_at, done_at, due_date, done, tid) VALUES (?, ?, ?, ?, ?, ?, ?)",
    txReq.sid,
    txReq.title,
    txReq.createdAt,
    txReq.doneAt,
    txReq.dueDate,
    txReq.done,
    txReq.tid
  );

  serviceGroup.ipcService.sender("task/createSubtask", reqId, true, {
    sid: txReq.sid,
    title: txReq.title,
    createdAt: txReq.createdAt,
    doneAt: txReq.doneAt,
    dueDate: txReq.dueDate,
    done: txReq.done,
    tid: txReq.tid,
  });
};

module.exports = {
  createSubtask,
  createSubtaskPre,
  CreateSubtaskTxContent,
};
