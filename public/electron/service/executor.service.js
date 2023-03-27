const PackageJson = require("../../../package.json");
const { initializeState } = require("../executors/initializeState.exec");
const { createTask } = require("../executors/createTask.exec");
const { deleteTask } = require("../executors/deleteTask.exec");
const { updateTaskOrder } = require("../executors/updateTaskOrder.exec");
const { updateTaskTitle } = require("../executors/updateTaskTitle.exec");
const { updateTaskDueDate } = require("../executors/updateTaskDueDate.exec");
const { updateTaskMemo } = require("../executors/updateTaskMemo.exec");
const { createCategory } = require("../executors/createCategory.exec");
const { deleteCategory } = require("../executors/deleteCategory.exec");
const { addTaskCategory } = require("../executors/addTaskCategory.exec");
const { updateTaskDone } = require("../executors/updateTaskDone.exec");
const { deleteTaskCategory } = require("../executors/deleteTaskCategory.exec");
const {
  updateTaskRepeatPeriod,
} = require("../executors/updateTaskRepeatPeriod.exec");
const { createSubtask } = require("../executors/createSubtask.exec");
const { deleteSubtask } = require("../executors/deleteSubtask.exec");
const { updateSubtaskTitle } = require("../executors/updateSubtaskTitle.exec");
const {
  updateSubtaskDueDate,
} = require("../executors/updateSubtaskDueDate.exec");
const { updateSubtaskDone } = require("../executors/updateSubtaskDone.exec");
const TX_TYPE = require("../constants/TxType.constants");
const Transaction = require("../objects/Transaction");
const Block = require("../objects/Block");
const { sortFields } = require("../util/TxUtil");

class ExecutorService {
  constructor() {
    this.ipcService = null;
    this.userService = null;
    this.databaseService = null;
    this.syncerService = null;

    this.serviceGroup = null;
  }

  /**
   * @param serviceGroup {ServiceGroup}
   */
  inject(serviceGroup) {
    this.ipcService = serviceGroup.ipcService;
    this.userService = serviceGroup.userService;
    this.databaseService = serviceGroup.databaseService;
    this.syncerService = serviceGroup.syncerService;

    this.serviceGroup = serviceGroup;
  }

  makeTransaction(type, data, blockNumber) {
    const timestamp = Date.now();
    const schemeVersion = PackageJson.config.scheme_version;

    // sort fields
    data = sortFields(data);
    return new Transaction(schemeVersion, type, timestamp, data, blockNumber);
  }

  /**
   * @param blockNumber {number}
   * @param txHash {string}
   * @returns {Promise<*>}
   */
  async getLocalBlockHash(blockNumber, txHash) {
    const userId = await this.userService.getCurrent();
    const db = await this.databaseService.getUserDatabaseContext(userId);

    const [rawTxs] = await db.all(
      "SELECT * FROM transactions WHERE block_number = ?",
      blockNumber
    );
    if (rawTxs != null) {
      // block already exists
      return rawTxs.block_hash;
    }

    const prevBlockNumber = blockNumber - 1;
    let prevBlockHash;
    if (prevBlockNumber === 0) {
      // empty 32 bytes hash (initial block)
      const initialBlock = Block.emptyBlock();
      prevBlockHash = initialBlock.hash;
      console.debug(`Initial state hash: ${prevBlockHash}`);
    } else {
      // standard block hash
      const [prevRawTxs] = await db.all(
        "SELECT * FROM transactions WHERE block_number = ?",
        prevBlockNumber
      );
      if (prevRawTxs == null)
        throw new Error(`No transactions in block ${prevBlockNumber}`);
      prevBlockHash = prevRawTxs.block_hash;
    }
    const currentBlock = new Block(blockNumber, txHash, prevBlockHash);
    console.debug(currentBlock);
    return currentBlock.hash;
  }

  /**
   * @param reqId {string}
   * @param tx {Transaction}
   * @param blockHash {?string}
   * @returns {Promise<void>}
   */
  async applyTransaction(reqId, tx, blockHash = null) {
    if (tx == null) throw new Error("Transaction is null");
    if (!(tx instanceof Transaction))
      throw new Error("tx is not instance of Transaction");
    if (tx.type == null) throw new Error("Transaction type is null");
    let expectedBlockHash = await this.getLocalBlockHash(
      tx.blockNumber,
      tx.hash
    );
    if (blockHash == null) {
      if (expectedBlockHash == null)
        throw new Error(`Local block hash of #${tx.blockNumber} not found`);
      blockHash = expectedBlockHash;
    } else if (blockHash !== expectedBlockHash) {
      throw new Error(
        `Block hash mismatch: ${blockHash} != ${expectedBlockHash}`
      );
    }

    // console.debug(JSON.stringify(tx, null, 4));
    console.debug(tx);

    const userId = await this.userService.getCurrent();
    const db = await this.databaseService.getUserDatabaseContext(userId);
    await db.begin();

    try {
      switch (tx.type) {
        case TX_TYPE.INITIALIZE:
          await initializeState(
            reqId,
            this.serviceGroup,
            tx.content,
            tx.blockNumber
          );
          break;
        case TX_TYPE.CREATE_TASK:
          await createTask(reqId, this.serviceGroup, tx.content);
          break;
        case TX_TYPE.DELETE_TASK:
          await deleteTask(reqId, this.serviceGroup, tx.content);
          break;
        case TX_TYPE.UPDATE_TASK_ORDER:
          await updateTaskOrder(reqId, this.serviceGroup, tx.content);
          break;
        case TX_TYPE.UPDATE_TASK_TITLE:
          await updateTaskTitle(reqId, this.serviceGroup, tx.content);
          break;
        case TX_TYPE.UPDATE_TASK_DUE_DATE:
          await updateTaskDueDate(reqId, this.serviceGroup, tx.content);
          break;
        case TX_TYPE.UPDATE_TASK_MEMO:
          await updateTaskMemo(reqId, this.serviceGroup, tx.content);
          break;
        case TX_TYPE.CREATE_CATEGORY:
          await createCategory(reqId, this.serviceGroup, tx.content);
          break;
        case TX_TYPE.DELETE_CATEGORY:
          await deleteCategory(reqId, this.serviceGroup, tx.content);
          break;
        case TX_TYPE.ADD_TASK_CATEGORY:
          await addTaskCategory(reqId, this.serviceGroup, tx.content);
          break;
        case TX_TYPE.UPDATE_TASK_DONE:
          await updateTaskDone(reqId, this.serviceGroup, tx.content);
          break;
        case TX_TYPE.DELETE_TASK_CATEGORY:
          await deleteTaskCategory(reqId, this.serviceGroup, tx.content);
          break;
        case TX_TYPE.UPDATE_TASK_REPEAT_PERIOD:
          await updateTaskRepeatPeriod(reqId, this.serviceGroup, tx.content);
          break;
        case TX_TYPE.CREATE_SUBTASK:
          await createSubtask(reqId, this.serviceGroup, tx.content);
          break;
        case TX_TYPE.DELETE_SUBTASK:
          await deleteSubtask(reqId, this.serviceGroup, tx.content);
          break;
        case TX_TYPE.UPDATE_SUBTASK_TITLE:
          await updateSubtaskTitle(reqId, this.serviceGroup, tx.content);
          break;
        case TX_TYPE.UPDATE_SUBTASK_DUE_DATE:
          await updateSubtaskDueDate(reqId, this.serviceGroup, tx.content);
          break;
        case TX_TYPE.UPDATE_SUBTASK_DONE:
          await updateSubtaskDone(reqId, this.serviceGroup, tx.content);
          break;
        default:
          throw new Error("Transaction type is not supported");
      }

      // decode tx.content
      const rawContent = tx.content;
      const decodedBuffer = Buffer.from(JSON.stringify(rawContent));

      // insert block (as transaction) into local db
      await db.run(
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

      await this.syncerService.setLocalLastBlockNumber(userId, tx.blockNumber);
      await db.commit();

      // send to ipc
      this.ipcService.sender(
        "system/lastTxUpdateTime",
        null,
        true,
        tx.timestamp
      );
    } catch (err) {
      try {
        await db.rollback();
      } catch (err) {
        console.error(err);
      }
      throw err;
    }
  }
}

module.exports = ExecutorService;
