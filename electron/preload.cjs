const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Window Controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Database API
  getAllData: () => ipcRenderer.invoke('db-get-all'),
  savePrompt: (prompt) => ipcRenderer.invoke('db-save-prompt', prompt),
  deletePrompt: (promptId) => ipcRenderer.invoke('db-delete-prompt', promptId),
  incrementUsage: (promptId) => ipcRenderer.invoke('db-increment-usage', promptId),
  saveCategory: (category) => ipcRenderer.invoke('db-save-category', category),
  deleteCategory: (categoryId) => ipcRenderer.invoke('db-delete-category', categoryId),
  
  // Backup / Import API
  exportBackup: () => ipcRenderer.invoke('db-export-backup'),
  importBackup: () => ipcRenderer.invoke('db-import-backup'),
});
