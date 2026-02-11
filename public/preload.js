const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getTimerState: () => ipcRenderer.invoke('get-timer-state'),
  setTimerState: (state) => ipcRenderer.invoke('set-timer-state', state),
  
  // Platform information
  platform: process.platform,
  
  // App version
  getVersion: () => process.env.npm_package_version || '1.0.0'
});