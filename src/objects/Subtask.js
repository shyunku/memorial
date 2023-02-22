import { v4 } from "uuid";

class Subtask {
  constructor(title) {
    this.id = v4();
    this.created_at = new Date();

    this.title = title;
    this.done = false;
  }

  fulfilled() {
    this.done = true;
  }
}

export default Subtask;
