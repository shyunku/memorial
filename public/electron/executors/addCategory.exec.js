const { v4 } = require("uuid");
const assert = require("assert");
const TxContent = require("../user_modules/TxContent");

class AddCategoryTxContent extends TxContent {
  constructor(cid, title, secret, locked, color) {
    super();

    this.cid = cid;
    this.title = title;
    this.secret = secret;
    this.locked = locked;
    this.color = color;
  }
}

const addCategoryPre = async () => {
  return {
    cid: v4(),
  };
};

/**
 * @param {AddCategoryTxContent} txReq
 */
const addCategory = async (db, reqId, { sender }, txReq) => {
  // assert that txReq is instance of CreateTaskTxContent
  assert(new AddCategoryTxContent().instanceOf(txReq), "Transaction request is not instance of class");

  try {
    await db.run(
      "INSERT INTO categories (cid, title, secret, locked, color) VALUES (?, ?, ?, ?, ?)",
      txReq.cid,
      txReq.title,
      txReq.secret,
      txReq.locked,
      txReq.color
    );
    sender("category/addCategory", reqId, true, {
      cid: txReq.cid,
      title: txReq.title,
      secret: txReq.secret,
      locked: txReq.locked,
      color: txReq.color,
    });
  } catch (err) {
    throw err;
  }
};

module.exports = {
  addCategory,
  addCategoryPre,
  AddCategoryTxContent,
};
