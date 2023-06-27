import Task from "../objects/Task";
import Toast from "../molecules/Toast";
import Subtask from "../objects/Subtask";
import Category from "../objects/Category";

/**
 * @param addPromise {Function}
 * @param transitions {Array<Object>}
 */
export const applyTransitions = (addPromise, transitions) => {
  for (let transition of transitions) {
    const { operation: opcode, params } = transition;
    addPromise((states) => applyTransition(states, opcode, params));
  }
};

const applyTransition = async (states, opcode, params) => {
  switch (opcode) {
    // TODO :: apply transition
    // TODO :: fix constraints error on DB
    default:
      console.error(`Unknown transition opcode: ${opcode}`);
      break;
  }
  return states;
};
