const Exec = require("../user_modules/executeRouter");

class SyncerContext {
  /**
   * @param userId {string}
   * @param serviceGroup {ServiceGroup}
   */
  constructor(userId, serviceGroup) {
    this.userId = userId;
    this.databaseService = serviceGroup.databaseService;

    this.localLastBlockNumber = null;
    this.remoteLastBlockNumber = null;
  }

  getLocalLastBlockNumber() {
    return this.localLastBlockNumber;
  }

  getRemoteLastBlockNumber() {
    return this.remoteLastBlockNumber;
  }

  async sendTransaction(tx) {
    try {
      if (socket == null) throw new Error("Socket is not connected");
      if (!(tx instanceof Exec.Transaction))
        throw new Error("Invalid transaction type (not Transaction)");

      const blockHash = await Exec.getBlockHash(db, tx.blockNumber, tx.hash);
      const txRequest = Exec.TransactionRequest.fromTransaction(tx, blockHash);

      if (socket.connected()) {
        return await socket.emitSync("transaction", txRequest);
      }
    } catch (err) {
      console.error(err);
      sender("transaction/error", null, false, err.message, tx);
    }
  }

  async saveBlockAndExecute(block) {
    try {
      let { tx: rawTx, number, blockHash } = block;
      const tx = new Transaction(
        rawTx.version,
        rawTx.type,
        rawTx.timestamp,
        rawTx.content,
        number
      );
      await txExecutor(db, null, ipc, tx, blockHash);
      setLastBlockNumber(userId, number);
    } catch (err) {
      throw err;
    }
  }

  async snapSync(startBlockNumber, endBlockNumber) {
    try {
    } catch (err) {
      console.error(`Error occured while snap sync`);
      console.error(err);
    }
  }

  async fullSync(startBlockNumber, endBlockNumber) {
    try {
      // verify services
      await this.verifyServices();

      let blocks = await this.socketService.emitSync("syncBlocks", {
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
          await saveBlockAndExecute(block);
        }
      } catch (err) {
        console.error(
          `Error occured while syncing blocks, error occured at block number ${syncingBlock}`
        );
        throw err;
      }
    } catch (err) {
      console.error(`Error occured while full sync`);
      console.error(err);
    }
  }

  async applySnapshot(blockNumber) {
    if (!socket.connected()) {
      throw new Error("socket is not connected");
    }

    if (setDb == null || typeof setDb !== "function") {
      throw new Error("setDb is not function");
    }

    if (userId == null) {
      throw new Error("userId is null");
    }

    // get state from remote
    let state = await socket.emitSync("stateByBlockNumber", {
      blockNumber,
    });

    let block = await socket.emitSync("blockByBlockNumber", {
      blockNumber,
    });

    try {
      // try delete all rows in all tables
      await clearDatabase(db);
    } catch (err) {
      try {
        // delete user database
        await db.close();

        await databaseContext.deleteDatabase(userId);
        await databaseContext.initialize(userId);
        let newDb = await databaseContext.getContext();
        setDb(newDb);
      } catch (cErr) {
        console.error(cErr);
        throw err;
      }
    }

    // save last tx in local db
    if (blockNumber > 0) {
      let { tx: rawTx, number, hash: blockHash } = block;
      const tx = new Transaction(
        rawTx.version,
        rawTx.type,
        rawTx.timestamp,
        rawTx.content,
        number
      );
      const rawContent = tx.content;
      const decodedBuffer = Buffer.from(JSON.stringify(rawContent));
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

      // insert state to local database
      await initializeState(db, null, Ipc, state, 1);
    }

    Ipc.setLastBlockNumber(userId, blockNumber);
  }
}

module.exports = SyncerContext;
