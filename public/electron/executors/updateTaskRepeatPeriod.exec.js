const { v4 } = require("uuid");
const assert = require("assert");
const TxContent = require("../objects/TxContent");

class UpdateTaskRepeatPeriodTxContent extends TxContent {
  constructor(tid, repeatPeriod) {
    super();

    this.tid = tid;
    this.repeatPeriod = repeatPeriod;
  }
}

/**
 * @param {string} reqId?
 * @param {ServiceGroup} serviceGroup
 * @param {UpdateTaskRepeatPeriodTxContent} txReq
 */
const updateTaskRepeatPeriod = async (reqId, serviceGroup, txReq) => {
  // assert that txReq is instance of CreateTaskTxContent
  assert(
    new UpdateTaskRepeatPeriodTxContent().instanceOf(txReq),
    "Transaction request is not instance of class"
  );

  const userId = serviceGroup.userService.getCurrent();
  const db = await serviceGroup.databaseService.getUserDatabaseContext(userId);

  if (txReq.repeatPeriod == null) {
    await db.run(
      "UPDATE tasks SET repeat_period = NULL, repeat_start_at = NULL WHERE tid = ?",
      txReq.tid
    );
  } else {
    let repeatStartAt = await db.get(
      "SELECT repeat_start_at FROM tasks WHERE tid = ?",
      txReq.tid
    );
    if (repeatStartAt == null) {
      repeatStartAt = await db.get(
        "SELECT due_date FROM tasks WHERE tid = ?",
        txReq.tid
      );
      if (repeatStartAt != null) {
        await db.run(
          "UPDATE tasks SET repeat_start_at = ? WHERE tid = ?",
          repeatStartAt,
          txReq.tid
        );
      } else {
        throw Error(
          `Trying to update repeat period of task that has no due date. (tid: ${txReq.tid})`
        );
      }
    }
    await db.run(
      "UPDATE tasks SET repeat_period = ? WHERE tid = ?",
      txReq.repeatPeriod,
      txReq.tid
    );
  }

  serviceGroup.ipcService.sender("task/updateTaskRepeatPeriod", reqId, true, {
    tid: txReq.tid,
    repeatPeriod: txReq.repeatPeriod,
  });
};

module.exports = {
  updateTaskRepeatPeriod,
  UpdateTaskRepeatPeriodTxContent,
};
