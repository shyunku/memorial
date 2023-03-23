const { v4 } = require("uuid");
const assert = require("assert");
const TxContent = require("../user_modules/TxContent");

class DeleteTaskTxContent extends TxContent {
  constructor(tid, prevTaskId) {
    super();

    this.tid = tid;
    this.prevTaskId = prevTaskId;
  }
}

const deleteTaskPre = async (db, taskId) => {
  let prevTaskList = await db.all("SELECT * FROM tasks WHERE next = ?;", taskId);
  if (prevTaskList.length > 1) {
    throw new Error(`tasks that ID is null is more than 1. (${prevTaskList.length})`);
  }

  let [prevTask] = prevTaskList;

  return {
    prevTaskId: prevTask ? prevTask.tid : null,
  };
};

/**
 * @param {DeleteTaskTxContent} txReq
 */
const deleteTask = async (db, reqId, { sender }, txReq) => {
  // assert that txReq is instance of CreateTaskTxContent
  assert(new DeleteTaskTxContent().instanceOf(txReq), "Transaction request is not instance of CreateTaskTxReq");

  // transaction
  await db.begin();

  try {
    // delete subtasks first
    await db.run("DELETE FROM subtasks WHERE tid = ?", txReq.tid);

    // get next task
    let [curTask] = await db.all("SELECT * FROM tasks WHERE tid = ? LIMIT 1;", txReq.tid);
    let nextTaskId = curTask.next ?? null;

    await db.run("UPDATE tasks SET next = NULL WHERE next = ?;", txReq.tid);
    await db.run("DELETE FROM tasks_categories WHERE tid = ?", txReq.tid);
    await db.run("DELETE FROM tasks WHERE tid = ?", txReq.tid);

    // update previous task's next
    if (txReq.prevTaskId != null) {
      await db.run(`UPDATE tasks SET next = ? WHERE tid = ?;`, nextTaskId, txReq.prevTaskId);
    }
    await db.commit();
    sender("task/deleteTask", reqId, true, {
      tid: txReq.tid,
    });
  } catch (err) {
    await db.rollback();
    throw err;
  }
};

module.exports = {
  deleteTask,
  deleteTaskPre,
  DeleteTaskTxContent,
};
