import { v4 } from "uuid";

class Subtask {
  constructor(title, endDate) {
    this.id = v4();
    this.created_at = new Date();

    this.title = title;
    this.done = false;

    this.endDate = endDate;
  }

  fulfilled() {
    this.done = true;
  }

  static fromObject(obj) {
    const ctx = new Subtask();
    for (let key in obj) {
      ctx[key] = obj[key];
    }
    return ctx;
  }
}

export default Subtask;
