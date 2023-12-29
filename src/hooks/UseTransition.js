import Task from "../objects/Task";
import Category from "../objects/Category";
import Subtask from "../objects/Subtask";

const TYPES = {
  OP_CREATE_TASK: 100,
  OP_DELETE_TASK: 101,
  OP_UPDATE_TASK_NEXT: 102,
  OP_UPDATE_TASK_TITLE: 103,
  OP_UPDATE_TASK_DUE_DATE: 104,
  OP_UPDATE_TASK_MEMO: 105,
  OP_UPDATE_TASK_DONE: 106,
  OP_UPDATE_TASK_DONE_AT: 107,
  OP_UPDATE_TASK_REPEAT_PERIOD: 108,
  OP_UPDATE_TASK_REPEAT_START_AT: 109,

  OP_CREATE_TASK_CATEGORY: 200,
  OP_DELETE_TASK_CATEGORY: 201,

  OP_CREATE_SUBTASK: 300,
  OP_DELETE_SUBTASK: 301,
  OP_UPDATE_SUBTASK_TITLE: 302,
  OP_UPDATE_SUBTASK_DUE_DATE: 303,
  OP_UPDATE_SUBTASK_DONE: 304,
  OP_UPDATE_SUBTASK_DONE_AT: 305,

  OP_CREATE_CATEGORY: 400,
  OP_DELETE_CATEGORY: 401,
  OP_UPDATE_CATEGORY_COLOR: 402,
};

/**
 * @param addPromise {Function}
 * @param transitions {Array<Object>}
 */
export const applyTransitions = (addPromise, transitions) => {
  addPromise(async (states) => {
    let newStates = {...states};
    for (let transition of transitions) {
      const {operation: opcode, params} = transition;
      const updates = await applyTransition(newStates, opcode, params);

      const opName = opcodeName(opcode);
      console.debug(
        `Transition applied: ${opName} (${opcode})`,
        params,
        updates
      );
      for (let key in updates) {
        newStates[key] = {...updates[key]};
      }
    }
    return newStates;
  });
};

const applyTransition = async (states, opcode, params) => {
  try {
    switch (opcode) {
      case TYPES.OP_CREATE_TASK:
        return createTask(states, params);
      case TYPES.OP_DELETE_TASK:
        return deleteTask(states, params);
      case TYPES.OP_UPDATE_TASK_NEXT:
        return updateTaskNext(states, params);
      case TYPES.OP_UPDATE_TASK_TITLE:
        return updateTaskTitle(states, params);
      case TYPES.OP_UPDATE_TASK_DUE_DATE:
        return updateTaskDueDate(states, params);
      case TYPES.OP_UPDATE_TASK_MEMO:
        return updateTaskMemo(states, params);
      case TYPES.OP_UPDATE_TASK_DONE:
        return updateTaskDone(states, params);
      case TYPES.OP_UPDATE_TASK_DONE_AT:
        return updateTaskDoneAt(states, params);
      case TYPES.OP_UPDATE_TASK_REPEAT_PERIOD:
        return updateTaskRepeatPeriod(states, params);
      case TYPES.OP_UPDATE_TASK_REPEAT_START_AT:
        return updateTaskRepeatStartAt(states, params);
      case TYPES.OP_CREATE_TASK_CATEGORY:
        return createTaskCategory(states, params);
      case TYPES.OP_DELETE_TASK_CATEGORY:
        return deleteTaskCategory(states, params);
      case TYPES.OP_CREATE_SUBTASK:
        return createSubtask(states, params);
      case TYPES.OP_DELETE_SUBTASK:
        return deleteSubtask(states, params);
      case TYPES.OP_UPDATE_SUBTASK_TITLE:
        return updateSubtaskTitle(states, params);
      case TYPES.OP_UPDATE_SUBTASK_DUE_DATE:
        return updateSubtaskDueDate(states, params);
      case TYPES.OP_UPDATE_SUBTASK_DONE:
        return updateSubtaskDone(states, params);
      case TYPES.OP_UPDATE_SUBTASK_DONE_AT:
        return updateSubtaskDoneAt(states, params);
      case TYPES.OP_CREATE_CATEGORY:
        return createCategory(states, params);
      case TYPES.OP_DELETE_CATEGORY:
        return deleteCategory(states, params);
      case TYPES.OP_UPDATE_CATEGORY_COLOR:
        return updateCategoryColor(states, params);
      default:
        console.error(`Unknown transition opcode: ${opcode}`, params);
        break;
    }
  } catch (err) {
    console.error(err);
  }
  return states;
};

const createTask = (states, params) => {
  const {taskMap} = states;
  const uTaskMap = {...taskMap};

  const {
    categories,
    createdAt,
    done,
    doneAt,
    dueDate,
    memo,
    repeatPeriod,
    repeatStartAt,
    tid,
    title,
  } = params;

  const task = new Task();
  task.categories = categories;
  task.createdAt = clearDate(createdAt);
  task.done = clearBool(done);
  task.doneAt = clearDate(doneAt);
  task.dueDate = clearDate(dueDate);
  task.memo = memo;
  task.repeatPeriod = clearConst(repeatPeriod);
  task.repeatStartAt = clearDate(repeatStartAt);
  task.id = tid;
  task.title = title;

  console.debug(`create task`, task);
  uTaskMap[tid] = task;
  return {taskMap: uTaskMap};
};

const deleteTask = (states, params) => {
  const {taskMap} = states;
  const uTaskMap = {...taskMap};

  const {tid} = params;

  delete uTaskMap[tid];
  console.debug(`delete task`, tid);
  return {taskMap: uTaskMap};
};

const updateTaskNext = (states, params) => {
  const {taskMap} = states;
  const uTaskMap = {...taskMap};

  const {tid, next} = params;

  const task = uTaskMap[tid];
  task.next = uTaskMap[next];

  console.debug(`update task next`, task, next);
  uTaskMap[tid] = task;
  return {taskMap: uTaskMap};
};

const updateTaskTitle = (states, params) => {
  const {taskMap, categories: categoryMap} = states;
  const uTaskMap = {...taskMap};

  const {tid, title} = params;

  const task = uTaskMap[tid];
  task.title = title;

  console.debug(`update task title`, task, title);
  uTaskMap[tid] = task;
  return {taskMap: uTaskMap};
};

const updateTaskDueDate = (states, params) => {
  const {taskMap} = states;
  const uTaskMap = {...taskMap};

  const {tid, dueDate} = params;

  const task = uTaskMap[tid];
  task.dueDate = clearDate(dueDate);

  console.debug(`update task dueDate`, task, dueDate);
  uTaskMap[tid] = task;
  return {taskMap: uTaskMap};
};

const updateTaskMemo = (states, params) => {
  const {taskMap} = states;
  const uTaskMap = {...taskMap};

  const {tid, memo} = params;

  const task = uTaskMap[tid];
  task.memo = memo;

  console.debug(`update task memo`, task, memo);
  uTaskMap[tid] = task;
  return {taskMap: uTaskMap};
};

const updateTaskDone = (states, params) => {
  const {taskMap, categories: categoryMap} = states;
  const uTaskMap = {...taskMap};

  const {tid, done} = params;

  const task = uTaskMap[tid];
  task.done = clearBool(done);

  console.debug(`update task done`, task, done);
  uTaskMap[tid] = task;
  return {taskMap: uTaskMap};
};

const updateTaskDoneAt = (states, params) => {
  const {taskMap, categories: categoryMap} = states;
  const uTaskMap = {...taskMap};

  const {tid, doneAt} = params;

  const task = uTaskMap[tid];
  task.doneAt = clearDate(doneAt);

  console.debug(`update task doneAt`, task, doneAt);
  uTaskMap[tid] = task;
  return {taskMap: uTaskMap};
};

const updateTaskRepeatPeriod = (states, params) => {
  const {taskMap, categories: categoryMap} = states;
  const uTaskMap = {...taskMap};

  const {tid, repeatPeriod} = params;

  const task = uTaskMap[tid];
  task.repeatPeriod = clearConst(repeatPeriod);

  console.debug(`update task repeatPeriod`, task, repeatPeriod);
  uTaskMap[tid] = task;
  return {taskMap: uTaskMap};
};

const updateTaskRepeatStartAt = (states, params) => {
  const {taskMap, categories: categoryMap} = states;
  const uTaskMap = {...taskMap};

  const {tid, repeatStartAt} = params;

  const task = uTaskMap[tid];
  task.repeatStartAt = clearDate(repeatStartAt);

  console.debug(`update task repeatStartAt`, task, repeatStartAt);
  uTaskMap[tid] = task;
  return {taskMap: uTaskMap};
};

const createTaskCategory = (states, params) => {
  const {taskMap, categories: categoryMap} = states;
  const uTaskMap = {...taskMap};

  const {tid, cid} = params;

  const task = taskMap[tid];
  task.categories[cid] = true;

  uTaskMap[tid] = task;
  return {taskMap: uTaskMap};
};

const deleteTaskCategory = (states, params) => {
  const {taskMap, categories: categoryMap} = states;
  const uTaskMap = {...taskMap};

  const {tid, cid} = params;

  const task = taskMap[tid];
  delete task.categories[cid];

  uTaskMap[tid] = task;
  return {taskMap: uTaskMap};
};

const createSubtask = (states, params) => {
  const {taskMap, categories: categoryMap} = states;
  const uTaskMap = {...taskMap};

  const {createdAt, done, doneAt, dueDate, sid, tid, title} = params;

  const subtask = new Subtask();
  subtask.createdAt = clearDate(createdAt);
  subtask.done = clearBool(done);
  subtask.doneAt = clearDate(doneAt);
  subtask.dueDate = clearDate(dueDate);
  subtask.id = sid;
  subtask.title = title;

  const task = uTaskMap[tid];
  task.subtasks[sid] = subtask;

  uTaskMap[tid] = task;
  return {taskMap: uTaskMap};
};

const deleteSubtask = (states, params) => {
  const {taskMap, categories: categoryMap} = states;
  const uTaskMap = {...taskMap};

  const {sid, tid} = params;

  const task = taskMap[tid];
  delete task.subtasks[sid];

  uTaskMap[tid] = task;
  return {taskMap: uTaskMap};
};

const updateSubtaskTitle = (states, params) => {
  const {taskMap, categories: categoryMap} = states;
  const uTaskMap = {...taskMap};

  const {sid, tid, title} = params;

  const task = taskMap[tid];
  const subtask = task.subtasks[sid];
  subtask.title = title;

  uTaskMap[tid] = task;
  return {taskMap: uTaskMap};
};

const updateSubtaskDueDate = (states, params) => {
  const {taskMap, categories: categoryMap} = states;
  const uTaskMap = {...taskMap};

  const {sid, tid, dueDate} = params;

  const task = taskMap[tid];
  const subtask = task.subtasks[sid];
  subtask.dueDate = clearDate(dueDate);

  uTaskMap[tid] = task;
  return {taskMap: uTaskMap};
};

const updateSubtaskDone = (states, params) => {
  const {taskMap, categories: categoryMap} = states;
  const uTaskMap = {...taskMap};

  const {sid, tid, done} = params;

  const task = taskMap[tid];
  const subtask = task.subtasks[sid];
  subtask.done = clearBool(done);

  uTaskMap[tid] = task;
  return {taskMap: uTaskMap};
};

const updateSubtaskDoneAt = (states, params) => {
  const {taskMap, categories: categoryMap} = states;
  const uTaskMap = {...taskMap};

  const {sid, tid, doneAt} = params;

  const task = taskMap[tid];
  const subtask = task.subtasks[sid];
  subtask.doneAt = clearDate(doneAt);

  uTaskMap[tid] = task;
  return {taskMap: uTaskMap};
};

const createCategory = (states, params) => {
  const {categories: categoryMap} = states;
  const uCategoryMap = {...categoryMap};

  const {cid, createdAt, title} = params;

  const category = new Category();
  category.id = cid;
  category.createdAt = clearDate(createdAt);
  category.title = title;

  console.debug(`create category`, category);
  uCategoryMap[cid] = category;
  return {categories: uCategoryMap};
};

const deleteCategory = (states, params) => {
  const {categories: categoryMap} = states;
  const uCategoryMap = {...categoryMap};

  const {cid} = params;

  delete uCategoryMap[cid];
  console.debug(`delete category`, cid);
  return {categories: uCategoryMap};
};

const updateCategoryColor = (states, params) => {
  const {categories: categoryMap} = states;
  const uCategoryMap = {...categoryMap};

  const {cid, color} = params;

  const category = uCategoryMap[cid];
  category.color = color;

  console.debug(`update category color`, category, color);
  uCategoryMap[cid] = category;
  return {categories: uCategoryMap};
};

/* -------------------------- utils -------------------------- */

const clearDate = (date) => {
  return date ? new Date(date) : null;
};

const clearBool = (bool) => {
  return bool == true;
};

const clearConst = (constValue) => {
  if (constValue == null) return null;
  if (constValue === "") return null;
  return constValue;
};

const opcodeName = (opcode) => {
  for (const key in TYPES) {
    if (TYPES[key] === opcode) {
      return key;
    }
  }
  return "UNKNOWN";
};
