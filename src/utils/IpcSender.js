import * as uuid from "uuid";
import { colorize } from "./Common";
const electron = window.require("electron");
const { ipcRenderer } = electron;
const remote = window.require("@electron/remote");

const subscribed = {
  "system/subscribe": {},
};

const currentWebContents = remote.getCurrentWebContents();
const currentWindow = remote.getCurrentWindow();

const autoSubscribe = (topic) => {
  if (subscribed.hasOwnProperty(topic)) return;
  IpcSender.subscribe(topic);
  subscribed[topic] = true;
};

const senderSync = (topic, ...arg) => {
  autoSubscribe(topic);
  return ipcRenderer.sendSync(topic, null, ...arg);
};

const sender = (topic, callback, ...arg) => {
  autoSubscribe(topic);
  const sendId = uuid.v4();
  let listener = IpcSender.on(topic, (reqId, ...result) => {
    if (reqId !== sendId) return;
    IpcSender.off(topic, listener);
    return callback?.(...result);
  });
  return ipcRenderer.send(topic, sendId, ...arg);
};

const silentSender = (topic, param, ...arg) => {
  autoSubscribe(topic);
  return ipcRenderer.send(topic, param, ...arg);
};

const IpcSender = {
  system: {
    terminateSignal: () => {
      sender("system/terminate_signal", null, currentWindow.id);
    },
    relaunch: () => {
      sender("system/relaunch", null);
    },
    maximizeWindow: () => {
      sender("system/maximize_window", null, currentWindow.id);
    },
    minimizeWindow: () => {
      sender("system/minimize_window", null, currentWindow.id);
    },
    restoreWindow: () => {
      sender("system/restore_window", null, currentWindow.id);
    },
    closeWindow: () => {
      sender("system/close_window", null, currentWindow.id);
    },
    modal: (url, windowProperty = {}, parameter) => {
      sender("system/modal", null, currentWindow.id, url, windowProperty, parameter);
    },
    modeless: (url, windowProperty = {}, parameter) => {
      sender("system/modeless", null, currentWindow.id, url, windowProperty, parameter);
    },
    innerModal: (route, data) => {
      sender("system/inner-modal", null, route, data);
    },
    inputPromptModal: (title, placeholder, data, callback) => {
      IpcSender.system.innerModal("system/input-prompt", {
        title,
        placeholder,
        data,
        callback,
      });
    },
    closeInnerModal: (route, data) => {
      sender("system/close-inner-modal", null, route, data);
    },
    getComputerIdleTime: () => {
      sender("system/computer_idle_time");
    },
  },
  req: {
    task: {
      getTaskList: (callback) => {
        sender("task/getAllTaskList", callback);
      },
      getSubtaskList: (callback) => {
        sender("task/getAllSubtaskList", callback);
      },
      addTask: (task, callback) => {
        console.log(task);
        sender("task/addTask", callback, task);
      },
      deleteTask: (taskId, callback) => {
        sender("task/deleteTask", callback, taskId);
      },
      updateTaskTitle: (taskId, title, callback) => {
        sender("task/updateTaskTitle", callback, taskId, title);
      },
      updateTaskDueDate: (taskId, dueDate, callback) => {
        sender("task/updateTaskDueDate", callback, taskId, dueDate);
      },
      updateTaskMemo: (taskId, memo, callback) => {
        sender("task/updateTaskMemo", callback, taskId, memo);
      },
      updateTaskDone: (taskId, done, doneAt, callback) => {
        sender("task/updateTaskDone", callback, taskId, done, doneAt);
      },
      addSubtask: (subtask, taskId, callback) => {
        sender("task/addSubtask", callback, subtask, taskId);
      },
      deleteSubtask: (subtaskId, callback) => {
        sender("task/deleteSubtask", callback, subtaskId);
      },
      updateSubtaskTitle: (subtaskId, title, callback) => {
        sender("task/updateSubtaskTitle", callback, subtaskId, title);
      },
      updateSubtaskDueDate: (subtaskId, dueDate, callback) => {
        sender("task/updateSubtaskDueDate", callback, subtaskId, dueDate);
      },
      updateSubtaskDone: (subtaskId, done, doneAt, callback) => {
        sender("task/updateSubtaskDone", callback, subtaskId, done, doneAt);
      },
    },
  },
  test: {
    signal: (param) => {
      sender("test_signal", null, param);
    },
  },
  subscribe: (topics) => {
    sender("system/subscribe", null, currentWebContents.id, topics);
  },
  off: (topic, callback) => {
    return ipcRenderer.removeListener(topic, callback);
  },
  removeAllListener: () => {
    ipcRenderer.removeAllListeners();
  },
  sendCallback: (topic, data) => {
    sender("__callback__", null, topic, data);
  },
  // listen only for designated request ID (request ID unknown)
  on: (topic, callback) => {
    const originalCallback = callback;
    const newCallback = (e, reqId, ...data) => {
      if (reqId == null) return;
      console.log(
        `IpcRenderer <-- ${colorize.cyan(`[${reqId?.substr(0, 3) ?? "unknown"}]`)} ${colorize.magenta(topic)}`,
        ...data
      );
      originalCallback(reqId, ...data);
    };
    ipcRenderer.on(topic, newCallback);
    return newCallback;
  },
  // listen for all request ID
  onAll: (topic, callback) => {
    const originalCallback = callback;
    const newCallback = (e, reqId, ...data) => {
      // console.log(`IpcRenderer <-- ${topic}`, data);
      originalCallback(...data);
    };
    ipcRenderer.on(topic, newCallback);
    return newCallback;
  },
  once: (topic, callback) => {
    const originalCallback = callback.bind({});
    callback = (e, data) => {
      originalCallback(data);
    };
    ipcRenderer.once(topic, callback);
  },
  onFromPrevPage: (callback) => {
    IpcSender.on("__window_param__", callback);
  },
  emit: (...arg) => {
    sender(...arg);
  },
};

export default IpcSender;
