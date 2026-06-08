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
  setAllData: (data) => ipcRenderer.send('db-set-all', data),
  
  // Backup / Import API
  exportBackup: (backupPayload, scope) => ipcRenderer.invoke('db-export-backup', backupPayload, scope),
  importBackup: () => ipcRenderer.invoke('db-import-backup'),
  // Reminders
  onReminderFired: (cb) => ipcRenderer.on('reminder-fired', (_e, payload) => cb(payload)),
  snoozeReminder: (promptId, switchId, minutes) => ipcRenderer.invoke('db-snooze-reminder', promptId, switchId, minutes),
  permanentlyDeletePrompt: (promptId) => ipcRenderer.invoke('db-permanently-delete-prompt', promptId),
  restorePrompt: (promptId) => ipcRenderer.invoke('db-restore-prompt', promptId),
  getPendingReminders: () => ipcRenderer.invoke('db-get-pending-reminders'),
  markReminderFired: (promptId, switchId) => ipcRenderer.invoke('db-mark-reminder-fired', promptId, switchId),
});
