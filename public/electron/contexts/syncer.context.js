const Transaction = require("../objects/Transaction");
const { initializeState } = require("../executors/initializeState.exec");
const TransactionRequest = require("../objects/TransactionRequest");
const { fastInterval } = require("../util/CommonUtil");
const { jsonUnmarshal, jsonMarshal } = require("../util/TxUtil");

class SyncerContext {
  /**
   * @param userId {string}
   * @param serviceGroup {ServiceGroup}
   */
  constructor(userId, serviceGroup) {
    this.userId = userId;
    this.serviceGroup = serviceGroup;

    /** @type {DatabaseService} */
    this.databaseService = serviceGroup.databaseService;

    /** @type {WebsocketService} */
    this.websocketService = serviceGroup.websocketService;

    /** @type {IpcService} */
    this.ipcService = serviceGroup.ipcService;

    /** @type {ExecutorService} */
    this.executorService = serviceGroup.executorService;

    /** @type {TransitionService} */
    this.transitionService = serviceGroup.transitionService;

    this.localLastBlockNumber = null;
    this.remoteLastBlockNumber = null;

    /** @type {DatabaseContext} */
    this.db = null;
    /** @type {WebsocketContext} */
    this.socket = null;
    /** @type {TransitionContext} */
    this.trs = null;

    this.listenReady = false;

    // event queue handler
    this.eventQueueIndexer = 0;
    this.eventQueue = {};
    this.remainEvents = 0;
    this.handlingEvents = false;

    // loop handler
    this.eventLoopInterval = null;
    this.startEventLoop();
    this.eventLoopLock = true;
  }

  async initialize() {
    this.db = await this.databaseService.getUserDatabaseContext(this.userId);
    if (this.db == null) throw new Error("Database is null");
    this.socket = await this.websocketService.getUserWebsocketContext(
      this.userId
    );
    if (this.socket == null) throw new Error("Socket is null");
    this.trs = await this.transitionService.getUserTransitionContext(
      this.userId
    );
    if (this.trs == null) throw new Error("Transition is null");
  }

  /**
   * @param lock {boolean}
   * @returns {Promise<void>}
   */
  async setEventLock(lock) {
    this.eventLoopLock = lock;
  }

  async getLocalLastBlockNumberFromDatabase() {
    const [transaction] = await this.db.all(
      "SELECT * FROM transactions ORDER BY block_number DESC LIMIT 1"
    );
    if (transaction == null) return 0;
    return transaction.block_number;
  }

  async getRemoteLastBlockNumberFromServer() {
    this.remoteLastBlockNumber = await this.socket.sendSync("lastBlockNumber");
    return this.remoteLastBlockNumber;
  }

  async getLocalLastBlockNumber() {
    if (this.localLastBlockNumber == null) {
      this.localLastBlockNumber =
        await this.getLocalLastBlockNumberFromDatabase();
    }
    return this.localLastBlockNumber;
  }

  async getRemoteLastBlockNumber() {
    if (this.remoteLastBlockNumber == null) {
      this.remoteLastBlockNumber =
        await this.getRemoteLastBlockNumberFromServer();
    }
    return this.remoteLastBlockNumber;
  }

  setLocalLastBlockNumber(blockNumber) {
    this.localLastBlockNumber = blockNumber;
    this.ipcService.sender(
      "system/localLastBlockNumber",
      null,
      true,
      blockNumber
    );
  }

  /**
   * @param blockNumber {number}
   */
  setRemoteLastBlockNumber(blockNumber) {
    this.remoteLastBlockNumber = blockNumber;
    this.ipcService.sender(
      "system/remoteLastBlockNumber",
      null,
      true,
      blockNumber
    );
  }

  startEventLoop() {
    if (this.eventLoopInterval != null) return;
    this.eventLoopInterval = fastInterval(async () => {
      if (this.eventLoopLock) return;
      if (this.remainEvents === 0) {
        clearInterval(this.eventLoopInterval);
        this.eventLoopInterval = null;
        return;
      }
      if (this.handlingEvents) return;
      this.handlingEvents = true;
      const copied = { ...this.eventQueue };
      this.eventQueue = {};

      try {
        for (const key in copied) {
          const promise = copied[key];
          await promise();
          console.debug(`handled event ${key}`);
          this.remainEvents--;
        }
      } catch (err) {
        console.error(`Event handling error`, err);
      } finally {
        this.handlingEvents = false;
      }
    }, 100);
  }

  addEventQueue(promise) {
    this.eventQueue[this.eventQueueIndexer++] = promise;
    this.remainEvents++;
    this.startEventLoop();
  }

  /**
   * @param ready {boolean}
   */
  async stateListenReady(ready) {
    this.listenReady = ready;
    if (ready) {
      try {
        const socket = await this.websocketService.getUserWebsocketContext(
          this.userId
        );
        if (socket.connected()) {
          await socket.requestLastRemoteBlock();
        }
      } catch (err) {
        console.error(`Waiting block number error`, err);
      }
    }
  }

  /**
   * @param tx {Transaction}
   * @param timeout? {number}
   * @returns {Promise<any>}
   */
  async sendTransaction(tx, timeout = 5000) {
    try {
      if (this.socket == null) throw new Error("Socket is not connected");
      if (!(tx instanceof Transaction))
        throw new Error("Invalid transaction type (not Transaction)");

      const blockHash = await this.executorService.getLocalBlockHash(
        tx.blockNumber,
        tx.hash
      );
      const txRequest = TransactionRequest.fromTransaction(tx, blockHash);

      if (this.socket.connected()) {
        return await this.socket.sendSync("transaction", txRequest, timeout);
      } else {
        throw new Error("not-connected");
      }
    } catch (err) {
      console.error(err);
      this.ipcService.sender("transaction/error", null, false, err.message, tx);
    }
  }

  /**
   * @param startBlockNumber {number}
   * @param endBlockNumber {number}
   * @returns {Promise<void>}
   */
  async commitTransactions(startBlockNumber, endBlockNumber) {
    if (endBlockNumber === -1 && startBlockNumber > endBlockNumber) {
      console.warn(
        `Invalid range for tx commits: ${startBlockNumber} ~ ${endBlockNumber}`
      );
      return;
    }

    let txs;
    if (endBlockNumber === -1) {
      txs = await this.db.all(
        `SELECT * FROM transactions WHERE block_number >= ?;`,
        [startBlockNumber]
      );
    } else {
      txs = await this.db.all(
        `SELECT * FROM transactions WHERE block_number >= ? AND block_number <= ?;`,
        [startBlockNumber, endBlockNumber]
      );
    }

    if (txs.length === 0) {
      console.warn(`No transactions to commit`);
      return;
    }

    let minBlockNumber = txs[0].block_number;
    let maxBlockNumber = txs[txs.length - 1].block_number;
    if (minBlockNumber !== startBlockNumber) {
      console.warn(`Min block number is not equal to start block number`);
      return;
    }
    if (endBlockNumber !== -1 && maxBlockNumber !== endBlockNumber) {
      console.warn(`Max block number is not equal to end block number`);
      return;
    }

    let txRequests = txs.map((tx) => {
      const parsedContent = jsonUnmarshal(tx.content);
      return new TransactionRequest(
        tx.version,
        tx.type,
        tx.timestamp,
        parsedContent,
        tx.block_number,
        tx.block_hash
      );
    });

    try {
      await this.socket.sendSync("commitTransactions", txRequests);
    } catch (err) {
      console.warn(`Error occurred while committing transactions`);
      console.error(err);
    }
  }

  async saveBlockAndExecute(block) {
    return new Promise(async (res, rej) => {
      this.addEventQueue(
        () =>
          new Promise(async (resolve, reject) => {
            try {
              let { number, hash: blockHash, updates } = block;
              const { srcTx: rawTx, transitions } = updates;
              const tx = new Transaction(
                rawTx.version,
                rawTx.type,
                rawTx.timestamp,
                rawTx.content,
                number
              );
              const localBlockNumber = await this.getLocalLastBlockNumber();
              if (localBlockNumber >= number) {
                console.info(`Block ${number} is already saved`);
                return;
              }
              console.info(`Applying ${transitions.length} transitions...`);
              console.debug(transitions);
              await this.trs.applyTransitions(tx, blockHash, transitions);
              await this.setLocalLastBlockNumber(tx.blockNumber);
              // await this.executorService.applyTransaction(null, tx, blockHash);
              res();
            } catch (err) {
              rej(err);
              throw err;
            } finally {
              resolve();
            }
          })
      );
    });
  }

  /**
   * snapSync operates sync after snapshot
   * @param startBlockNumber {number}
   * @param endBlockNumber {number}
   * @returns {Promise<void>}
   */
  async snapSync(startBlockNumber, endBlockNumber) {
    try {
      // get snapshot
      await this.applySnapshot(startBlockNumber);
      // sync after snapshot
      await this.fullSync(startBlockNumber + 1, endBlockNumber);
    } catch (err) {
      console.error(`Error occurred while snap sync`);
      console.error(err);
    }
  }

  async fullSync(startBlockNumber, endBlockNumber) {
    try {
      if (endBlockNumber < startBlockNumber) {
        console.debug(
          `No need to sync, startBlockNumber: ${startBlockNumber}, endBlockNumber: ${endBlockNumber}`
        );
        return;
      }

      let blocks = await this.socket.sendSync("syncBlocks", {
        startBlockNumber,
        endBlockNumber,
      });
      const sortedBlocks = blocks.sort((a, b) => a.number - b.number);

      // check block count
      const expectedBlockCount = endBlockNumber - startBlockNumber + 1;
      if (sortedBlocks.length !== expectedBlockCount) {
        throw new Error(
          `Block length mismatch, expected: ${
            endBlockNumber - startBlockNumber + 1
          }, actual: ${sortedBlocks.length}`
        );
      }

      let syncingBlock = null;
      try {
        for (let block of sortedBlocks) {
          syncingBlock = block.number;
          await this.saveBlockAndExecute(block);
        }
      } catch (err) {
        console.error(
          `Error occurred while syncing blocks at block number ${syncingBlock}`
        );
        throw err;
      }
    } catch (err) {
      console.error(`Error occurred while full sync`);
      console.error(err);
      throw err;
    }
  }

  /**
   * @param blockNumber {number}
   * @returns {Promise<void>}
   */
  async applySnapshot(blockNumber) {
    return new Promise(async (res, rej) => {
      this.addEventQueue(() => {
        return new Promise(async (resolve, reject) => {
          try {
            // get state from remote
            let state = await this.socket.sendSync("stateByBlockNumber", {
              blockNumber,
            });

            let block = await this.socket.sendSync("blockByBlockNumber", {
              blockNumber,
            });

            try {
              // try to delete all rows in all tables
              await this.db.clear();
            } catch (err) {
              try {
                // delete user database
                await this.db.close();
                await this.databaseService.deleteUserDatabase(this.userId);
                await this.databaseService.initializeUserDatabase(this.userId);
              } catch (cErr) {
                console.error(cErr);
                throw err;
              } finally {
                this.db = await this.databaseService.getUserDatabaseContext(
                  this.userId
                );
              }
            }

            // save last tx in local db
            if (blockNumber > 0) {
              let { updates, number, hash: blockHash } = block;
              let { srcTx: rawTx } = updates;
              const tx = new Transaction(
                rawTx.version,
                rawTx.type,
                rawTx.timestamp,
                rawTx.content,
                number
              );
              const rawContent = tx.content;
              const decodedBuffer = Buffer.from(JSON.stringify(rawContent));
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

              // insert state to local database
              await initializeState(null, this.serviceGroup, state, 1);
            }

            this.setLocalLastBlockNumber(blockNumber);
            this.ipcService.sender("system/snapshotApplied", null, true);
            res();
          } catch (err) {
            rej(err);
          } finally {
            resolve();
          }
        });
      });
    });
  }

  // clear transactions & states
  async handleDeleteTransactionsAfter(blockNumber) {
    try {
      console.info(`Deleting transactions after block number ${blockNumber}`);
      const newLastBlockNumber = blockNumber - 1;
      await this.applySnapshot(newLastBlockNumber);
      this.ipcService.sender("system/stateRollback", null, true);
    } catch (err) {
      console.error(err);
      this.ipcService.sender("system/stateRollback", null, false);
    }
  }

  async getLocalBlockHash(blockNumber) {
    const db = await this.databaseService.getUserDatabaseContext(this.userId);
    let [rawTx] = await db.all(
      `SELECT * FROM transactions WHERE block_number = ?;`,
      [blockNumber]
    );
    if (rawTx == null) return null;
    return rawTx.block_hash;
  }

  async getRemoteBlockHash(blockNumber) {
    return await this.socket.sendSync("blockHashByBlockNumber", {
      blockNumber: blockNumber,
    });
  }

  async getLocalBlock(blockNumber) {
    const db = await this.databaseService.getUserDatabaseContext(this.userId);
    let [rawTx] = await db.all(
      `SELECT * FROM transactions WHERE block_number = ?;`,
      [blockNumber]
    );
    if (rawTx == null) return null;
    return rawTx;
  }

  async getRemoteBlock(blockNumber) {
    return await this.socket.sendSync("blockByBlockNumber", {
      blockNumber: blockNumber,
    });
  }

  async getOldestLocalBlockNumber() {
    const db = await this.databaseService.getUserDatabaseContext(this.userId);
    let [rawTx] = await db.all(
      `SELECT * FROM transactions ORDER BY block_number ASC LIMIT 1;`
    );
    if (rawTx == null) return null;
    return rawTx.block_number;
  }

  // find max block number that is equal or less than given block number
  async findLeftMostLocalBlockNumber(rightBound) {
    const db = await this.databaseService.getUserDatabaseContext(this.userId);
    let [rightMost] = await db.all(
      `SELECT * FROM transactions WHERE block_number <= ? ORDER BY block_number DESC LIMIT 1;`,
      [rightBound]
    );
    return rightMost?.block_number ?? null;
  }

  // find min block number that is equal or greater than given block number
  async findRightMostLocalBlockNumber(leftBound) {
    const db = await this.databaseService.getUserDatabaseContext(this.userId);
    let [leftMost] = await db.all(
      `SELECT * FROM transactions WHERE block_number >= ? ORDER BY block_number ASC LIMIT 1;`,
      [leftBound]
    );
    return leftMost?.block_number ?? null;
  }

  // Mismatch Finding Algorithm (MFA)
  // find mismatched block number with binary search even if local db has missing area
  // best: O(logN), worst: O(N)
  async findBlockHashMismatchStartNumber(left, right) {
    console.debug(`[MFA] searching ${left} ~ ${right}...`);
    if (left > right) return null;
    if (left <= 0) return null;

    const mid = Math.floor((left + right) / 2);

    const localBlockHash = await this.getLocalBlockHash(mid);
    if (localBlockHash != null) {
      // local db has this transaction
      const remoteBlockHash = await this.getRemoteBlockHash(mid);
      console.debug(
        `[MFA] comparing ${mid} local: ${localBlockHash}, remote: ${remoteBlockHash}`
      );
      if (localBlockHash === remoteBlockHash)
        return await this.findBlockHashMismatchStartNumber(mid + 1, right);
      let leftSide = await this.findBlockHashMismatchStartNumber(left, mid - 1);
      return leftSide ?? mid;
    }

    // local db has no transaction here... (maybe truncated)
    // ...leftMost, [missing area], rightMost...
    // ...L3, L2, L1, [missing], R1, R2, R3...
    let leftMost = await this.findLeftMostLocalBlockNumber(mid - 1);
    let rightMost = await this.findRightMostLocalBlockNumber(mid + 1);

    console.debug(
      `[MFA] No route on ${mid}, split: [~${leftMost}] | [${rightMost}~]`
    );

    // R1 doesn't exist, find just left side
    if (rightMost == null)
      return await this.findBlockHashMismatchStartNumber(left, leftMost);
    // L1 doesn't exist, find just right side
    if (leftMost == null)
      return await this.findBlockHashMismatchStartNumber(rightMost, right);

    // check R1 first
    const firstRightMostMismatch = await this.findBlockHashMismatchStartNumber(
      rightMost,
      rightMost
    );

    // R1 matched in right most (no need to search left side)
    if (firstRightMostMismatch == null)
      return await this.findBlockHashMismatchStartNumber(left, leftMost);

    // R1 mismatched and leftMost exists, so check left side (worst case)
    let leftSideMismatch = await this.findBlockHashMismatchStartNumber(
      left,
      leftMost
    );
    return leftSideMismatch ?? rightMost;
  }

  /**
   * @param remoteLastBlockNumber {number}
   * @returns {Promise<void>}
   */
  async overwriteLocalStateWithRemote(remoteLastBlockNumber) {
    // purge local state and download snapshot from server
    await this.applySnapshot(remoteLastBlockNumber);
  }

  /**
   * @param mismatchStartBlockNumber {number}
   * @param localLastBlockNumber {number}
   * @returns {Promise<void>}
   */
  async overwriteRemoteStateWithLocal(
    mismatchStartBlockNumber,
    localLastBlockNumber
  ) {
    // purge remote state as interval and upload snapshot to server
    try {
      await this.socket.sendSync("deleteMismatchBlocks", {
        startBlockNumber: mismatchStartBlockNumber,
        endBlockNumber: -1,
      });
      await this.commitTransactions(
        mismatchStartBlockNumber,
        localLastBlockNumber
      );
    } catch (err) {
      throw err;
    }
  }
}

module.exports = SyncerContext;
