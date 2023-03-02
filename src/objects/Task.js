import { v4 } from "uuid";
import Category from "./Category";
import Mutatable from "./Mutatable";
import Subtask from "./Subtask";

class Task extends Mutatable {
  constructor(title, dueDate) {
    super({
      tid: "id",
      created_at: "createdAt",
      due_date: "dueDate",
      title: "title",
      memo: "memo",
      done: "done",
      done_at: "doneAt",
      categories: "categories",
    });

    this.id = v4();
    this.createdAt = new Date();
    this.doneAt = null;
    this.dueDate = dueDate;

    this.title = title;
    this.memo = "";
    this.done = false;
    this.subtasks = {};
    this.categories = {};

    this.next = null;
    this.prev = null;
  }

  fulfilled() {
    this.done = true;
  }

  addSubtask(subtask) {
    if (!(subtask instanceof Subtask)) {
      console.error("invalid subtask", subtask);
      return;
    }
    this.subtasks[subtask.id] = subtask;
  }

  deleteSubtask(sid) {
    delete this.subtasks[sid];
  }

  addCategory(category) {
    if (!(category instanceof Category)) {
      console.error("invalid category", category);
      console.log(new Error());
      return;
    }
    this.categories[category.id] = category;
  }

  deleteCategory(cid) {
    delete this.categories[cid];
  }

  getTimeProgress() {
    if (!this.createdAt || !this.dueDate) {
      return 0;
    }

    const dueDate = new Date(this.dueDate);
    const createdAt = new Date(this.createdAt);

    const now = new Date();
    const total = dueDate.getTime() - createdAt.getTime();
    const passed = now.getTime() - createdAt.getTime();
    let prog = passed / total;
    return prog > 1 || prog < 0 ? 1 : prog;
  }

  getRemainTime() {
    if (!this.createdAt || !this.dueDate) {
      return 0;
    }

    const dueDate = new Date(this.dueDate);
    const now = new Date();

    const remain = dueDate.getTime() - now.getTime();
    return remain < 0 ? 0 : remain;
  }

  getSubTaskCount() {
    return Object.keys(this.subtasks).length;
  }

  getFulfilledSubTaskCount() {
    return Object.values(this.subtasks).filter((subtask) => subtask.done).length;
  }

  static fromObject(obj) {
    const ctx = new Task();
    for (let key in obj) {
      if (key === "subtasks") {
        ctx.subtasks = { ...obj?.subtasks };
      } else {
        ctx[key] = obj[key];
      }
    }
    return ctx;
  }
}

export default Task;
