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

const topicHandlers = {};

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
  if (topic !== "system/subscribe") {
    console.debug(
      `IpcRenderer --> ${colorize.yellow(`[${sendId?.substring(0, 3) ?? "unknown"}]`)} ${colorize.magenta(topic)}`,
      ...arg
    );
  }
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
    isMaximizable: (callback) => {
      sender("system/isMaximizable", callback, currentWindow.id);
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
    system: {
      setAsHomeWindow: (callback) => {
        sender("system/setAsHomeWindow", callback);
      },
      setAsLoginWindow: (callback) => {
        sender("system/setAsLoginWindow", callback);
      },
      getLastTxUpdateTime: (callback) => {
        sender("system/lastTxUpdateTime", callback);
      },
      getLastBlockNumber: (callback) => {
        sender("system/lastBlockNumber", callback);
      },
      getWaitingBlockNumber: (callback) => {
        sender("system/waitingBlockNumber", callback);
      },
      isDatabaseClear: (callback) => {
        sender("system/isDatabaseClear", callback);
      },
      isMigratable: (callback) => {
        sender("system/isMigratable", callback);
      },
      migrateDatabase: (callback) => {
        sender("system/migrateDatabase", callback);
      },
      mismatchTxAcceptTheirs: (start, end, callback) => {
        sender("system/mismatchTxAcceptTheirs", callback, start, end);
      },
      mismatchTxAcceptMine: (start, end, callback) => {
        sender("system/mismatchTxAcceptMine", callback, start, end);
      },
      initializeState: (callback) => {
        sender("system/initializeState", callback);
      },
    },
    auth: {
      sendGoogleOauthResult: (result, callback) => {
        sender("auth/sendGoogleOauthResult", callback, result);
      },
      registerAuthInfoSync: async (userId, accessToken, refreshToken) => {
        return new Promise((resolve, reject) => {
          sender(
            "auth/registerAuthInfoSync",
            ({ success, data }) => {
              if (success) resolve(data);
              else reject(data);
            },
            userId,
            accessToken,
            refreshToken
          );
        });
      },
      deleteAuthInfoSync: async (userId) => {
        return new Promise((resolve, reject) => {
          sender(
            "auth/deleteAuthInfo",
            ({ success, data }) => {
              console.log("came");
              if (success) resolve(data);
              else reject(data);
            },
            userId
          );
        });
      },
      loadAuthInfoSync: async (userId) => {
        return new Promise((resolve, reject) => {
          sender(
            "auth/loadAuthInfoSync",
            ({ success, data }) => {
              if (success) resolve(data);
              else reject(data);
            },
            userId
          );
        });
      },
      isDatabaseReady: (userId, callback) => {
        sender("auth/isDatabaseReady", callback, userId);
      },
      initializeDatabase: (userId, callback) => {
        sender("auth/initializeDatabase", callback, userId);
      },
      signUpWithGoogleAuth: (signupRequest, callback) => {
        sender("auth/signUpWithGoogleAuth", callback, signupRequest);
      },
      signUp: (signupRequest, callback) => {
        sender("auth/signUp", callback, signupRequest);
      },
      login: (loginRequest, callback) => {
        sender("auth/login", callback, loginRequest);
      },
    },
    socket: {
      tryConnect: (userId, accessToken, refreshToken, callback) => {
        sender("socket/connect", callback, userId, accessToken, refreshToken);
      },
      tryDisconnect: (callback) => {
        sender("socket/disconnect", callback);
      },
    },
    task: {
      getTaskList: (callback) => {
        sender("task/getAllTaskList", callback);
      },
      getSubtaskList: (callback) => {
        sender("task/getAllSubtaskList", callback);
      },
      addTask: (task, callback) => {
        sender("task/addTask", callback, task);
      },
      deleteTask: (taskId, callback) => {
        sender("task/deleteTask", callback, taskId);
      },
      updateTaskOrder: (taskId, targetTaskId, afterTarget, callback) => {
        sender("task/updateTaskOrder", callback, taskId, targetTaskId, afterTarget);
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
      addTaskCategory: (taskId, categoryId, callback) => {
        sender("task/addTaskCategory", callback, taskId, categoryId);
      },
      deleteTaskCategory: (taskId, categoryId, callback) => {
        sender("task/deleteTaskCategory", callback, taskId, categoryId);
      },
      updateTaskRepeatPeriod: (taskId, repeatPeriod, callback) => {
        sender("task/updateTaskRepeatPeriod", callback, taskId, repeatPeriod);
      },
      createSubtask: (subtask, taskId, callback) => {
        sender("task/createSubtask", callback, subtask, taskId);
      },
      deleteSubtask: (taskId, subtaskId, callback) => {
        sender("task/deleteSubtask", callback, taskId, subtaskId);
      },
      updateSubtaskTitle: (taskId, subtaskId, title, callback) => {
        sender("task/updateSubtaskTitle", callback, taskId, subtaskId, title);
      },
      updateSubtaskDueDate: (taskId, subtaskId, dueDate, callback) => {
        sender("task/updateSubtaskDueDate", callback, taskId, subtaskId, dueDate);
      },
      updateSubtaskDone: (taskId, subtaskId, done, doneAt, callback) => {
        sender("task/updateSubtaskDone", callback, taskId, subtaskId, done, doneAt);
      },
    },
    category: {
      getCategoryList: (callback) => {
        sender("category/getCategoryList", callback);
      },
      createCategory: (category, callback) => {
        sender("category/createCategory", callback, category);
      },
      deleteCategory: (categoryId, callback) => {
        sender("category/deleteCategory", callback, categoryId);
      },
      checkCategoryPassword: (hashedPassword, callback) => {
        sender("category/checkCategoryPassword", callback, hashedPassword);
      },
      updateCategoryTitle: (categoryId, title, callback) => {
        sender("category/updateCategoryTitle", callback, categoryId, title);
      },
      getCategoryTasks: (categoryId, callback) => {
        sender("category/getCategoryTasks", callback, categoryId);
      },
    },
    tasks_categories: {
      getTasksCategoriesList: (callback) => {
        sender("tasks_categories/getTasksCategoriesList", callback);
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
  // unsubscribe: (topics) => {
  //   sender("system/unsubscribe", null, currentWebContents.id, topics);
  // },
  off: (topic, callback) => {
    return ipcRenderer.removeListener(topic, callback);
  },
  offAll: (topic) => {
    let handlers = topicHandlers[topic] ?? [];
    handlers.forEach((handler) => {
      ipcRenderer.removeListener(topic, handler);
    });
  },
  removeAllListeners: () => {
    console.warn(`Do not use removeAllListeners() as possible. It interferes with the internal logic.`);
    ipcRenderer.removeAllListeners();
  },
  sendCallback: (topic, data) => {
    sender("__callback__", null, topic, data);
  },
  // listen only for designated request ID (request ID unknown)
  on: (topic, callback) => {
    autoSubscribe(topic);
    const originalCallback = callback;
    const newCallback = (e, reqId, ...data) => {
      if (reqId == null) return;
      console.debug(
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
    autoSubscribe(topic);
    const newCallback = (e, reqId, ...data) => {
      console.debug(`IpcRenderer <-- ${colorize.yellow(`[ALL]`)} ${colorize.magenta(topic)}`, ...data);
      return callback(...data);
    };

    if (topicHandlers[topic] == null) topicHandlers[topic] = [];
    topicHandlers[topic].push(newCallback);
    ipcRenderer.on(topic, newCallback);
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
