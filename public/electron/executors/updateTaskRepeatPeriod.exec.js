const { v4 } = require("uuid");
const assert = require("assert");
const TxContent = require("../user_modules/TxContent");

class UpdateTaskRepeatPeriodTxContent extends TxContent {
  constructor(tid, repeatPeriod) {
    super();

    this.tid = tid;
    this.repeatPeriod = repeatPeriod;
  }
}

/**
 * @param {UpdateTaskRepeatPeriodTxContent} txReq
 */
const updateTaskRepeatPeriod = async (db, reqId, { sender }, txReq) => {
  // assert that txReq is instance of CreateTaskTxContent
  assert(new UpdateTaskRepeatPeriodTxContent().instanceOf(txReq), "Transaction request is not instance of class");

  await db.begin();

  let result;
  try {
    if (txReq.repeatPeriod == null) {
      result = await db.run("UPDATE tasks SET repeat_period = NULL, repeat_start_at = NULL WHERE tid = ?", txReq.tid);
    } else {
      let repeatStartAt = await db.get("SELECT repeat_start_at FROM tasks WHERE tid = ?", txReq.tid);
      if (repeatStartAt == null) {
        repeatStartAt = await db.get("SELECT due_date FROM tasks WHERE tid = ?", txReq.tid);
        if (repeatStartAt != null) {
          await db.run("UPDATE tasks SET repeat_start_at = ? WHERE tid = ?", repeatStartAt, txReq.tid);
        } else {
          throw Error(`Trying to update repeat period of task that has no due date. (tid: ${txReq.tid})`);
        }
      }
      result = await db.run("UPDATE tasks SET repeat_period = ? WHERE tid = ?", txReq.repeatPeriod, txReq.tid);
    }

    await db.commit();
    sender("task/updateTaskRepeatPeriod", reqId, true, {
      tid: txReq.tid,
      repeatPeriod: txReq.repeatPeriod,
    });
  } catch (err) {
    await db.rollback();
    throw err;
  }
};

module.exports = {
  updateTaskRepeatPeriod,
  UpdateTaskRepeatPeriodTxContent,
};
