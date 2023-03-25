const { v4 } = require("uuid");
const assert = require("assert");
const TxContent = require("../user_modules/TxContent");

class DeleteCategoryTxContent extends TxContent {
  constructor(cid) {
    super();

    this.cid = cid;
  }
}

/**
 * @param {DeleteCategoryTxContent} txReq
 */
const deleteCategory = async (db, reqId, { sender }, txReq) => {
  // assert that txReq is instance of CreateTaskTxContent
  assert(new DeleteCategoryTxContent().instanceOf(txReq), "Transaction request is not instance of class");

  await db.run("DELETE FROM tasks_categories WHERE cid = ?", txReq.cid);
  await db.run("DELETE FROM categories WHERE cid = ?", txReq.cid);
  db.commit();
  sender("category/deleteCategory", reqId, true, {
    cid: txReq.cid,
  });
};

module.exports = {
  deleteCategory,
  DeleteCategoryTxContent,
};
