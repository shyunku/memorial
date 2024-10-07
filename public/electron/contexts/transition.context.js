const TrsTypes = require("../constants/TransitionType.constants");
const IpcService = require("../service/ipc.service");
const { jsonMarshal } = require("../util/TxUtil");

class TransitionContext {
  /**
   * @param userId {string}
   * @param serviceGroup {ServiceGroup}
   */
  constructor(userId, serviceGroup) {
    this.userId = userId;
    this.serviceGroup = serviceGroup;

    /** @type {DatabaseService} */
    this.databaseService = serviceGroup.databaseService;

    /** @type {IpcService} */
    this.ipcService = serviceGroup.ipcService;

    /** @type {ExecutorService} */
    this.executorService = serviceGroup.executorService;

    /** @type {DatabaseContext} */
    this.db = null;
  }

  async initialize() {
    this.db = await this.databaseService.getUserDatabaseContext(this.userId);
    if (this.db == null) throw new Error("Database is null");
  }

  /**
   * @param tx {Transaction}
   * @param blockHash {string}
   * @param transitions {Array<Object>}
   * @returns {Promise<void>}
   */
  async applyTransitions(tx, blockHash, transitions) {
    await this.db.useCheckConstraint(false);
    await this.db.useForeignKey(false);
    await this.db.begin();

    try {
      for (const transition of transitions) {
        const { operation: opcode, params } = transition;
        await this.applyTransition(opcode, params);
      }

      const decodedBuffer = jsonMarshal(tx.content);
      await this.db.run(
        `INSERT INTO transactions (version, type, timestamp, content, hash, block_number, block_hash) VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
          tx.version,
          tx.type,
          tx.timestamp,
          decodedBuffer,
          tx.hash,
          tx.blockNumber,
          blockHash,
        ]
      );

      await this.db.commit();
      this.ipcService.sender("state/transitions", null, true, transitions);
      // send to ipc
      this.ipcService.sender(
        "system/lastTxUpdateTime",
        null,
        true,
        tx.timestamp
      );
    } catch (err) {
      try {
        await this.db.rollback();
      } catch (err) {
        console.error(err);
      }
      throw err;
    } finally {
      await this.db.useCheckConstraint(true);
      await this.db.useForeignKey(true);
    }
  }

  async applyTransition(opcode, params) {
    console.debug(`Applying transition: ${opcode}`, params);
    switch (opcode) {
      case TrsTypes.OP_INITIALIZE:
        await this.initializeAll(params);
        break;
      case TrsTypes.OP_CREATE_TASK:
        await this.createTask(params);
        break;
      case TrsTypes.OP_DELETE_TASK:
        await this.deleteTask(params);
        break;
      case TrsTypes.OP_UPDATE_TASK_NEXT:
        await this.updateTaskNext(params);
        break;
      case TrsTypes.OP_UPDATE_TASK_TITLE:
        await this.updateTaskTitle(params);
        break;
      case TrsTypes.OP_UPDATE_TASK_DUE_DATE:
        await this.updateTaskDueDate(params);
        break;
      case TrsTypes.OP_UPDATE_TASK_MEMO:
        await this.updateTaskMemo(params);
        break;
      case TrsTypes.OP_UPDATE_TASK_DONE:
        await this.updateTaskDone(params);
        break;
      case TrsTypes.OP_UPDATE_TASK_DONE_AT:
        await this.updateTaskDoneAt(params);
        break;
      case TrsTypes.OP_UPDATE_TASK_REPEAT_PERIOD:
        await this.updateTaskRepeatPeriod(params);
        break;
      case TrsTypes.OP_UPDATE_TASK_REPEAT_START_AT:
        await this.updateTaskRepeatStartAt(params);
        break;
      case TrsTypes.OP_CREATE_TASK_CATEGORY:
        await this.createTaskCategory(params);
        break;
      case TrsTypes.OP_DELETE_TASK_CATEGORY:
        await this.deleteTaskCategory(params);
        break;
      case TrsTypes.OP_CREATE_SUBTASK:
        await this.createSubtask(params);
        break;
      case TrsTypes.OP_DELETE_SUBTASK:
        await this.deleteSubtask(params);
        break;
      case TrsTypes.OP_UPDATE_SUBTASK_TITLE:
        await this.updateSubtaskTitle(params);
        break;
      case TrsTypes.OP_UPDATE_SUBTASK_DUE_DATE:
        await this.updateSubtaskDueDate(params);
        break;
      case TrsTypes.OP_UPDATE_SUBTASK_DONE:
        await this.updateSubtaskDone(params);
        break;
      case TrsTypes.OP_UPDATE_SUBTASK_DONE_AT:
        await this.updateSubtaskDoneAt(params);
        break;
      case TrsTypes.OP_CREATE_CATEGORY:
        await this.createCategory(params);
        break;
      case TrsTypes.OP_DELETE_CATEGORY:
        await this.deleteCategory(params);
        break;
      case TrsTypes.OP_UPDATE_CATEGORY_COLOR:
        await this.updateCategoryColor(params);
        break;
      default:
        throw new Error(`Unknown transition opcode: ${opcode}`);
    }
  }

  async initializeAll(params) {
    await this.db.clear();
  }

  async createTask(params) {
    const {
      tid,
      title,
      createdAt,
      doneAt,
      memo,
      done,
      dueDate,
      repeatPeriod,
      repeatStartAt,
      categories,
    } = params;
    await this.db.run(
      "INSERT INTO tasks (tid, title, created_at, done_at, memo, done, due_date, repeat_period, repeat_start_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      tid,
      title,
      createdAt,
      doneAt,
      memo,
      done,
      dueDate,
      repeatPeriod,
      dueDate
    );

    if (categories) {
      for (let cid in categories) {
        await this.db.run(
          `INSERT INTO tasks_categories (tid, cid) VALUES (?, ?);`,
          tid,
          cid
        );
      }
    }
  }

  async deleteTask(params) {
    let { tid } = params;
    await this.db.run("DELETE FROM tasks_categories WHERE tid = ?", tid);
    await this.db.run("DELETE FROM tasks WHERE tid = ?", tid);
  }

  async updateTaskNext(params) {
    let { tid, next } = params;
    next = next === "" ? null : next;
    await this.db.run("UPDATE tasks SET next = ? WHERE tid = ?", next, tid);
  }

  async updateTaskTitle(params) {
    const { tid, title } = params;
    await this.db.run("UPDATE tasks SET title = ? WHERE tid = ?", title, tid);
  }

  async updateTaskDueDate(params) {
    const { tid, dueDate } = params;
    await this.db.run(
      "UPDATE tasks SET due_date = ? WHERE tid = ?",
      dueDate,
      tid
    );
  }

  async updateTaskMemo(params) {
    const { tid, memo } = params;
    await this.db.run("UPDATE tasks SET memo = ? WHERE tid = ?", memo, tid);
  }

  async updateTaskDone(params) {
    const { tid, done } = params;
    await this.db.run("UPDATE tasks SET done = ? WHERE tid = ?", done, tid);
  }

  async updateTaskDoneAt(params) {
    const { tid, doneAt } = params;
    await this.db.run(
      "UPDATE tasks SET done_at = ? WHERE tid = ?",
      doneAt,
      tid
    );
  }

  async updateTaskRepeatPeriod(params) {
    const { tid, repeatPeriod } = params;
    await this.db.run(
      "UPDATE tasks SET repeat_period = ? WHERE tid = ?",
      repeatPeriod,
      tid
    );
  }

  async updateTaskRepeatStartAt(params) {
    const { tid, repeatStartAt } = params;
    await this.db.run(
      "UPDATE tasks SET repeat_start_at = ? WHERE tid = ?",
      repeatStartAt,
      tid
    );
  }

  async createTaskCategory(params) {
    const { tid, cid } = params;
    await this.db.run(
      `INSERT INTO tasks_categories (tid, cid) VALUES (?, ?);`,
      tid,
      cid
    );
  }

  async deleteTaskCategory(params) {
    const { tid, cid } = params;
    await this.db.run(
      `DELETE FROM tasks_categories WHERE tid = ? AND cid = ?;`,
      tid,
      cid
    );
  }

  async createSubtask(params) {
    const { tid, sid, title, done, doneAt, dueDate, createdAt } = params;
    await this.db.run(
      `INSERT INTO subtasks (tid, sid, title, done, done_at, due_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);`,
      tid,
      sid,
      title,
      done,
      doneAt,
      dueDate,
      createdAt
    );
  }

  async deleteSubtask(params) {
    const { tid, sid } = params;
    await this.db.run(
      `DELETE FROM subtasks WHERE tid = ? AND sid = ?;`,
      tid,
      sid
    );
  }

  async updateSubtaskTitle(params) {
    const { tid, sid, title } = params;
    await this.db.run(
      `UPDATE subtasks SET title = ? WHERE tid = ? AND sid = ?;`,
      title,
      tid,
      sid
    );
  }

  async updateSubtaskDueDate(params) {
    const { tid, sid, dueDate } = params;
    await this.db.run(
      `UPDATE subtasks SET due_date = ? WHERE tid = ? AND sid = ?;`,
      dueDate,
      tid,
      sid
    );
  }

  async updateSubtaskDone(params) {
    const { tid, sid, done } = params;
    await this.db.run(
      `UPDATE subtasks SET done = ? WHERE tid = ? AND sid = ?;`,
      done,
      tid,
      sid
    );
  }

  async updateSubtaskDoneAt(params) {
    const { tid, sid, doneAt } = params;
    await this.db.run(
      `UPDATE subtasks SET done_at = ? WHERE tid = ? AND sid = ?;`,
      doneAt,
      tid,
      sid
    );
  }

  async createCategory(params) {
    const { cid, title, secret, locked, color, createdAt } = params;
    await this.db.run(
      `INSERT INTO categories (cid, title, secret, locked, color, created_at) VALUES (?, ?, ?, ?, ?, ?);`,
      cid,
      title,
      secret,
      locked,
      color,
      createdAt
    );
  }

  async deleteCategory(params) {
    const { cid } = params;
    await this.db.run(`DELETE FROM categories WHERE cid = ?;`, cid);
  }

  async updateCategoryColor(params) {
    const { cid, color } = params;
    await this.db.run(
      `UPDATE categories SET color = ? WHERE cid = ?;`,
      color,
      cid
    );
  }
}

module.exports = TransitionContext;
