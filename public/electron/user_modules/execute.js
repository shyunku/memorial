const createTask = async (db, reqId, sender, task) => {
  // find tid is null
  let lastTidList = await db.all(
    "SELECT tid FROM tasks WHERE next IS NULL LIMIT 2;"
  );
  if (lastTidList.length > 1) {
    console.log(lastTidList);
    throw new Error(
      `tasks that ID is null is more than 1. (${lastTidList.length})`
    );
  }

  let [lastTask] = lastTidList;

  // transaction
  await db.begin();

  try {
    let result = await db.run(
      "INSERT INTO tasks (title, created_at, done_at, memo, done, due_date, repeat_period, repeat_start_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      task.title,
      task.created_at,
      task.done_at,
      task.memo,
      task.done,
      task.due_date,
      task.repeat_period,
      task.due_date
    );

    if (lastTask != null) {
      await db.run(
        `UPDATE tasks SET next = ? WHERE tid = ?;`,
        result.lastID,
        lastTask.tid
      );
    }

    // add category to task
    const categories = task.categories;
    if (categories) {
      for (let cid in categories) {
        await db.run(
          `INSERT INTO tasks_categories (tid, cid) VALUES (?, ?);`,
          result.lastID,
          cid
        );
      }
    }

    await db.commit();
    sender("task/addTask", reqId, true, {
      tid: result.lastID,
      prevTaskId: lastTask ? lastTask.tid : null,
    });

    return {
      tid: result.lastID,
      prevTaskId: lastTask ? lastTask.tid : null,
    };
  } catch (err) {
    console.error(err);
    await db.rollback();
    throw err;
  }
};

module.exports = {
  createTask,
};
