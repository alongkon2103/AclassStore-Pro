const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, callback) => {
    const subscription = (_event, ...args) => callback(...args);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },
  off: (channel, callback) => ipcRenderer.removeListener(channel, callback),
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
});
