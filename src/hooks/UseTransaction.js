import Task from "../objects/Task";
import Toast from "../molecules/Toast";
import Subtask from "../objects/Subtask";
import Category from "../objects/Category";

export const applyEmptyState = ({ addPromise }) => {
  addPromise(
    (states) =>
      new Promise((resolve, reject) => {
        resolve(null);
      })
  );
};

export const applyAddTask = ({ addPromise, success, data }) => {
  addPromise(
    (states) =>
      new Promise((resolve, reject) => {
        const { taskMap, categories } = states;
        if (success) {
          // console.log(taskMap);
          const task = new Task();
          task.id = data.tid;
          task.createdAt = data.createdAt
            ? new Date(data.createdAt)
            : new Date();
          task.doneAt = data.doneAt ? new Date(data.doneAt) : null;
          task.dueDate = data.dueDate ? new Date(data.dueDate) : null;
          task.title = data.title;
          task.memo = data.memo;
          task.done = data.done;
          task.categories = data.categories;
          task.repeatPeriod = data.repeatPeriod;
          task.repeatStartAt = data.repeatStartAt
            ? new Date(data.repeatStartAt)
            : null;

          const updated = { ...taskMap };
          let prevTask = taskMap[data.prevTaskId];
          if (prevTask) {
            prevTask.next = task;
            updated[prevTask.id] = prevTask;
          }
          task.prev = prevTask;
          updated[task.id] = task;

          resolve({ taskMap: updated });
        } else {
          console.error("failed to add task");
          reject();
        }
      })
  );
};

export const applyDeleteTask = ({ addPromise, success, data }) => {
  addPromise(
    (states) =>
      new Promise((resolve, reject) => {
        const { taskMap, categories } = states;
        if (success) {
          let delTaskId = data.tid;
          const newTaskMap = { ...taskMap };
          let origNext = newTaskMap[delTaskId]?.next;
          let origPrev = newTaskMap[delTaskId]?.prev;
          if (origNext) {
            origNext.prev = origPrev;
          }
          if (origPrev) {
            origPrev.next = origNext;
          }
          delete newTaskMap[delTaskId];
          resolve({ taskMap: newTaskMap });
        } else {
          console.error("failed to delete task");
          reject();
        }
      })
  );
};

export const applyUpdateTaskOrder = ({ addPromise, success, data }) => {
  addPromise(
    (states) =>
      new Promise((resolve, reject) => {
        const { taskMap, categories } = states;
        if (success) {
          const { tid: currentTaskId, targetTaskId, afterTarget } = data;

          const newTaskMap = { ...taskMap };
          const targetTask = newTaskMap[targetTaskId];
          const currentTask = newTaskMap[currentTaskId];
          const prevTask = currentTask.prev;
          const nextTask = currentTask.next;

          if (prevTask) prevTask.next = nextTask;
          if (nextTask) nextTask.prev = prevTask;

          if (afterTarget) {
            currentTask.prev = targetTask;
            currentTask.next = targetTask.next;
            if (targetTask.next) {
              targetTask.next.prev = currentTask;
            }
            targetTask.next = currentTask;
          } else {
            currentTask.next = targetTask;
            currentTask.prev = targetTask.prev;
            if (targetTask.prev) {
              targetTask.prev.next = currentTask;
            }
            targetTask.prev = currentTask;
          }

          resolve({ taskMap: newTaskMap });
        } else {
          console.error("failed to update task order");
          reject();
        }
      })
  );
};

export const applyUpdateTaskTitle = ({ addPromise, success, data }) => {
  addPromise(
    (states) =>
      new Promise((resolve, reject) => {
        const { taskMap, categories } = states;
        if (success) {
          const { tid, title } = data;
          const task = taskMap[tid];
          task.title = title;
          resolve({ ...taskMap, [tid]: task });
        } else {
          console.error("failed to update task title");
          reject();
        }
      })
  );
};

export const applyUpdateTaskDueDate = ({ addPromise, success, data }) => {
  addPromise(
    (states) =>
      new Promise((resolve, reject) => {
        const { taskMap, categories } = states;
        if (success) {
          let { tid, dueDate } = data;
          if (dueDate != null) {
            dueDate = new Date(dueDate);
          }

          const task = taskMap[tid];
          task.dueDate = dueDate;
          if (dueDate == null) {
            task.repeatPeriod = null;
            task.repeatStartAt = null;
          } else {
            task.repeatStartAt = dueDate;
          }

          resolve({ taskMap: { ...taskMap, [tid]: task } });
        } else {
          console.error("failed to update task due date");
          reject();
        }
      })
  );
};

export const applyUpdateTaskMemo = ({ addPromise, success, data }) => {
  addPromise(
    (states) =>
      new Promise((resolve, reject) => {
        const { taskMap, categories } = states;
        if (success) {
          const { tid, memo } = data;
          const task = taskMap[tid];
          task.memo = memo;
          resolve({ taskMap: { ...taskMap, [tid]: task } });
        } else {
          console.error("failed to update task memo");
          reject();
        }
      })
  );
};

export const applyUpdateTaskDone = ({
  addPromise,
  success,
  data,
  isRepeated,
  newDueDate,
}) => {
  addPromise(
    (states) =>
      new Promise((resolve, reject) => {
        const { taskMap, categories } = states;
        if (success) {
          const { tid, done, doneAt } = data;
          const task = taskMap[tid];
          if (isRepeated) {
            task.done = false;
            task.dueDate = new Date(newDueDate);
          } else {
            task.done = done;
            task.doneAt = doneAt;
          }
          resolve({ taskMap: { ...taskMap, [tid]: task } });
        } else {
          console.error("failed to update task done");
          reject();
        }
      })
  );
};

export const applyUpdateTaskRepeatPeriod = ({ addPromise, success, data }) => {
  addPromise(
    (states) =>
      new Promise((resolve, reject) => {
        const { taskMap, categories } = states;
        if (success) {
          const { tid, repeatPeriod } = data;
          const task = taskMap[tid];
          task.repeatPeriod = repeatPeriod;
          if (task.repeatStartAt == null) {
            task.repeatStartAt = task.dueDate;
          }
          resolve({ taskMap: { ...taskMap, [tid]: task } });
        } else {
          Toast.error("failed to update task repeat period");
          console.error("failed to update task repeat period");
          reject();
        }
      })
  );
};

export const applyCreateSubtask = ({ addPromise, success, data }) => {
  addPromise(
    (states) =>
      new Promise((resolve, reject) => {
        const { taskMap, categories } = states;
        if (success) {
          const { tid, sid, title, createdAt, doneAt, dueDate, done } = data;
          const subtask = new Subtask();
          subtask.id = sid;
          subtask.title = title;
          subtask.createdAt = new Date(createdAt);
          subtask.doneAt = doneAt ? new Date(doneAt) : null;
          subtask.dueDate = dueDate ? new Date(dueDate) : null;
          subtask.done = done;

          const task = taskMap[tid];
          task.addSubtask(subtask);

          resolve({ taskMap: { ...taskMap, [tid]: task } });
        } else {
          console.error("failed to add subtask");
          reject();
        }
      })
  );
};

export const applyDeleteSubtask = ({ addPromise, success, data }) => {
  addPromise(
    (states) =>
      new Promise((resolve, reject) => {
        const { taskMap, categories } = states;
        if (success) {
          const { tid, sid } = data;
          const task = taskMap[tid];
          task.deleteSubtask(sid);
          resolve({ taskMap: { ...taskMap, [tid]: task } });
        } else {
          console.error("failed to delete subtask");
          reject();
        }
      })
  );
};

export const applyUpdateSubtaskTitle = ({ addPromise, success, data }) => {
  addPromise(
    (states) =>
      new Promise((resolve, reject) => {
        const { taskMap, categories } = states;
        if (success) {
          const { tid, sid, title } = data;
          const task = taskMap[tid];
          const subtask = task.subtasks[sid];
          if (subtask == null) {
            console.error("subtask is null", tid, sid, title);
            return taskMap;
          }
          subtask.title = title;
          resolve({ taskMap: { ...taskMap, [tid]: task } });
        } else {
          console.error("failed to update subtask title");
          reject();
        }
      })
  );
};
export const applyUpdateSubtaskDueDate = ({ addPromise, success, data }) => {
  addPromise(
    (states) =>
      new Promise((resolve, reject) => {
        const { taskMap, categories } = states;
        if (success) {
          const { tid, sid, dueDate } = data;
          const task = taskMap[tid];
          const subtask = task.subtasks[sid];
          if (subtask == null) {
            console.error("subtask is null", tid, sid, dueDate);
            return taskMap;
          }
          subtask.dueDate = dueDate ? new Date(dueDate) : null;
          resolve({ taskMap: { ...taskMap, [tid]: task } });
        } else {
          console.error("failed to update subtask due date");
          reject();
        }
      })
  );
};
export const applyUpdateSubtaskDone = ({ addPromise, success, data }) => {
  addPromise(
    (states) =>
      new Promise((resolve, reject) => {
        const { taskMap, categories } = states;
        if (success) {
          const { tid, sid, done, doneAt } = data;
          const task = taskMap[tid];
          const subtask = task.subtasks[sid];
          if (subtask == null) {
            console.error("subtask is null", tid, sid, done, doneAt);
            return taskMap;
          }
          subtask.done = done;
          subtask.doneAt = doneAt ? new Date(doneAt) : null;
          resolve({ taskMap: { ...taskMap, [tid]: task } });
        } else {
          console.error("failed to update subtask done");
          reject();
        }
      })
  );
};
export const applyAddTaskCategory = ({ addPromise, success, data }) => {
  addPromise(
    (states) =>
      new Promise((resolve, reject) => {
        const { taskMap, categories } = states;
        if (success) {
          const { tid, cid } = data;
          const task = taskMap[tid];
          const category = categories[cid];
          task.addCategory(category);
          resolve({ taskMap: { ...taskMap, [tid]: task } });
        } else {
          console.error("failed to add task category");
          reject();
        }
      })
  );
};

export const applyDeleteTaskCategory = ({ addPromise, success, data }) => {
  addPromise(
    (states) =>
      new Promise((resolve, reject) => {
        const { taskMap, categories } = states;
        if (success) {
          const { tid, cid } = data;
          const task = taskMap[tid];
          task.deleteCategory(cid);
          resolve({ taskMap: { ...taskMap, [tid]: task } });
        } else {
          console.error("failed to delete task category");
          reject();
        }
      })
  );
};

export const applyCreateCategory = ({ addPromise, success, data }) => {
  addPromise(
    (states) =>
      new Promise((resolve, reject) => {
        const { taskMap, categories } = states;
        if (success) {
          const category = new Category();
          category.id = data.cid;
          category.title = data.title;
          category.secret = data.secret;
          category.locked = data.locked;
          category.color = data.color;
          category.createdAt = data.createdAt
            ? new Date(data.created_at)
            : null;
          resolve({ categories: { ...categories, [data.cid]: category } });
        } else {
          Toast.error("카테고리 생성에 실패했습니다.");
        }
        resolve();
      })
  );
};

export const applyDeleteCategory = ({ addPromise, success, data }) => {
  addPromise(
    (states) =>
      new Promise((resolve, reject) => {
        const { taskMap, categories } = states;
        if (success) {
          const newCategories = { ...categories };
          delete newCategories[data.cid];
          resolve({ categories: newCategories });
        } else {
          Toast.error("카테고리 삭제에 실패했습니다.");
        }
        resolve();
      })
  );
};
