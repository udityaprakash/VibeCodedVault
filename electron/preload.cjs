const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Window Controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Database API
  getAllData: () => ipcRenderer.invoke('db-get-all'),
  getAppVersion: () => ipcRenderer.invoke('app-get-version'),
  savePrompt: (prompt) => ipcRenderer.invoke('db-save-prompt', prompt),
  deletePrompt: (promptId) => ipcRenderer.invoke('db-delete-prompt', promptId),
  incrementUsage: (promptId) => ipcRenderer.invoke('db-increment-usage', promptId),
  saveCategory: (category) => ipcRenderer.invoke('db-save-category', category),
  deleteCategory: (categoryId) => ipcRenderer.invoke('db-delete-category', categoryId),
  setAllData: (data) => ipcRenderer.send('db-set-all', data),
  
  // Backup / Import API
  exportBackup: (backupPayload) => ipcRenderer.invoke('db-export-backup', backupPayload),
  importBackup: () => ipcRenderer.invoke('db-import-backup'),

  // Application updates
  checkForUpdates: () => ipcRenderer.invoke('app-check-for-updates'),
  updateNow: () => ipcRenderer.invoke('app-update-now'),
  // Event subscriptions for update lifecycle
  onUpdateAvailable: (cb) => ipcRenderer.on('update-available', (evt, info) => cb(info)),
  onUpdateNotAvailable: (cb) => ipcRenderer.on('update-not-available', (evt, info) => cb(info)),
  onUpdateDownloadProgress: (cb) => ipcRenderer.on('update-download-progress', (evt, progress) => cb(progress)),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', (evt, info) => cb(info)),
  onUpdateError: (cb) => ipcRenderer.on('update-error', (evt, err) => cb(err)),
  installUpdate: () => ipcRenderer.invoke('app-install-update'),
});
