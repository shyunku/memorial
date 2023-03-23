const { v4 } = require("uuid");
const assert = require("assert");
const TxContent = require("../user_modules/TxContent");

class UpdateTaskOrderTxContent extends TxContent {
  constructor(tid, targetTaskId, afterTarget, prevTaskId, targetPrevTaskId) {
    super();

    this.tid = tid;
    this.targetTaskId = targetTaskId;
    this.afterTarget = afterTarget;
    this.prevTaskId = prevTaskId;
    this.targetPrevTaskId = targetPrevTaskId;
  }
}

const updateTaskOrderPre = async (db, taskId, targetTaskId) => {
  let prevTaskList = await db.all("SELECT * FROM tasks WHERE next = ?;", taskId);
  if (prevTaskList.length > 1) {
    throw new Error(`tasks that ID is null is more than 1. (${prevTaskList.length})`);
  }

  let [prevTask] = prevTaskList;

  let targetPrevTaskList = await db.all("SELECT * FROM tasks WHERE next = ?;", targetTaskId);
  if (targetPrevTaskList.length > 1) {
    throw new Error(`tasks that ID is null is more than 1. (${targetPrevTaskList.length})`);
  }

  let [targetPrevTask] = targetPrevTaskList;

  return {
    prevTaskId: prevTask ? prevTask.tid : null,
    targetPrevTaskId: targetPrevTask ? targetPrevTask.tid : null,
  };
};

/**
 * @param {UpdateTaskOrderTxContent} txReq
 */
const updateTaskOrder = async (db, reqId, { sender }, txReq) => {
  // assert that txReq is instance of CreateTaskTxContent
  assert(new UpdateTaskOrderTxContent().instanceOf(txReq), "Transaction request is not instance of class");

  // transaction
  // transaction
  await db.begin();

  try {
    // get next task
    let [curTask] = await db.all("SELECT * FROM tasks WHERE tid = ? LIMIT 1;", txReq.tid);
    let nextTaskId = curTask.next ?? null;

    // delete current task's next
    await db.run(`UPDATE tasks SET next = NULL WHERE tid = ?;`, txReq.tid);

    // update previous task's next
    if (txReq.prevTaskId != null) {
      // prev.next = current.next
      if (nextTaskId != null) {
        await db.run(`UPDATE tasks SET next = ? WHERE tid = ?;`, nextTaskId, txReq.prevTaskId);
      } else {
        await db.run(`UPDATE tasks SET next = NULL WHERE tid = ?;`, txReq.prevTaskId);
      }
    }

    // update target task's next
    if (txReq.afterTarget) {
      let [targetTask] = await db.all("SELECT * FROM tasks WHERE tid = ? LIMIT 1;", txReq.targetTaskId);
      let targetNextTaskId = targetTask.next ?? null;

      // target.next = current.id
      await db.run(`UPDATE tasks SET next = ? WHERE tid = ?;`, txReq.tid, txReq.targetTaskId);
      // current.next = target.next.id
      await db.run(`UPDATE tasks SET next = ? WHERE tid = ?;`, targetNextTaskId, txReq.tid);
    } else {
      if (txReq.targetPrevTaskId) {
        await db.run(`UPDATE tasks SET next = ? WHERE tid = ?;`, txReq.tid, txReq.targetPrevTaskId);
      }

      // current.next = target.id
      await db.run(`UPDATE tasks SET next = ? WHERE tid = ?;`, txReq.targetTaskId, txReq.tid);
    }

    await db.commit();
    sender("task/updateTaskOrder", reqId, true, {
      tid: txReq.tid,
      targetTaskId: txReq.targetTaskId,
      afterTarget: txReq.afterTarget,
    });
  } catch (err) {
    await db.rollback();
    throw err;
  }
};

module.exports = {
  updateTaskOrder,
  updateTaskOrderPre,
  UpdateTaskOrderTxContent,
};
