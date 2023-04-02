const { v4 } = require("uuid");
const assert = require("assert");
const TxContent = require("../objects/TxContent");

class CreateCategoryTxContent extends TxContent {
  constructor(cid, title, secret, locked, color, createdAt) {
    super();

    this.cid = cid;
    this.title = title;
    this.secret = secret;
    this.locked = locked;
    this.color = color;
    this.createdAt = createdAt;
  }
}

const createCategoryPre = async () => {
  return {
    cid: v4(),
  };
};

/**
 * @param {string} reqId?
 * @param {ServiceGroup} serviceGroup
 * @param {CreateCategoryTxContent} txReq
 */
const createCategory = async (reqId, serviceGroup, txReq) => {
  // assert that txReq is instance of CreateTaskTxContent
  assert(
    new CreateCategoryTxContent().instanceOf(txReq),
    "Transaction request is not instance of class"
  );

  const userId = serviceGroup.userService.getCurrent();
  const db = await serviceGroup.databaseService.getUserDatabaseContext(userId);

  await db.run(
    "INSERT INTO categories (cid, title, secret, locked, color, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    txReq.cid,
    txReq.title,
    txReq.secret,
    txReq.locked,
    txReq.color,
    txReq.createdAt
  );

  serviceGroup.ipcService.sender("category/createCategory", reqId, true, {
    cid: txReq.cid,
    title: txReq.title,
    secret: txReq.secret,
    locked: txReq.locked,
    color: txReq.color,
    createdAt: txReq.createdAt,
  });
};

module.exports = {
  createCategory,
  createCategoryPre,
  CreateCategoryTxContent,
};
