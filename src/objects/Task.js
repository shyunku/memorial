import { v4 } from "uuid";
import Subtask from "./Subtask";

class Task {
  constructor(title, startDate, endDate) {
    this.id = v4();
    this.createdAt = new Date();

    this.title = title;
    this.done = false;

    this.startDate = startDate;
    this.endDate = endDate;

    this.subtasks = [];
  }

  fulfilled() {
    this.done = true;
  }

  getTimeProgress() {
    if (!this.createdAt || !this.endDate) {
      return 0;
    }

    const endDate = new Date(this.endDate);
    const createdAt = new Date(this.createdAt);

    const now = new Date();
    const total = endDate.getTime() - createdAt.getTime();
    const passed = now.getTime() - createdAt.getTime();
    return passed / total;
  }

  addSubtask(title, endDate) {
    const subtask = new Subtask(title, endDate);
    this.subtasks.push(subtask);
    return subtask;
  }

  getSubTaskList() {
    return this.subtasks;
  }

  getSubTaskCount() {
    return this.subtasks.length;
  }

  getFulfilledSubTaskCount() {
    return this.subtasks.filter((subtask) => subtask.done === true).length;
  }

  static fromObject(obj) {
    const ctx = new Task();
    for (let key in obj) {
      if (key === "subtasks") {
        ctx[key] = obj[key].map((subtask) => Subtask.fromObject(subtask));
      } else {
        ctx[key] = obj[key];
      }
    }
    return ctx;
  }
}

export default Task;
