const { WindowType } = require("../modules/constants");

class WindowPropertyFactory {
  constructor() {
    this.context = {
      webPreferences: {
        nodeIntegration: true,
        nodeIntegrationInSubFrames: true,
        nodeIntegrationInWorker: true,
        enableRemoteModule: true,
        webviewTag: true,
        webSecurity: true,
        devTools: true,
        spellcheck: false,
        contextIsolation: false,
        nativeWindowOpen: true,
        backgroundThrottling: false,
      },
    };
  }

  setProperty = (key, value) => {
    this.context[key] = value;
    return this;
  };

  build = () => {
    return this.context;
  };

  import = (property) => {
    this.context = Object.assign({}, this.context, property);
    return this;
  };

  width = (width) => {
    return this.setProperty("width", width);
  };

  height = (height) => {
    return this.setProperty("height", height);
  };

  minWidth = (minWidth) => {
    return this.setProperty("minWidth", minWidth);
  };

  minHeight = (minHeight) => {
    return this.setProperty("minHeight", minHeight);
  };

  xCoordinate = (xCoordinate) => {
    return this.setProperty("x", xCoordinate);
  };

  yCoordinate = (yCoordinate) => {
    return this.setProperty("y", yCoordinate);
  };

  center = (center) => {
    return this.setProperty("center", center);
  };

  show = (show) => {
    return this.setProperty("show", show);
  };

  frame = (frame) => {
    return this.setProperty("frame", frame);
  };

  resizable = (resizable) => {
    return this.setProperty("resizable", resizable);
  };

  parent = (parent) => {
    return this.setProperty("parent", parent);
  };

  modal = (modal) => {
    return this.setProperty("modal", modal);
  };

  transparent = (transparent) => {
    return this.setProperty("transparent", transparent);
  };

  backgroundThrottling = (backgroundThrottling) => {
    return this.setProperty("backgroundThrottling", backgroundThrottling);
  };

  partition = (partition) => {
    return this.setProperty("partition", partition);
  };

  windowType = (modalType) => {
    switch (modalType) {
      case WindowType.Modal:
        this.setProperty("modal", true);
        break;
      case WindowType.Modeless:
        this.setProperty("modal", false);
        break;
      default:
        console.system(`WindowType '${modalType}' is not valid input.`);
        break;
    }
    return this;
  };
}

module.exports = WindowPropertyFactory;
