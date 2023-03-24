const PackageJson = require("../../../package.json");

const { createCategory } = require("../executors/createCategory.exec");
const { addTaskCategory } = require("../executors/addTaskCategory.exec");
const { createTask } = require("../executors/createTask.exec");
const { deleteCategory } = require("../executors/deleteCategory.exec");
const { deleteTask } = require("../executors/deleteTask.exec");
const { updateTaskDone } = require("../executors/updateTaskDone.exec");
const { updateTaskDueDate } = require("../executors/updateTaskDueDate.exec");
const { updateTaskMemo } = require("../executors/updateTaskMemo.exec");
const { updateTaskOrder } = require("../executors/updateTaskOrder.exec");
const { updateTaskTitle } = require("../executors/updateTaskTitle.exec");
const { deleteTaskCategory } = require("../executors/deleteTaskCategory.exec");
const { updateTaskRepeatPeriod } = require("../executors/updateTaskRepeatPeriod.exec");
const { createSubtask } = require("../executors/createSubtask.exec");
const { deleteSubtask } = require("../executors/deleteSubtask.exec");
const { updateSubtaskTitle } = require("../executors/updateSubtaskTitle.exec");
const { updateSubtaskDueDate } = require("../executors/updateSubtaskDueDate.exec");
const { updateSubtaskDone } = require("../executors/updateSubtaskDone.exec");
const { initializeState } = require("../executors/initializeState.exec");

const TX_TYPE = {
  INITIALIZE: 1,
  CREATE_TASK: 2,
  DELETE_TASK: 3,
  UPDATE_TASK_ORDER: 4,
  UPDATE_TASK_TITLE: 5,
  UPDATE_TASK_DUE_DATE: 6,
  UPDATE_TASK_MEMO: 7,
  UPDATE_TASK_DONE: 8,
  UPDATE_TASK_REPEAT_PERIOD: 9,
  ADD_TASK_CATEGORY: 10,
  DELETE_TASK_CATEGORY: 11,
  CREATE_SUBTASK: 12,
  DELETE_SUBTASK: 13,
  UPDATE_SUBTASK_TITLE: 14,
  UPDATE_SUBTASK_DUE_DATE: 15,
  UPDATE_SUBTASK_DONE: 16,
  CREATE_CATEGORY: 17,
  DELETE_CATEGORY: 18,
};

const makeTransaction = (type, data, targetBlockNumber) => {
  const timestamp = Date.now();
  const schemeVersion = PackageJson.config.scheme_version;

  return {
    type,
    version: schemeVersion,
    content: data,
    timestamp,
    targetBlockNumber: targetBlockNumber,
  };
};

const txExecutor = async (db, reqId, Ipc, tx, blockNumber) => {
  if (tx == null) throw new Error("Transaction is null");
  if (tx.type == null) throw new Error("Transaction type is null");

  const { setLastBlockNumberWithoutUserId, sender } = Ipc;
  const args = [db, reqId, Ipc];

  console.debug(tx);

  switch (tx.type) {
    case TX_TYPE.INITIALIZE:
      await initializeState(...args, tx.content, blockNumber);
      break;
    case TX_TYPE.CREATE_TASK:
      await createTask(...args, tx.content);
      break;
    case TX_TYPE.DELETE_TASK:
      await deleteTask(...args, tx.content);
      break;
    case TX_TYPE.UPDATE_TASK_ORDER:
      await updateTaskOrder(...args, tx.content);
      break;
    case TX_TYPE.UPDATE_TASK_TITLE:
      await updateTaskTitle(...args, tx.content);
      break;
    case TX_TYPE.UPDATE_TASK_DUE_DATE:
      await updateTaskDueDate(...args, tx.content);
      break;
    case TX_TYPE.UPDATE_TASK_MEMO:
      await updateTaskMemo(...args, tx.content);
      break;
    case TX_TYPE.CREATE_CATEGORY:
      await createCategory(...args, tx.content);
      break;
    case TX_TYPE.DELETE_CATEGORY:
      await deleteCategory(...args, tx.content);
      break;
    case TX_TYPE.ADD_TASK_CATEGORY:
      await addTaskCategory(...args, tx.content);
      break;
    case TX_TYPE.UPDATE_TASK_DONE:
      await updateTaskDone(...args, tx.content);
      break;
    case TX_TYPE.DELETE_TASK_CATEGORY:
      await deleteTaskCategory(...args, tx.content);
      break;
    case TX_TYPE.UPDATE_TASK_REPEAT_PERIOD:
      await updateTaskRepeatPeriod(...args, tx.content);
      break;
    case TX_TYPE.CREATE_SUBTASK:
      await createSubtask(...args, tx.content);
      break;
    case TX_TYPE.DELETE_SUBTASK:
      await deleteSubtask(...args, tx.content);
      break;
    case TX_TYPE.UPDATE_SUBTASK_TITLE:
      await updateSubtaskTitle(...args, tx.content);
      break;
    case TX_TYPE.UPDATE_SUBTASK_DUE_DATE:
      await updateSubtaskDueDate(...args, tx.content);
      break;
    case TX_TYPE.UPDATE_SUBTASK_DONE:
      await updateSubtaskDone(...args, tx.content);
      break;
    default:
      throw new Error("Transaction type is not supported");
  }

  // decode tx.content
  const rawContent = tx.content;
  const decodedBuffer = Buffer.from(JSON.stringify(rawContent));

  // insert block (as transaction) into local db
  await db.run(`INSERT INTO transactions (type, timestamp, content, block_number) VALUES (?, ?, ?, ?);`, [
    tx.type,
    tx.timestamp,
    decodedBuffer,
    blockNumber,
  ]);

  setLastBlockNumberWithoutUserId(blockNumber);

  // send to ipc
  sender("system/lastTxUpdateTime", null, true, tx.timestamp);
};

module.exports = { txExecutor, TX_TYPE, makeTransaction };
