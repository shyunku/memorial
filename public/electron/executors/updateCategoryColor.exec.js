const {v4} = require("uuid");
const assert = require("assert");
const TxContent = require("../objects/TxContent");

class UpdateCategoryColorTxContent extends TxContent {
  constructor(cid, color) {
    super();

    this.cid = cid;
    this.color = color;
  }
}

/**
 * @param {string} reqId?
 * @param {ServiceGroup} serviceGroup
 * @param {UpdateCategoryColorTxContent} txReq
 */
const updateCategoryColor = async (reqId, serviceGroup, txReq) => {
  // assert that txReq is instance of CreateTaskTxContent
  assert(
    new UpdateCategoryColorTxContent().instanceOf(txReq),
    "Transaction request is not instance of class"
  );

  const userId = serviceGroup.userService.getCurrent();
  const db = await serviceGroup.databaseService.getUserDatabaseContext(userId);

  let color = txReq.color;
  if (color === "") color = null;

  await db.run(
    "UPDATE categories SET color = ? WHERE cid = ?",
    txReq.color,
    txReq.cid
  );

  serviceGroup.ipcService.sender("category/updateCategoryColor", reqId, true, {
    cid: txReq.cid,
    color: txReq.color,
  });
};

module.exports = {
  updateCategoryColor,
  UpdateCategoryColorTxContent,
};
