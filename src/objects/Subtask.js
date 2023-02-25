import { v4 } from "uuid";
import Mutatable from "./Mutatable";

class Subtask extends Mutatable {
  constructor(title, dueDate) {
    super({
      sid: "id",
      created_at: "createdAt",
      due_date: "dueDate",
      title: "title",
      done: "done",
      done_at: "doneAt",
    });

    this.id = v4();
    this.createdAt = new Date();
    this.doneAt = null;

    this.title = title;
    this.done = false;

    this.dueDate = dueDate;
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
