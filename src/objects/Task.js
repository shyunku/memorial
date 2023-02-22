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

  addSubtask(title) {
    const subtask = new Subtask(title);
    this.subtasks.push(subtask);
    return subtask;
  }

  getSubTaskCount() {
    return this.subtasks.length;
  }

  getFulfilledSubTaskCount() {
    return this.subtasks.filter((subtask) => subtask.done === true).length;
  }
}

export default Task;
