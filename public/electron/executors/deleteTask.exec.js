const { v4 } = require("uuid");
const assert = require("assert");
const TxContent = require("../objects/TxContent");

class DeleteTaskTxContent extends TxContent {
  constructor(tid) {
    super();

    this.tid = tid;
  }
}

/**
 * @param {string} reqId?
 * @param {ServiceGroup} serviceGroup
 * @param {DeleteTaskTxContent} txReq
 */
const deleteTask = async (reqId, serviceGroup, txReq) => {
  // assert that txReq is instance of CreateTaskTxContent
  assert(
    new DeleteTaskTxContent().instanceOf(txReq),
    "Transaction request is not instance of class"
  );

  const userId = serviceGroup.userService.getCurrent();
  const db = await serviceGroup.databaseService.getUserDatabaseContext(userId);

  // delete subtasks first
  await db.run("DELETE FROM subtasks WHERE tid = ?", txReq.tid);

  // get next task
  let [curTask] = await db.all(
    "SELECT * FROM tasks WHERE tid = ? LIMIT 1;",
    txReq.tid
  );
  let nextTaskId = curTask.next ?? null;

  await db.run("UPDATE tasks SET next = NULL WHERE next = ?;", txReq.tid);
  await db.run("DELETE FROM tasks_categories WHERE tid = ?", txReq.tid);
  await db.run("DELETE FROM tasks WHERE tid = ?", txReq.tid);

  // update previous task's next
  if (txReq.prevTaskId != null) {
    await db.run(
      `UPDATE tasks SET next = ? WHERE tid = ?;`,
      nextTaskId,
      txReq.prevTaskId
    );
  }

  serviceGroup.ipcService.sender("task/deleteTask", reqId, true, {
    tid: txReq.tid,
  });
};

module.exports = {
  deleteTask,
  DeleteTaskTxContent,
};
