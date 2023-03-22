const { v4 } = require("uuid");
const assert = require("assert");
const TxContent = require("../user_modules/TxContent");

class CreateTaskTxContent extends TxContent {
  constructor(tid, title, createdAt, doneAt, memo, done, dueDate, repeatPeriod, repeatStartAt, categories, prevTaskId) {
    super();

    this.tid = tid;
    this.title = title;
    this.createdAt = createdAt;
    this.doneAt = doneAt;
    this.memo = memo;
    this.done = done;
    this.dueDate = dueDate;
    this.repeatPeriod = repeatPeriod;
    this.repeatStartAt = repeatStartAt;
    this.categories = categories;
    this.prevTaskId = prevTaskId;
  }
}

const createTaskPre = async (db) => {
  const newTid = v4();
  // find tid is null
  let lastTidList = await db.all("SELECT tid FROM tasks WHERE next IS NULL LIMIT 2;");
  if (lastTidList.length > 1) {
    console.log(lastTidList);
    throw new Error(`tasks that ID is null is more than 1. (${lastTidList.length})`);
  }
  let [lastTask] = lastTidList;

  return {
    prevTaskId: lastTask ? lastTask.tid : null,
    tid: newTid,
  };
};

/**
 * @param {CreateTaskTxContent} txReq
 */
const createTask = async (db, reqId, { sender }, txReq) => {
  // assert that txReq is instance of CreateTaskTxContent
  assert(new CreateTaskTxContent().instanceOf(txReq), "Transaction request is not instance of CreateTaskTxReq");

  // transaction
  await db.begin();

  try {
    await db.run(
      "INSERT INTO tasks (tid, title, created_at, done_at, memo, done, due_date, repeat_period, repeat_start_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      txReq.tid,
      txReq.title,
      txReq.createdAt,
      txReq.doneAt,
      txReq.memo,
      txReq.done,
      txReq.dueDate,
      txReq.repeatPeriod,
      txReq.dueDate
    );

    if (txReq.prevTaskId != null) {
      await db.run(`UPDATE tasks SET next = ? WHERE tid = ?;`, txReq.tid, txReq.prevTaskId);
    }

    // add category to task
    const categories = txReq.categories;
    if (categories) {
      for (let cid in categories) {
        await db.run(`INSERT INTO tasks_categories (tid, cid) VALUES (?, ?);`, txReq.tid, cid);
      }
    }

    await db.commit();
    sender("task/addTask", reqId, true, txReq);
  } catch (err) {
    console.error(err);
    await db.rollback();
    throw err;
  }
};

module.exports = {
  createTask,
  createTaskPre,
  CreateTaskTxContent,
};
