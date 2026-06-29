const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const { spawn } = require('child_process');
const { Readable } = require('stream');

let autoUpdater;
let log;
try {
  // electron-updater is optional (dev vs packaged). Require if available.
  const updaterModule = require('electron-updater');
  autoUpdater = updaterModule.autoUpdater;
  log = require('electron-log');
  autoUpdater.logger = log;
  autoUpdater.autoDownload = false; // require explicit download
  log.info('electron-updater loaded');
} catch (e) {
  // Not available in dev environment or not installed; we'll keep the previous custom logic.
  autoUpdater = null;
  log = console;
  log.info && log.info('electron-updater not available, using fallback updater');
}

const isDev = !app.isPackaged;
let mainWindow;
let updateCheckInFlight = null;
let downloadedInstallerPath = null;

function cleanupOldInstallers() {
  try {
    const tempDir = os.tmpdir();
    const files = fs.readdirSync(tempDir);
    for (const file of files) {
      if (
        (file.startsWith('PromptVault-Setup-') && file.endsWith('.exe')) ||
        (file.startsWith('PromptVault-') && file.endsWith('.dmg'))
      ) {
        try {
          fs.unlinkSync(path.join(tempDir, file));
        } catch (e) {
          // ignore files that are currently locked
        }
      }
    }
  } catch (err) {
    if (log && log.error) log.error('Failed to cleanup old installers:', err);
  }
}

const GITHUB_OWNER = 'udityaprakash';
const GITHUB_REPO = 'VibeCodedVault';
const GITHUB_LATEST_RELEASE_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;
const GITHUB_RELEASES_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases?per_page=10`;
const GITHUB_USER_AGENT = 'PromptVault-Updater';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;

// Define storage file paths in the standard AppData folder
const userDataPath = app.getPath('userData');
const dbFilePath = path.join(userDataPath, 'prompts_db.json');
const installErrorLogPath = path.join(userDataPath, 'update-install-error.log');

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
    const db = JSON.parse(dataStr);
    
    // Purge trash items older than 30 days
    if (db.deletedPrompts && Array.isArray(db.deletedPrompts)) {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const originalLength = db.deletedPrompts.length;
      db.deletedPrompts = db.deletedPrompts.filter(p => p.deletedAt && p.deletedAt > thirtyDaysAgo);
      if (db.deletedPrompts.length !== originalLength) {
        writeDatabase(db);
      }
    }
    return db;
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

function getBackupFileName(backupPayload) {
  const hasPrompts = Boolean(backupPayload?.data?.prompts);
  const hasTheme = Boolean(backupPayload?.data?.theme);

  if (hasPrompts && hasTheme) return 'promptvault_workspace_backup.json';
  if (hasTheme) return 'promptvault_theme_backup.json';
  if (hasPrompts) return 'promptvault_prompts_backup.json';
  return 'promptvault_backup.json';
}

function normalizeVersionString(version) {
  return String(version || '').trim().replace(/^v/i, '');
}

function parseVersionParts(version) {
  return normalizeVersionString(version)
    .split('.')
    .map(part => {
      const parsed = Number.parseInt(part.replace(/[^0-9]/g, ''), 10);
      return Number.isNaN(parsed) ? 0 : parsed;
    });
}

function compareVersionStrings(left, right) {
  const leftParts = parseVersionParts(left);
  const rightParts = parseVersionParts(right);
  const length = Math.max(leftParts.length, rightParts.length, 3);

  for (let index = 0; index < length; index += 1) {
    const leftValue = leftParts[index] || 0;
    const rightValue = rightParts[index] || 0;

    if (leftValue > rightValue) return 1;
    if (leftValue < rightValue) return -1;
  }

  return 0;
}

function findWindowsInstallerAsset(assets) {
  if (!Array.isArray(assets)) {
    return null;
  }

  return (
    assets.find(asset => typeof asset?.name === 'string' && /setup.*\.exe$/i.test(asset.name))
    || assets.find(asset => typeof asset?.name === 'string' && /\.exe$/i.test(asset.name))
    || null
  );
}

function findMacInstallerAsset(assets) {
  if (!Array.isArray(assets)) {
    return null;
  }

  return (
    assets.find(asset => typeof asset?.name === 'string' && /\.dmg$/i.test(asset.name))
    || null
  );
}

function pickLatestRelease(releases) {
  if (!Array.isArray(releases)) {
    return null;
  }

  const sorted = releases
    .filter(release => release && release.draft !== true)
    .sort((left, right) => {
      const leftDate = new Date(left.published_at || left.created_at || 0).getTime();
      const rightDate = new Date(right.published_at || right.created_at || 0).getTime();
      return rightDate - leftDate;
    });

  return sorted[0] || null;
}

async function checkLatestRelease() {
  // Prefer electron-updater when available for consistent results
  if (autoUpdater) {
    try {
      const res = await autoUpdater.checkForUpdates();
      if (!res || !res.updateInfo || !res.cancellationToken) {
        // If no update, return null
        if (!res || !res.updateInfo || !res.updateInfo.version) return null;
      }

      const currentVersion = normalizeVersionString(app.getVersion());
      const latestVersion = normalizeVersionString(res.updateInfo.version || res.updateInfo.tag_name || '');

      if (!latestVersion || compareVersionStrings(latestVersion, currentVersion) <= 0) {
        return null;
      }

      return {
        currentVersion,
        latestVersion,
        releaseName: res.updateInfo.name || res.updateInfo.tag_name || `v${latestVersion}`,
        releaseUrl: res.updateInfo.html_url || null,
        releaseNotes: res.updateInfo.releaseNotes || res.updateInfo.body || '',
        publishedAt: res.updateInfo.publishedAt || null,
        assetName: null,
        assetUrl: null,
      };
    } catch (err) {
      log.error('autoUpdater check failed:', err);
      // fall through to previous GitHub fetch fallback
    }
  }

  if (updateCheckInFlight) {
    return updateCheckInFlight;
  }

  updateCheckInFlight = (async () => {
    const headers = {
      Accept: 'application/vnd.github+json',
      'User-Agent': GITHUB_USER_AGENT,
    };
    if (GITHUB_TOKEN) {
      headers.Authorization = `token ${GITHUB_TOKEN}`;
    }

    const response = await fetch(GITHUB_RELEASES_URL, {
      headers,
    });

    if (!response.ok) {
      // handle 403 (rate limit or auth) with clearer message
      if (response.status === 403) {
        const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
        const msg = `GitHub release check returned 403 (rate limit or auth). x-ratelimit-remaining=${rateLimitRemaining}`;
        log.error && log.error(msg);
        throw new Error(msg);
      }
      throw new Error(`GitHub release check failed with status ${response.status}`);
    }

    const releases = await response.json();
    const release = pickLatestRelease(releases);
    if (!release) {
      return null;
    }

    const currentVersion = normalizeVersionString(app.getVersion());
    const latestVersion = normalizeVersionString(release.tag_name || release.name || '');

    if (!latestVersion || compareVersionStrings(latestVersion, currentVersion) <= 0) {
      return null;
    }

    const asset = process.platform === 'darwin'
      ? findMacInstallerAsset(release.assets)
      : findWindowsInstallerAsset(release.assets);

    return {
      currentVersion,
      latestVersion,
      releaseName: release.name || release.tag_name || `v${latestVersion}`,
      releaseUrl: release.html_url,
      releaseNotes: release.body || '',
      publishedAt: release.published_at || null,
      assetName: asset?.name || null,
      assetUrl: asset?.browser_download_url || null,
    };
  })();

  try {
    return await updateCheckInFlight;
  } finally {
    updateCheckInFlight = null;
  }
}

async function downloadToFile(url, destinationPath) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/octet-stream',
      'User-Agent': GITHUB_USER_AGENT,
    },
  });

  if (!response.ok || !response.body) {
    throw new Error(`Failed to download update asset (${response.status})`);
  }

  await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });

  // Attempt to stream the response and report progress to renderer
  return new Promise((resolve, reject) => {
    const total = Number(response.headers.get('content-length')) || 0;
    let transferred = 0;
    const output = fs.createWriteStream(destinationPath);
    const reader = response.body.getReader();

    function pump() {
      reader.read().then(({ done, value }) => {
        if (done) {
          output.end(() => resolve());
          return;
        }

        try {
          const chunk = Buffer.from(value);
          transferred += chunk.length;
          output.write(chunk);

          // send progress event similar to electron-updater
          try {
            if (mainWindow && mainWindow.webContents) {
              const percent = total ? (transferred / total) * 100 : 0;
              mainWindow.webContents.send('update-download-progress', {
                percent: Math.round(percent),
                transferred,
                total,
              });
            }
          } catch (e) {
            // ignore
          }

          pump();
        } catch (err) {
          reject(err);
        }
      }).catch(err => reject(err));
    }

    reader.read().then(({ done, value }) => {
      if (done) {
        output.end(() => resolve());
        return;
      }
      const chunk = Buffer.from(value);
      transferred += chunk.length;
      output.write(chunk);
      try {
        if (mainWindow && mainWindow.webContents) {
          const percent = total ? (transferred / total) * 100 : 0;
          mainWindow.webContents.send('update-download-progress', {
            percent: Math.round(percent),
            transferred,
            total,
          });
        }
      } catch (e) {}
      pump();
    }).catch(err => reject(err));

    output.on('error', reject);
    output.on('finish', () => resolve());
  });
}

function launchInstaller(installerPath) {
  // Try spawning the installer directly. On Windows this can fail with EBUSY
  // if the file is locked by antivirus or another process. Retry a few
  // times with a short delay, then fall back to using shell.openPath.
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const trySpawn = async () => {
    if (process.platform === 'darwin') {
      // For macOS, we don't spawn, we just open the DMG using shell.openPath
      await shell.openPath(installerPath);
      return true;
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const child = spawn(installerPath, [], {
          detached: true,
          stdio: 'ignore',
        });
        child.unref();
        return true;
      } catch (err) {
        log.error && log.error(`spawn attempt ${attempt + 1} failed:`, err && err.code ? err.code : err);
        // If last attempt, rethrow so caller can handle logging
        if (attempt < 2) {
          // small backoff before retrying
          // eslint-disable-next-line no-await-in-loop
          await sleep(250 + attempt * 150);
          continue;
        }
        throw err;
      }
    }
    return false;
  };

  return trySpawn().catch(async (spawnErr) => {
    log.error && log.error('spawn failed for installer, falling back to shell.openPath:', spawnErr);
    try {
      // shell.openPath returns a promise with empty string on success
      await shell.openPath(installerPath);
      return true;
    } catch (openErr) {
      log.error && log.error('shell.openPath fallback failed:', openErr);
      throw spawnErr;
    }
  });
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
  cleanupOldInstallers();
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

ipcMain.handle('app-get-version', () => {
  return app.getVersion();
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
  const promptIndex = db.prompts.findIndex(p => p.id === promptId);
  if (promptIndex !== -1) {
    const [promptToDelete] = db.prompts.splice(promptIndex, 1);
    if (!db.deletedPrompts) {
      db.deletedPrompts = [];
    }
    // Avoid duplicates in trash
    db.deletedPrompts = db.deletedPrompts.filter(p => p.id !== promptId);
    db.deletedPrompts.push({
      ...promptToDelete,
      deletedAt: Date.now()
    });
    writeDatabase(db);
  }
  return readDatabase();
});

ipcMain.handle('db-restore-prompt', (event, promptId) => {
  const db = readDatabase();
  if (!db.deletedPrompts) {
    db.deletedPrompts = [];
  }
  const promptIndex = db.deletedPrompts.findIndex(p => p.id === promptId);
  if (promptIndex !== -1) {
    const [promptToRestore] = db.deletedPrompts.splice(promptIndex, 1);
    delete promptToRestore.deletedAt;
    
    // Check if it's already in active prompts to avoid duplicates
    if (!db.prompts.some(p => p.id === promptId)) {
      db.prompts.push(promptToRestore);
    }
    writeDatabase(db);
  }
  return readDatabase();
});

ipcMain.handle('db-delete-prompt-permanently', (event, promptId) => {
  const db = readDatabase();
  if (db.deletedPrompts) {
    db.deletedPrompts = db.deletedPrompts.filter(p => p.id !== promptId);
    writeDatabase(db);
  }
  return readDatabase();
});

ipcMain.handle('db-empty-trash', (event) => {
  const db = readDatabase();
  db.deletedPrompts = [];
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
  const sanitizedName = typeof category.name === 'string' ? category.name.trim().slice(0, 30) : '';
  
  if (index !== -1) {
    db.categories[index] = { ...db.categories[index], ...category, name: sanitizedName || db.categories[index].name };
  } else {
    const newCategory = {
      ...category,
      name: sanitizedName,
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
ipcMain.handle('db-export-backup', async (event, backupPayload) => {
  if (!mainWindow) return false;

  const defaultFileName = getBackupFileName(backupPayload);
  
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
    return backupStr;
  } catch (e) {
    console.error('Import failed:', e);
    return false;
  }
});

// ==========================================
// IPC HANDLERS - APPLICATION UPDATES
// ==========================================
ipcMain.handle('app-check-for-updates', async () => {
  try {
    return await checkLatestRelease();
  } catch (error) {
    log.error && log.error('Update check failed:', error);
    return null;
  }
});

ipcMain.handle('app-update-now', async () => {
  try {
    // If electron-updater is available, use its download + install flow
    if (autoUpdater) {
      const check = await autoUpdater.checkForUpdates();
      if (!check || !check.updateInfo || !check.updateInfo.version) {
        return { success: false, message: 'No update is currently available.' };
      }

      // Start download
      autoUpdater.downloadUpdate();

      // Return immediately; the renderer will be notified via events when download completes.
      return { success: true, launchedInstaller: false, message: 'Downloading update...' };
    }

    // Fallback: download file and save reference, launch later on app-install-update
    const releaseInfo = await checkLatestRelease();

    if (!releaseInfo) {
      return { success: false, message: 'No update is currently available.' };
    }

    if (!releaseInfo.assetUrl) {
      await shell.openExternal(releaseInfo.releaseUrl);
      return {
        success: true,
        launchedInstaller: false,
        message: 'Opened the latest release page in your browser.',
        releaseUrl: releaseInfo.releaseUrl,
      };
    }

    const isMac = process.platform === 'darwin';
    const installerName = isMac
      ? `PromptVault-${releaseInfo.latestVersion}-${Date.now()}.dmg`
      : `PromptVault-Setup-${releaseInfo.latestVersion}-${Date.now()}.exe`;
    const installerPath = path.join(os.tmpdir(), installerName);
    
    // Notify renderer that download is starting
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('update-download-progress', { percent: 0, transferred: 0, total: 0 });
    }
    
    try {
      await downloadToFile(releaseInfo.assetUrl, installerPath);
      downloadedInstallerPath = installerPath;
      
      // notify renderer that download completed
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('update-download-progress', { percent: 100, transferred: 0, total: 0 });
        mainWindow.webContents.send('update-downloaded', { version: releaseInfo.latestVersion, path: installerPath });
      }
    } catch (err) {
      log.error && log.error('downloadToFile failed:', err);
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('update-error', String(err));
      }
      return {
        success: false,
        message: 'Failed to download the update package.',
      };
    }

    return {
      success: true,
      launchedInstaller: false,
      message: 'Update downloaded and ready to install.',
      releaseUrl: releaseInfo.releaseUrl,
    };
  } catch (error) {
    log.error && log.error('Update flow failed:', error);
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('update-error', String(error));
    }
    return {
      success: false,
      message: 'Unable to start update download.',
    };
  }
});

// Wire autoUpdater events to renderer for progress and availability
if (autoUpdater) {
  autoUpdater.on('error', (err) => {
    log.error && log.error('autoUpdater error:', err);
    if (mainWindow && mainWindow.webContents) mainWindow.webContents.send('update-error', String(err));
  });

  autoUpdater.on('update-available', (info) => {
    log.info && log.info('update-available', info);
    if (mainWindow && mainWindow.webContents) mainWindow.webContents.send('update-available', info);
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info && log.info('update-not-available', info);
    if (mainWindow && mainWindow.webContents) mainWindow.webContents.send('update-not-available', info);
  });

  autoUpdater.on('download-progress', (progress) => {
    if (mainWindow && mainWindow.webContents) mainWindow.webContents.send('update-download-progress', progress);
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info && log.info('update-downloaded', info);
    if (mainWindow && mainWindow.webContents) mainWindow.webContents.send('update-downloaded', info);
    // Do not auto-install — wait for renderer confirmation to install so user can accept.
  });
}

// Renderer can request install after user confirmation
ipcMain.handle('app-install-update', async () => {
  try {
    if (autoUpdater) {
      // Notify renderer that install is starting
      try {
        if (mainWindow && mainWindow.webContents) mainWindow.webContents.send('update-install-started', {});
        // This will quit and install the downloaded update
        autoUpdater.quitAndInstall(false, true);
        return { success: true };
      } catch (err) {
        log.error && log.error('quitAndInstall failed:', err);
        try {
          const payload = `Timestamp: ${new Date().toISOString()}\nError: ${String(err)}\nStack: ${err && err.stack ? err.stack : 'n/a'}\n`;
          fs.writeFileSync(installErrorLogPath, payload, 'utf-8');
        } catch (writeErr) {
          log.error && log.error('Failed to write install error log:', writeErr);
        }
        if (mainWindow && mainWindow.webContents) mainWindow.webContents.send('update-install-error', String(err));
        return { success: false, message: String(err) };
      }
    }

    // Fallback: spawn the downloaded installer file and close the application
    if (!downloadedInstallerPath || !fs.existsSync(downloadedInstallerPath)) {
      const errMessage = 'No update package has been downloaded or the file is missing.';
      log.error && log.error(errMessage);
      if (mainWindow && mainWindow.webContents) mainWindow.webContents.send('update-install-error', errMessage);
      return { success: false, message: errMessage };
    }

    try {
      if (mainWindow && mainWindow.webContents) mainWindow.webContents.send('update-install-started', { installerPath: downloadedInstallerPath });
      
      await launchInstaller(downloadedInstallerPath);
      
      // Let the installer spawn and begin initialization, then close PromptVault
      setTimeout(() => {
        app.quit();
      }, 500);
      
      return { success: true };
    } catch (err) {
      log.error && log.error('launchInstaller failed:', err);
      try {
        const payload = `Timestamp: ${new Date().toISOString()}\nError: ${String(err)}\nStack: ${err && err.stack ? err.stack : 'n/a'}\n`;
        fs.writeFileSync(installErrorLogPath, payload, 'utf-8');
      } catch (writeErr) {
        log.error && log.error('Failed to write install error log:', writeErr);
      }
      if (mainWindow && mainWindow.webContents) mainWindow.webContents.send('update-install-error', String(err));
      return {
        success: false,
        message: 'Failed to launch installer.',
      };
    }
  } catch (err) {
    log.error && log.error('install update failed:', err);
    return { success: false, message: String(err) };
  }
});

// Allow renderer to read the last install error log
ipcMain.handle('app-get-install-error-log', async () => {
  try {
    if (!fs.existsSync(installErrorLogPath)) return null;
    const content = fs.readFileSync(installErrorLogPath, 'utf-8');
    return content;
  } catch (err) {
    log.error && log.error('Failed to read install error log:', err);
    return null;
  }
});

// Native non-blocking confirm dialog helper
ipcMain.handle('dialog-confirm', async (event, { message, detail, buttons, type }) => {
  if (!mainWindow) return false;
  try {
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: type || 'question',
      buttons: buttons || ['Yes', 'No'],
      defaultId: 0,
      cancelId: 1,
      title: 'Confirm Action',
      message,
      detail
    });
    return response === 0;
  } catch (e) {
    console.error('Failed to show native confirm dialog:', e);
    return false;
  }
});

// MCP Local HTTP Server instance state
let mcpServerInstance = null;
let mcpServerPort = 3015;

function stopMcpServer() {
  if (mcpServerInstance) {
    mcpServerInstance.close();
    mcpServerInstance = null;
    console.log('MCP HTTP Server stopped.');
  }
}

function startMcpServer(port) {
  stopMcpServer();
  mcpServerPort = port;

  mcpServerInstance = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const request = JSON.parse(body);
          const response = await handleMcpRequest(request);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(response));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32700, message: "Parse error" },
            id: null
          }));
        }
      });
      return;
    }

    if (req.method === 'GET' && req.url === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'running', port: mcpServerPort }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  mcpServerInstance.listen(mcpServerPort, () => {
    console.log(`MCP HTTP Server listening on port ${mcpServerPort}`);
  }).on('error', (err) => {
    console.error('MCP Server start error:', err);
  });
}

async function handleMcpRequest(req) {
  const { method, params, id } = req;
  if (method === 'tools/list') {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        tools: [
          {
            name: "list_prompts",
            description: "Get all prompt templates currently stored in PromptVault.",
            inputSchema: { type: "object", properties: {} }
          },
          {
            name: "search_prompts",
            description: "Find prompts matching a search query using text search.",
            inputSchema: {
              type: "object",
              properties: {
                query: { type: "string", description: "Search query" }
              },
              required: ["query"]
            }
          },
          {
            name: "create_prompt",
            description: "Create a new prompt template in the workspace database.",
            inputSchema: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                content: { type: "string" },
                model: { type: "string", description: "Target AI Model compatibility tag" },
                tags: { type: "array", items: { type: "string" }, description: "Tags list" },
                categoryId: { type: "string", description: "Optional category ID" }
              },
              required: ["title", "description", "content"]
            }
          },
          {
            name: "delete_prompt",
            description: "Delete a prompt template by ID, moving it to the Recycle Bin.",
            inputSchema: {
              type: "object",
              properties: {
                promptId: { type: "string" }
              },
              required: ["promptId"]
            }
          },
          {
            name: "list_categories",
            description: "Get all categories in the workspace database.",
            inputSchema: { type: "object", properties: {} }
          },
          {
            name: "create_category",
            description: "Create a new category in the workspace database.",
            inputSchema: {
              type: "object",
              properties: {
                name: { type: "string" },
                color: { type: "string", description: "Hex color code" },
                icon: { type: "string", description: "Preset icon name (e.g. Code, Image, Zap, Target)" }
              },
              required: ["name"]
            }
          },
          {
            name: "delete_category",
            description: "Delete a category by ID.",
            inputSchema: {
              type: "object",
              properties: {
                categoryId: { type: "string" }
              },
              required: ["categoryId"]
            }
          },
          {
            name: "set_theme",
            description: "Change theme mode (light/dark) or accent color of the desktop application.",
            inputSchema: {
              type: "object",
              properties: {
                mode: { type: "string", enum: ["light", "dark"] },
                accentColor: { type: "string", description: "Hex color code" }
              }
            }
          }
        ]
      }
    };
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params || {};
    let resultText = '';

    try {
      if (name === 'list_prompts') {
        const db = readDatabase();
        resultText = JSON.stringify(db.prompts || []);
      } else if (name === 'search_prompts') {
        const db = readDatabase();
        const q = (args.query || '').toLowerCase();
        const matches = (db.prompts || []).filter(p =>
          p.title.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          p.content.toLowerCase().includes(q)
        );
        resultText = JSON.stringify(matches);
      } else if (name === 'create_prompt') {
        const db = readDatabase();
        const now = Date.now();
        const newPrompt = {
          id: 'p_' + Math.random().toString(36).substr(2, 9),
          title: args.title,
          description: args.description,
          content: args.content,
          model: args.model || 'General',
          tags: args.tags || [],
          categoryId: args.categoryId || null,
          version: 1,
          versions: [
            { id: `p-v1-${now}`, version: 1, timestamp: now, content: args.content }
          ],
          createdAt: now,
          updatedAt: now,
          usageCount: 0,
          isPinned: false,
          isFavorite: false
        };
        db.prompts.push(newPrompt);
        writeDatabase(db);
        if (mainWindow) mainWindow.webContents.send('db-updated');
        resultText = JSON.stringify({ success: true, prompt: newPrompt });
      } else if (name === 'delete_prompt') {
        const db = readDatabase();
        const promptIndex = db.prompts.findIndex(p => p.id === args.promptId);
        if (promptIndex !== -1) {
          const [promptToDelete] = db.prompts.splice(promptIndex, 1);
          if (!db.deletedPrompts) db.deletedPrompts = [];
          db.deletedPrompts = db.deletedPrompts.filter(p => p.id !== args.promptId);
          db.deletedPrompts.push({
            ...promptToDelete,
            deletedAt: Date.now()
          });
          writeDatabase(db);
          if (mainWindow) mainWindow.webContents.send('db-updated');
          resultText = JSON.stringify({ success: true });
        } else {
          resultText = JSON.stringify({ success: false, error: 'Prompt not found' });
        }
      } else if (name === 'list_categories') {
        const db = readDatabase();
        resultText = JSON.stringify(db.categories || []);
      } else if (name === 'create_category') {
        const db = readDatabase();
        const sanitizedName = (args.name || '').trim().slice(0, 30);
        const newCategory = {
          id: 'c_' + Math.random().toString(36).substr(2, 9),
          name: sanitizedName,
          color: args.color || '#8B5CF6',
          icon: args.icon || 'Zap',
          switches: []
        };
        db.categories.push(newCategory);
        writeDatabase(db);
        if (mainWindow) mainWindow.webContents.send('db-updated');
        resultText = JSON.stringify({ success: true, category: newCategory });
      } else if (name === 'delete_category') {
        const db = readDatabase();
        db.categories = db.categories.filter(c => c.id !== args.categoryId);
        db.prompts = db.prompts.map(p => p.categoryId === args.categoryId ? { ...p, categoryId: null } : p);
        writeDatabase(db);
        if (mainWindow) mainWindow.webContents.send('db-updated');
        resultText = JSON.stringify({ success: true });
      } else if (name === 'set_theme') {
        if (mainWindow) {
          mainWindow.webContents.send('set-theme-mode', {
            mode: args.mode,
            accentColor: args.accentColor
          });
        }
        resultText = JSON.stringify({ success: true });
      } else {
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: ${name}` }
        };
      }

      return {
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: resultText
            }
          ]
        }
      };
    } catch (err) {
      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32603, message: String(err) }
      };
    }
  }

  return {
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: "Method not found" }
  };
}

ipcMain.handle('update-ai-agent-settings', async (event, settings) => {
  try {
    if (settings && settings.serverEnabled && settings.enabled) {
      startMcpServer(settings.serverPort || 3015);
    } else {
      stopMcpServer();
    }
    return true;
  } catch (e) {
    console.error('Failed to update AI Agent Settings:', e);
    return false;
  }
});
