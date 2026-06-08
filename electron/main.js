const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;
let mainWindow;

// Define storage file paths in the standard AppData folder
const userDataPath = app.getPath('userData');
const dbFilePath = path.join(userDataPath, 'prompts_db.json');
const repository = require('./repository')(dbFilePath);

// Helper to seed initial high-quality prompts and categories
function getSeedData() {
  return {
    categories: [
      { id: '1', name: 'Coding', icon: 'Code', color: '#8B5CF6', switchInstances: [ { switchId: 'tile_color', value: '#8B5CF6', enabled: true, scope: 'category', updatedAt: Date.now() } ] },
      { id: '2', name: 'Image Generation', icon: 'Image', color: '#06B6D4' },
      { id: '3', name: 'Marketing', icon: 'Megaphone', color: '#10B981' },
      { id: '4', name: 'Writing & Creative', icon: 'PenTool', color: '#F43F5E' },
      { id: '5', name: 'Productivity', icon: 'Zap', color: '#F59E0B' },
    ],
    prompts: [
      {
        id: 'p1',
        title: 'Premium CSS Glassmorphism Generator',
        description: 'Creates high-end UI glassmorphism layout stylings with full responsive variables.',
        content: 'Act as a senior frontend engineer. Generate a modern, highly aesthetic Tailwind CSS glassmorphic panel style with custom CSS properties. Ensure it has backing colors of HSL tailored obsidian dark mode, custom violet neon glows (`0 0 20px rgba(139,92,246,0.3)`), and high-fidelity blur ratios. Include variables for:\n1. Width: {{width}}\n2. Backdrop Blur: {{blur_radius}}px\n3. Glow Intensity: {{glow}}',
        tags: ['Tailwind', 'CSS', 'Glassmorphism', 'UI'],
        categoryId: '1',
        model: 'Claude 3.5 Sonnet',
        isPinned: true,
        isFavorite: true,
        version: 1,
        versions: [
          { version: 1, timestamp: Date.now(), content: 'Act as a senior frontend engineer. Generate a modern, highly aesthetic Tailwind CSS glassmorphic panel style with custom CSS properties. Ensure it has backing colors of HSL tailored obsidian dark mode, custom violet neon glows (`0 0 20px rgba(139,92,246,0.3)`), and high-fidelity blur ratios. Include variables for:\n1. Width: {{width}}\n2. Backdrop Blur: {{blur_radius}}px\n3. Glow Intensity: {{glow}}' }
        ],
        createdAt: Date.now() - 86400000 * 2,
        updatedAt: Date.now() - 86400000 * 2,
        switchInstances: [ { switchId: 'tile_color', value: '#7C3AED', enabled: true, scope: 'prompt', updatedAt: Date.now() - 86400000 * 2 } ],
        usageCount: 14
      },
      {
        id: 'p2',
        title: 'Midjourney Realistic Cyberpunk Portrait',
        description: 'Generates a breathtaking photorealistic portrait of an android or human in a futuristic setting.',
        content: 'A close-up studio portrait of a {{gender}} cyberpunk agent with subtle neon bio-luminescent line patterns on the cheek, glowing electric blue eyes, silver cybernetic hair, wearing high-collar reflective slate techwear. Cinematic lighting, rain drops on glass, Unreal Engine 5 render, shot on 85mm lens, photorealistic, cinematic volumetric dust, dark cyberpunk street background, neon signs bokeh, high fidelity details, --ar 16:9 --style raw --v 6.0',
        tags: ['Midjourney', 'Art', 'Cyberpunk', 'Realistic'],
        categoryId: '2',
        model: 'Midjourney v6',
        isPinned: false,
        isFavorite: true,
        version: 1,
        versions: [
          { version: 1, timestamp: Date.now(), content: 'A close-up studio portrait of a {{gender}} cyberpunk agent with subtle neon bio-luminescent line patterns on the cheek, glowing electric blue eyes, silver cybernetic hair, wearing high-collar reflective slate techwear. Cinematic lighting, rain drops on glass, Unreal Engine 5 render, shot on 85mm lens, photorealistic, cinematic volumetric dust, dark cyberpunk street background, neon signs bokeh, high fidelity details, --ar 16:9 --style raw --v 6.0' }
        ],
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now() - 86400000,
        switchInstances: [],
        usageCount: 8
      },
      {
        id: 'p3',
        title: 'Interactive React Component Boilerplate Builder',
        description: 'Drafts a complete TypeScript React component with strict type safety, Tailwind CSS, and unit test specifications.',
        content: 'Create a robust, production-ready React component in TypeScript. Name the component: `{{componentName}}`.\nIt should accept these props: `{{propsList}}`.\nInclude:\n1. Full type interfaces.\n2. Clean Tailwind CSS layout styles.\n3. Lucide icons where applicable.\n4. Standard Jest/React Testing Library setup assertions.',
        tags: ['React', 'TypeScript', 'Tailwind', 'Component'],
        categoryId: '1',
        model: 'Gemini 1.5 Pro',
        isPinned: false,
        isFavorite: false,
        version: 2,
        versions: [
          { version: 1, timestamp: Date.now() - 50000, content: 'Create a React component named {{componentName}} using TailwindCSS.' },
          { version: 2, timestamp: Date.now(), content: 'Create a robust, production-ready React component in TypeScript. Name the component: `{{componentName}}`.\nIt should accept these props: `{{propsList}}`.\nInclude:\n1. Full type interfaces.\n2. Clean Tailwind CSS layout styles.\n3. Lucide icons where applicable.\n4. Standard Jest/React Testing Library setup assertions.' }
        ],
        createdAt: Date.now() - 3600000,
        updatedAt: Date.now(),
        usageCount: 22
      }
    ]
  };
}

// Database helper operations
function initDatabase() {
  if (!fs.existsSync(dbFilePath)) {
    try {
      fs.writeFileSync(dbFilePath, JSON.stringify(getSeedData(), null, 2), 'utf-8');
      console.log('Database initialized successfully at:', dbFilePath);
    } catch (e) {
      console.error('Failed to initialize database:', e);
    }
  }
}

function readDatabase() {
  initDatabase();
  try {
    const dataStr = fs.readFileSync(dbFilePath, 'utf-8');
    return JSON.parse(dataStr);
  } catch (e) {
    console.error('Failed to read database, returning default seed:', e);
    return getSeedData();
  }
}

function writeDatabase(data) {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('Failed to write database:', e);
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 950,
    minHeight: 650,
    frame: false, // Frameless window
    transparent: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    backgroundColor: '#0B0C10',
    show: false, // Don't show immediately to prevent flicker
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in dev mode
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Ensure database exists
app.whenReady().then(() => {
  initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ==========================================
// IPC HANDLERS - WINDOW CONTROLS
// ==========================================
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

// ==========================================
// IPC HANDLERS - DATABASE PERSISTENCE
// ==========================================
ipcMain.handle('db-get-all', () => repository.getAllData());

ipcMain.handle('db-save-prompt', (event, prompt) => repository.savePrompt(prompt));

ipcMain.handle('db-delete-prompt', (event, promptId) => repository.deletePrompt(promptId));

ipcMain.handle('db-increment-usage', (event, promptId) => repository.incrementUsage(promptId));

ipcMain.handle('db-save-category', (event, category) => repository.saveCategory(category));

ipcMain.handle('db-delete-category', (event, categoryId) => repository.deleteCategory(categoryId));

ipcMain.handle('db-permanently-delete-prompt', (event, promptId) => repository.permanentlyDeletePrompt(promptId));
ipcMain.handle('db-restore-prompt', (event, promptId) => repository.restorePrompt(promptId));
ipcMain.handle('db-snooze-reminder', (event, promptId, switchId, minutes) => repository.snoozeReminder(promptId, switchId, minutes));
ipcMain.handle('db-get-pending-reminders', () => repository.getPendingReminders());
ipcMain.handle('db-mark-reminder-fired', (event, promptId, switchId) => repository.markReminderFired(promptId, switchId));

ipcMain.on('db-set-all', (event, data) => repository.setAllData(data));

// ==========================================
// IPC HANDLERS - EXPORT / IMPORT BACKUPS
// ==========================================
ipcMain.handle('db-export-backup', async (event, backupPayload, scope = 'workspace') => {
  if (!mainWindow) return false;

  const defaultFileName =
    scope === 'prompts' ? 'promptvault_prompts_backup.json' : 'promptvault_workspace_backup.json';
  
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export PromptVault Backup',
    defaultPath: path.join(app.getPath('downloads'), defaultFileName),
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  });
  
  if (!filePath) return false;
  
  try {
    if (!backupPayload) {
      return false;
    }
    fs.writeFileSync(filePath, JSON.stringify(backupPayload, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('Export failed:', e);
    return false;
  }
});

ipcMain.handle('db-import-backup', async () => {
  if (!mainWindow) return false;
  
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Import PromptVault Backup',
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
    properties: ['openFile']
  });
  
  if (!filePaths || filePaths.length === 0) return false;
  
  try {
    const backupStr = fs.readFileSync(filePaths[0], 'utf-8');
    const backupData = JSON.parse(backupStr);

    // Basic validation for expected backup envelope
    if (backupData && backupData.kind && backupData.kind.indexOf('promptvault') === 0) {
      return { valid: true, payload: backupData };
    }

    return { valid: false, error: 'Unrecognized backup format' };
  } catch (e) {
    console.error('Import failed:', e);
    return false;
  }
});

// Reminder scheduler - checks every minute for pending reminders
setInterval(() => {
  try {
    if (!mainWindow) return;
    const pending = repository.getPendingReminders();
    pending.forEach(rem => {
      try {
        const notif = new Notification({ title: rem.title || 'Reminder', body: rem.description || '' });
        notif.show && notif.show();
      } catch (e) {
        // some electron versions support new Notification differently
        try { new Notification(rem.title || 'Reminder'); } catch {}
      }
      // mark fired so we don't re-notify
      repository.markReminderFired(rem.promptId, rem.switchId);
      // notify renderer
      try { mainWindow.webContents.send('reminder-fired', rem); } catch (e) {}
    });
  } catch (e) {
    console.error('Reminder scheduler error:', e);
  }
}, 60 * 1000);
