const { v4 } = require("uuid");
const assert = require("assert");
const TxContent = require("../user_modules/TxContent");

class InitializeStateTxContent extends TxContent {
  constructor(tasks, categories) {
    super();

    this.tasks = tasks;
    this.categories = categories;
  }
}

/**
 * @param {InitializeStateTxContent} txReq
 */
const initializeState = async (db, reqId, { sender }, txReq, blockNumber) => {
  // assert that txReq is instance of CreateTaskTxContent
  assert(
    new InitializeStateTxContent().instanceOf(txReq),
    "Transaction request is not instance of class"
  );

  if (blockNumber !== 1) {
    throw new Error("InitializeState can be executed only at block 1");
  }

  const tasks = txReq.tasks;
  const categories = txReq.categories;

  await db.begin();

  try {
    // delete all (neccessary?)
    await db.run("DELETE FROM tasks");
    await db.run("DELETE FROM categories");
    await db.run("DELETE FROM tasks_categories");
    await db.run("DELETE FROM subtasks");

    // insert tasks
    let bidirectionalTasks = {};
    for (const tid in tasks) {
      const task = tasks[tid];
      bidirectionalTasks[task.tid] = { ...task };
    }

    // remap to bidirection
    for (const tid in bidirectionalTasks) {
      const task = bidirectionalTasks[tid];
      if (task.next) {
        let nextTask = bidirectionalTasks[task.next];
        if (nextTask) {
          nextTask.prev = task.tid;
        }
      }
    }

    // sort tasks
    let reverseSortedTasks = [];
    let lastTask = Object.values(bidirectionalTasks).find(
      (task) => task.next == ""
    );
    let iter = lastTask;
    while (iter != null) {
      reverseSortedTasks.push(iter);
      iter = bidirectionalTasks[iter.prev];
    }

    if (reverseSortedTasks.length !== Object.keys(tasks).length) {
      console.debug(tasks, reverseSortedTasks);
      throw new Error("Tasks are not sorted correctly");
    }

    // insert tasks
    for (const task of reverseSortedTasks) {
      await db.run(
        "INSERT INTO tasks (tid, title, created_at, done_at, memo, done, due_date, next, repeat_period, repeat_start_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        task.tid,
        task.title,
        task.createdAt,
        task.doneAt,
        task.memo,
        task.done,
        task.dueDate,
        task.next == "" ? null : task.next,
        task.repeatPeriod == "" ? null : task.repeatPeriod,
        task.repeatStartAt == 0 ? null : task.repeatStartAt
      );
    }

    // insert categories
    for (const cid in categories) {
      const category = categories[cid];
      await db.run(
        "INSERT INTO categories (cid, title, secret, locked, color) VALUES (?, ?, ?, ?, ?)",
        category.cid,
        category.title,
        category.secret,
        category.locked,
        category.color
      );
    }

    let subtaskMap = {};

    // insert task_category
    for (const tid in tasks) {
      const task = tasks[tid];
      for (const cid in task.categories) {
        await db.run(
          "INSERT INTO tasks_categories (tid, cid) VALUES (?, ?)",
          task.tid,
          cid
        );
      }
      for (const sid in task.subtasks) {
        const subtask = task.subtasks[sid];
        subtask.tid = task.tid;
        if (subtaskMap[sid] == null) {
          subtaskMap[sid] = subtask;
        }
      }
    }

    // insert subtasks
    for (const sid in subtaskMap) {
      const subtask = subtaskMap[sid];
      await db.run(
        "INSERT INTO subtasks (sid, title, created_at, done_at, due_date, done, tid) VALUES (?, ?, ?, ?, ?, ?, ?)",
        sid,
        subtask.title,
        subtask.createdAt,
        subtask.doneAt,
        subtask.dueDate,
        subtask.done,
        subtask.tid
      );
    }

    await db.commit();
    sender("system/initializeState", reqId, true);
  } catch (err) {
    await db.rollback();
    throw err;
  }
};

module.exports = {
  initializeState,
  InitializeStateTxContent,
};
