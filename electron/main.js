const { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, Notification, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;
let mainWindow;
let tray = null;
let isQuitting = false;

// Define storage file paths in the standard AppData folder
const userDataPath = app.getPath('userData');
const dbFilePath = path.join(userDataPath, 'prompts_db.json');
const attachmentsPath = path.join(userDataPath, 'attachments');
if (!fs.existsSync(attachmentsPath)) {
  fs.mkdirSync(attachmentsPath, { recursive: true });
}

// Helper to seed initial high-quality prompts and categories
function getSeedData() {
  return {
    categories: [
      { id: '1', name: 'Coding', icon: 'Code', color: '#8B5CF6' },
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

function getPromptAttachmentFileNames(prompt) {
  if (!prompt || !Array.isArray(prompt.switches)) {
    return [];
  }

  return prompt.switches
    .filter(sw => sw && sw.type === 'multimedia' && typeof sw.value === 'string' && sw.value.trim())
    .map(sw => path.basename(sw.value.trim()));
}

function collectReferencedAttachmentNames(db) {
  const referencedNames = new Set();
  const promptGroups = [db?.prompts, db?.deletedPrompts];

  promptGroups.forEach(group => {
    if (!Array.isArray(group)) return;
    group.forEach(prompt => {
      getPromptAttachmentFileNames(prompt).forEach(fileName => referencedNames.add(fileName));
    });
  });

  return referencedNames;
}

function garbageCollectAttachments(db) {
  try {
    if (!fs.existsSync(attachmentsPath)) {
      return;
    }

    const referenced = collectReferencedAttachmentNames(db);
    const attachmentFiles = fs.readdirSync(attachmentsPath);

    console.log(`[GC] Starting garbage collection. Referenced files count: ${referenced.size}, Total files on disk: ${attachmentFiles.length}`);

    attachmentFiles.forEach(fileName => {
      if (!referenced.has(fileName)) {
        const fullPath = path.join(attachmentsPath, fileName);
        if (fs.existsSync(fullPath) && fs.lstatSync(fullPath).isFile()) {
          console.log(`[GC] Deleting unreferenced attachment: ${fileName}`);
          fs.unlinkSync(fullPath);
        }
      }
    });
  } catch (e) {
    console.error('Failed to garbage-collect attachments:', e);
  }
}

function readDatabase() {
  initDatabase();
  try {
    const dataStr = fs.readFileSync(dbFilePath, 'utf-8');
    const db = JSON.parse(dataStr);
    let databaseChanged = false;
    
    // Purge trash items older than 30 days
    if (db.deletedPrompts && Array.isArray(db.deletedPrompts)) {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const originalLength = db.deletedPrompts.length;
      db.deletedPrompts = db.deletedPrompts.filter(p => p.deletedAt && p.deletedAt > thirtyDaysAgo);
      if (db.deletedPrompts.length !== originalLength) {
        databaseChanged = true;
      }
    }

    if (databaseChanged) {
      writeDatabase(db);
    }
    return db;
  } catch (e) {
    console.error('Failed to read database, returning default seed:', e);
    return getSeedData();
  }
}

function writeDatabase(data) {
  try {
    garbageCollectAttachments(data);
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

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Open external links in default system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

function createTray() {
  if (tray) return;
  const iconBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAmUlEQVQ4T2NkoBAwUqifAWowf//fGEZGwlhExAjmYUA/A8b/DIwMhOFrICIEqGdgYGBgYGQoADL6Cgtu86D+gNQLwuwC1GgGBgZ+DA2P0NVAwUAM8GBo+P+fAczfD1SArwH9DP8ZGBkIuxGkBmxkQO+tIIwTMBa6BvxYGP7/Z2AkDAaLwzR0A0bQDRg2j2A1cIAPQyP6u3gBAMZqQfLszT7eAAAAAElFTkSuQmCC';
  const trayIcon = nativeImage.createFromDataURL(iconBase64);
  
  tray = new Tray(trayIcon);
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Open PromptVault', 
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      } 
    },
    { type: 'separator' },
    { 
      label: 'Exit', 
      click: () => {
        isQuitting = true;
        app.quit();
      } 
    }
  ]);
  
  tray.setToolTip('PromptVault Studio');
  tray.setContextMenu(contextMenu);
  
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function scanSchedules() {
  try {
    const db = readDatabase();
    const now = Date.now();
    let dbChanged = false;
    
    if (!db || !db.prompts) return;

    for (let i = 0; i < db.prompts.length; i++) {
      const prompt = db.prompts[i];
      
      // 1. Check Scheduled Deletes
      const deleteSw = prompt.switches?.find(s => s.type === 'delete');
      if (deleteSw && deleteSw.value) {
        const deleteTimeMs = new Date(deleteSw.value).getTime();
        if (!isNaN(deleteTimeMs) && deleteTimeMs <= now) {
          // Move to trash
          db.prompts.splice(i, 1);
          i--; // Adjust index since we removed an item
          if (!db.deletedPrompts) {
            db.deletedPrompts = [];
          }
          db.deletedPrompts = db.deletedPrompts.filter(p => p.id !== prompt.id);
          db.deletedPrompts.push({
            ...prompt,
            deletedAt: now
          });
          dbChanged = true;
          
          // Show notification
          if (Notification.isSupported()) {
            new Notification({
              title: 'Prompt Auto-Deleted',
              body: `Prompt "${prompt.title}" has been moved to the Recycle Bin.`,
            }).show();
          }
          continue;
        }
      }

      // 2. Check Reminders
      const reminderSw = prompt.switches?.find(s => s.type === 'reminder');
      if (reminderSw && reminderSw.value && reminderSw.value.dateTime) {
        const reminderTime = new Date(reminderSw.value.dateTime).getTime();
        if (!isNaN(reminderTime) && reminderTime <= now && !reminderSw.value.notified) {
          // Trigger native notification
          if (Notification.isSupported()) {
            new Notification({
              title: `Prompt Reminder: ${prompt.title}`,
              body: reminderSw.value.description || 'Scheduled reminder is active.'
            }).show();
          }
          
          // Update notified flag
          reminderSw.value.notified = true;
          dbChanged = true;
        }
      }
    }

    if (dbChanged) {
      writeDatabase(db);
      // Send update event to renderer
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('db-updated');
      }
    }
  } catch (e) {
    console.error('Error scanning background schedules:', e);
  }
}

if (process.platform === 'win32') {
  app.setAppUserModelId('com.promptvault.app');
}

// Ensure database exists
app.whenReady().then(() => {
  initDatabase();
  try {
    const db = readDatabase();
    garbageCollectAttachments(db);
  } catch (e) {
    console.error('Failed to run startup GC:', e);
  }
  createWindow();
  createTray();

  setInterval(scanSchedules, 10000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // Stay in tray, do not quit
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
ipcMain.handle('db-get-all', () => {
  return readDatabase();
});

ipcMain.handle('db-save-prompt', (event, prompt) => {
  const db = readDatabase();
  const index = db.prompts.findIndex(p => p.id === prompt.id);
  
  const now = Date.now();
  if (index !== -1) {
    // Update existing prompt
    const existing = db.prompts[index];
    const prevContent = existing.content;
    
    // Manage version history if content changed
    let updatedVersions = [...(existing.versions || [])];
    let newVersion = existing.version || 1;
    
    if (prevContent !== prompt.content) {
      newVersion += 1;
      updatedVersions.push({
        id: `${prompt.id || existing.id}-v${newVersion}-${now}`,
        version: newVersion,
        timestamp: now,
        content: prompt.content
      });
    }

    db.prompts[index] = {
      ...existing,
      ...prompt,
      version: newVersion,
      versions: updatedVersions,
      updatedAt: now
    };
  } else {
    // Create new prompt
    const newPrompt = {
      ...prompt,
      id: prompt.id || 'p_' + Math.random().toString(36).substr(2, 9),
      version: 1,
      versions: [
        { id: `${prompt.id || 'p'}-v1-${now}`, version: 1, timestamp: now, content: prompt.content }
      ],
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
      isPinned: prompt.isPinned || false,
      isFavorite: prompt.isFavorite || false
    };
    db.prompts.push(newPrompt);
  }
  
  writeDatabase(db);
  return readDatabase();
});

ipcMain.handle('db-delete-prompt', (event, promptId) => {
  const db = readDatabase();
  db.prompts = db.prompts.filter(p => p.id !== promptId);
  writeDatabase(db);
  return readDatabase();
});

ipcMain.handle('db-increment-usage', (event, promptId) => {
  const db = readDatabase();
  const index = db.prompts.findIndex(p => p.id === promptId);
  if (index !== -1) {
    db.prompts[index].usageCount = (db.prompts[index].usageCount || 0) + 1;
    writeDatabase(db);
  }
  return readDatabase();
});

ipcMain.handle('db-save-category', (event, category) => {
  const db = readDatabase();
  const index = db.categories.findIndex(c => c.id === category.id);
  
  if (index !== -1) {
    db.categories[index] = { ...db.categories[index], ...category };
  } else {
    const newCategory = {
      ...category,
      id: category.id || 'c_' + Math.random().toString(36).substr(2, 9),
    };
    db.categories.push(newCategory);
  }
  
  writeDatabase(db);
  return readDatabase();
});

ipcMain.handle('db-delete-category', (event, categoryId) => {
  const db = readDatabase();
  // Filter out the category
  db.categories = db.categories.filter(c => c.id !== categoryId);
  // Re-categorize items in this deleted category to general or uncategorized (null)
  db.prompts = db.prompts.map(p => {
    if (p.categoryId === categoryId) {
      return { ...p, categoryId: null };
    }
    return p;
  });
  writeDatabase(db);
  return readDatabase();
});

ipcMain.on('db-set-all', (event, data) => {
  if (!data || !Array.isArray(data.categories) || !Array.isArray(data.prompts)) {
    return;
  }

  writeDatabase({
    categories: data.categories,
    prompts: data.prompts,
  });
});

// ==========================================
// IPC HANDLERS - EXPORT / IMPORT BACKUPS
// ==========================================
function getReferencedAttachments(backupPayload) {
  const fileNames = [];
  if (backupPayload && backupPayload.data && backupPayload.data.prompts && Array.isArray(backupPayload.data.prompts.prompts)) {
    backupPayload.data.prompts.prompts.forEach(p => {
      if (Array.isArray(p.switches)) {
        p.switches.forEach(sw => {
          if (sw.type === 'multimedia' && typeof sw.value === 'string' && sw.value) {
            fileNames.push(sw.value);
          }
        });
      }
    });
  }
  return fileNames;
}

ipcMain.handle('db-select-save-attachment', async (event, promptId) => {
  if (!mainWindow) return null;
  try {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select File to Attach',
      properties: ['openFile']
    });
    if (!filePaths || filePaths.length === 0) {
      return null;
    }
    const sourcePath = filePaths[0];
    const randomKey = Math.random().toString(36).substr(2, 6);
    const baseOriginalName = path.basename(sourcePath);
    const uniqueName = `${promptId}_${randomKey}_${baseOriginalName}`;
    const targetPath = path.join(attachmentsPath, uniqueName);
    fs.copyFileSync(sourcePath, targetPath);
    return uniqueName;
  } catch (e) {
    console.error('Failed to select and save attachment:', e);
    return null;
  }
});

ipcMain.handle('db-open-attachment', async (event, fileName) => {
  try {
    const fullPath = path.join(attachmentsPath, path.basename(fileName));
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File does not exist: ${fullPath}`);
    }
    await shell.openPath(fullPath);
    return true;
  } catch (e) {
    console.error('Failed to open attachment:', e);
    return false;
  }
});

ipcMain.handle('db-export-backup', async (event, backupPayload, scope = 'workspace') => {
  if (!mainWindow) return false;

  const defaultFileName =
    scope === 'prompts' ? 'promptvault_prompts_backup.zip' : 'promptvault_workspace_backup.zip';
  
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export PromptVault Backup',
    defaultPath: path.join(app.getPath('downloads'), defaultFileName),
    filters: [{ name: 'Zip Files', extensions: ['zip'] }]
  });
  
  if (!filePath) return false;
  
  try {
    if (!backupPayload) {
      return false;
    }
    
    const AdmZip = require('adm-zip');
    const zip = new AdmZip();
    
    // Add backup.json
    const jsonStr = JSON.stringify(backupPayload, null, 2);
    zip.addFile('backup.json', Buffer.from(jsonStr, 'utf-8'));
    
    // Add referenced attachment files
    const attachedFiles = getReferencedAttachments(backupPayload);
    attachedFiles.forEach(fileName => {
      const fileAttachmentPath = path.join(attachmentsPath, fileName);
      if (fs.existsSync(fileAttachmentPath)) {
        zip.addLocalFile(fileAttachmentPath, 'prompt-files');
      }
    });
    
    zip.writeZip(filePath);
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
    filters: [{ name: 'Zip Files', extensions: ['zip'] }],
    properties: ['openFile']
  });
  
  if (!filePaths || filePaths.length === 0) return false;
  
  try {
    const AdmZip = require('adm-zip');
    const zip = new AdmZip(filePaths[0]);
    const zipEntries = zip.getEntries();
    
    let backupStr = null;
    
    zipEntries.forEach(entry => {
      if (entry.isDirectory) return;
      if (entry.entryName === 'backup.json') {
        backupStr = entry.getData().toString('utf8');
      } else {
        const baseName = path.basename(entry.entryName);
        const targetPath = path.join(attachmentsPath, baseName);
        fs.writeFileSync(targetPath, entry.getData());
      }
    });
    
    if (!backupStr) {
      throw new Error('Invalid backup file: backup.json not found inside zip.');
    }
    
    return backupStr;
  } catch (e) {
    console.error('Import failed:', e);
    return false;
  }
});

ipcMain.handle('app-get-readme', async () => {
  try {
    const readmePath = path.join(__dirname, '..', 'README.md');
    if (fs.existsSync(readmePath)) {
      return fs.readFileSync(readmePath, 'utf-8');
    }
    return 'PromptVault is a local-first Electron desktop app...';
  } catch (e) {
    console.error('Failed to read README.md:', e);
    return '';
  }
});
