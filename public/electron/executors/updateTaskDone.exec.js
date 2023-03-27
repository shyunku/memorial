const { v4 } = require("uuid");
const assert = require("assert");
const TxContent = require("../objects/TxContent");
const moment = require("moment");

class UpdateTaskDoneTxContent extends TxContent {
  constructor(tid, done, doneAt) {
    super();

    this.tid = tid;
    this.done = done;
    this.doneAt = doneAt;
  }
}

/**
 * @param {string} reqId?
 * @param {ServiceGroup} serviceGroup
 * @param {UpdateTaskDoneTxContent} txReq
 */
const updateTaskDone = async (reqId, serviceGroup, txReq) => {
  // assert that txReq is instance of CreateTaskTxContent
  assert(
    new UpdateTaskDoneTxContent().instanceOf(txReq),
    "Transaction request is not instance of class"
  );

  const userId = serviceGroup.userService.getCurrent();
  const db = await serviceGroup.databaseService.getUserDatabaseContext(userId);

  let task = await db.get(
    "SELECT * FROM tasks WHERE tid = ? LIMIT 1",
    txReq.tid
  );
  if (task != null && task.repeat_period != null) {
    let repeatStartAt = task.repeat_start_at ?? task.due_date;
    let repeatPeriod = task.repeat_period;

    // find next due date with period, just update due_date
    const unitMap = {
      day: "days",
      week: "weeks",
      month: "months",
      year: "years",
    };

    let nextDueDate = null;
    let repeatPeriodUnit = unitMap[repeatPeriod] ?? null;

    if (repeatPeriodUnit != null) {
      nextDueDate = moment(repeatStartAt);
      while (
        nextDueDate.isBefore(moment()) ||
        nextDueDate.isSameOrBefore(moment(task.due_date))
      ) {
        nextDueDate = moment(nextDueDate).add(1, repeatPeriodUnit);
      }
      nextDueDate = nextDueDate.valueOf();
    } else {
      throw new Error(`repeat period unit not found: (${repeatPeriodUnit})`);
    }

    if (nextDueDate != null) {
      await db.run(
        "UPDATE tasks SET done = ?, done_at = ?, due_date = ? WHERE tid = ?",
        false,
        txReq.doneAt,
        nextDueDate,
        txReq.tid
      );
      serviceGroup.ipcService.sender(
        "task/updateTaskDone",
        reqId,
        true,
        {
          tid: txReq.tid,
          done: txReq.done,
          doneAt: txReq.doneAt,
        },
        true,
        nextDueDate
      );
    } else {
      throw new Error("nextDueDate is null");
    }
  } else if (task != null) {
    await db.run(
      "UPDATE tasks SET done = ?, done_at = ? WHERE tid = ?",
      txReq.done,
      txReq.doneAt,
      txReq.tid
    );
    serviceGroup.ipcService.sender(
      "task/updateTaskDone",
      reqId,
      true,
      {
        tid: txReq.tid,
        done: txReq.done,
        doneAt: txReq.doneAt,
      },
      false
    );
  } else {
    throw new Error("task not found");
  }
};

module.exports = {
  updateTaskDone,
  UpdateTaskDoneTxContent,
};
