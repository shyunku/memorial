const { v4 } = require("uuid");
const assert = require("assert");
const TxContent = require("../objects/TxContent");

class DeleteCategoryTxContent extends TxContent {
  constructor(cid) {
    super();

    this.cid = cid;
  }
}

/**
 * @param {string} reqId?
 * @param {ServiceGroup} serviceGroup
 * @param {DeleteCategoryTxContent} txReq
 */
const deleteCategory = async (reqId, serviceGroup, txReq) => {
  // assert that txReq is instance of CreateTaskTxContent
  assert(
    new DeleteCategoryTxContent().instanceOf(txReq),
    "Transaction request is not instance of class"
  );

  const userId = serviceGroup.userService.getCurrent();
  const db = await serviceGroup.databaseService.getUserDatabaseContext(userId);

  await db.run("DELETE FROM tasks_categories WHERE cid = ?", txReq.cid);
  await db.run("DELETE FROM categories WHERE cid = ?", txReq.cid);

  serviceGroup.ipcService.sender("category/deleteCategory", reqId, true, {
    cid: txReq.cid,
  });
};

module.exports = {
  deleteCategory,
  DeleteCategoryTxContent,
};
