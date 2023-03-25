const PackageJson = require("../../../package.json");
const sha256 = require("sha256");

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

class Block {
  constructor(number, txHash, prevBlockHash) {
    this.number = number;
    this.txHash = txHash;
    this.prevBlockHash = prevBlockHash;
    this.hash = this.getHash();
  }

  getHash() {
    const raw = {
      number: this.number,
      txHash: this.txHash,
      prevBlockHash: this.prevBlockHash,
    };
    const buffer = jsonMarshal(raw);
    const hash = sha256(buffer);
    return hash;
  }

  static emptyBlock() {
    return new Block(0, "", "");
  }
}

class Transaction {
  constructor(version, type, timestamp, content, blockNumber) {
    this.version = version;
    this.type = type;
    this.timestamp = timestamp;
    this.content = content;
    this.blockNumber = blockNumber;
    this.hash = this.getHash();
  }

  getHash() {
    const raw = {
      version: this.version,
      type: this.type,
      timestamp: this.timestamp,
      content: this.content,
    };
    const buffer = jsonMarshal(raw);
    const hash = sha256(buffer);
    return hash;
  }
}

class TransactionRequest extends Transaction {
  constructor(version, type, timestamp, content, blockNumber, blockHash) {
    super(version, type, timestamp, content, blockNumber);
    this.blockHash = blockHash;
  }

  static fromTransaction(tx, blockHash) {
    if (tx == null) throw new Error("Transaction is null");
    if (!(tx instanceof Transaction)) throw new Error("tx is not instance of Transaction");
    return new TransactionRequest(tx.version, tx.type, tx.timestamp, tx.content, tx.blockNumber, blockHash);
  }
}

const makeTransaction = (type, data, blockNumber) => {
  const timestamp = Date.now();
  const schemeVersion = PackageJson.config.scheme_version;

  // sort fields
  data = sortFields(data);
  return new Transaction(schemeVersion, type, timestamp, data, blockNumber);
};

const getBlockHash = async (db, blockNumber, txHash) => {
  const [rawTxs] = await db.all("SELECT * FROM transactions WHERE block_number = ?", blockNumber);
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
    const [prevRawTxs] = await db.all("SELECT * FROM transactions WHERE block_number = ?", prevBlockNumber);
    if (prevRawTxs == null) throw new Error(`No transactions in block ${prevBlockNumber}`);
    prevBlockHash = prevRawTxs.block_hash;
  }
  const currentBlock = new Block(blockNumber, txHash, prevBlockHash);
  console.debug(currentBlock);
  return currentBlock.hash;
};

const txExecutor = async (db, reqId, Ipc, tx, blockHash = null) => {
  if (tx == null) throw new Error("Transaction is null");
  if (!(tx instanceof Transaction)) throw new Error("tx is not instance of Transaction");
  if (tx.type == null) throw new Error("Transaction type is null");
  let expectedBlockHash = await getBlockHash(db, tx.blockNumber, tx.hash);
  if (blockHash == null) {
    blockHash = expectedBlockHash;
  } else if (blockHash != expectedBlockHash) {
    throw new Error(`Block hash mismatch: ${blockHash} != ${expectedBlockHash}`);
  }

  const { setLastBlockNumberWithoutUserId, sender } = Ipc;
  const args = [db, reqId, Ipc];

  // console.debug(JSON.stringify(tx, null, 4));
  console.debug(tx);

  await db.begin();

  try {
    switch (tx.type) {
      case TX_TYPE.INITIALIZE:
        await initializeState(...args, tx.content, tx.blockNumber);
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
    await db.run(
      `INSERT INTO transactions (version, type, timestamp, content, hash, block_number, block_hash) VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [tx.version, tx.type, tx.timestamp, decodedBuffer, tx.hash, tx.blockNumber, blockHash]
    );

    setLastBlockNumberWithoutUserId(tx.blockNumber);
    await db.commit();

    // send to ipc
    sender("system/lastTxUpdateTime", null, true, tx.timestamp);
  } catch (err) {
    await db.rollback();
    throw err;
  }
};

const rollbackState = async (socket, databaseContext, db, userId, Ipc, blockNumber, setDb) => {
  if (!socket.connected()) {
    throw new Error("socket is not connected");
  }

  if (setDb == null || typeof setDb !== "function") {
    throw new Error("setDb is not function");
  }

  // get state from remote
  let state = await socket.emitSync("stateByBlockNumber", {
    blockNumber,
  });

  let block = await socket.emitSync("blockByBlockNumber", {
    blockNumber,
  });

  // delete user database
  await db.close();
  await databaseContext.deleteDatabase(userId);
  await databaseContext.initialize(userId);
  let newDb = await databaseContext.getContext();
  setDb(newDb);

  // save last tx in local db
  if (blockNumber > 0) {
    let { tx: rawTx, number, hash: blockHash } = block;
    const tx = new Transaction(rawTx.version, rawTx.type, rawTx.timestamp, rawTx.content, number);
    const rawContent = tx.content;
    const decodedBuffer = Buffer.from(JSON.stringify(rawContent));
    await db.run(
      `INSERT INTO transactions (version, type, timestamp, content, hash, block_number, block_hash) VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [tx.version, tx.type, tx.timestamp, decodedBuffer, tx.hash, tx.blockNumber, blockHash]
    );

    // insert state to local database
    await initializeState(db, null, Ipc, state, 1);
  }

  Ipc.setLastBlockNumber(userId, blockNumber);
};

const jsonMarshal = (v) => {
  if (v === null || v === undefined) {
    return Buffer.from([]);
  } else {
    const str = JSON.stringify(v);
    const bytes = Buffer.from(str, "utf8");
    return bytes;
  }
};

const sortFields = (obj) => {
  if (obj == null || typeof obj !== "object") return obj;
  let keys = Object.keys(obj);
  keys.sort();
  let newObj = {};
  for (let key of keys) {
    newObj[key] = sortFields(obj[key]);
  }
  return newObj;
};

module.exports = {
  txExecutor,
  TX_TYPE,
  makeTransaction,
  getBlockHash,
  Block,
  Transaction,
  TransactionRequest,
  rollbackState,
};
