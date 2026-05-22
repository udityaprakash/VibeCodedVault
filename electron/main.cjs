const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;
let mainWindow;

// Define storage file paths in the standard AppData folder
const userDataPath = app.getPath('userData');
const dbFilePath = path.join(userDataPath, 'prompts_db.json');

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
    width: 1240,
    height: 820,
    minWidth: 950,
    minHeight: 650,
    frame: false, // Frameless window
    transparent: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    backgroundColor: '#060709',
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
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
ipcMain.handle('db-get-all', () => {
  return readDatabase();
});

ipcMain.handle('db-save-prompt', (event, prompt) => {
  const db = readDatabase();
  const index = db.prompts.findIndex(p => p.id === prompt.id);
  
  const now = Date.now();
  if (index !== -1) {
    const existing = db.prompts[index];
    const prevContent = existing.content;
    
    let updatedVersions = [...(existing.versions || [])];
    let newVersion = existing.version || 1;
    
    if (prevContent !== prompt.content) {
      newVersion += 1;
      updatedVersions.push({
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
    const newPrompt = {
      ...prompt,
      id: prompt.id || 'p_' + Math.random().toString(36).substr(2, 9),
      version: 1,
      versions: [
        { version: 1, timestamp: now, content: prompt.content }
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
  db.categories = db.categories.filter(c => c.id !== categoryId);
  db.prompts = db.prompts.map(p => {
    if (p.categoryId === categoryId) {
      return { ...p, categoryId: null };
    }
    return p;
  });
  writeDatabase(db);
  return readDatabase();
});

// ==========================================
// IPC HANDLERS - EXPORT / IMPORT BACKUPS
// ==========================================
ipcMain.handle('db-export-backup', async () => {
  if (!mainWindow) return false;
  
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export PromptVault Backup',
    defaultPath: path.join(app.getPath('downloads'), 'promptvault_backup.json'),
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  });
  
  if (!filePath) return false;
  
  try {
    const db = readDatabase();
    fs.writeFileSync(filePath, JSON.stringify(db, null, 2), 'utf-8');
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
    
    if (backupData.categories && backupData.prompts) {
      writeDatabase(backupData);
      return backupData;
    } else {
      console.error('Invalid backup file format');
      return false;
    }
  } catch (e) {
    console.error('Import failed:', e);
    return false;
  }
});
