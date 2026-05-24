import { useState, useEffect } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { PromptGrid } from './components/PromptGrid';
import { PromptEditor } from './components/PromptEditor';
import { CommandPalette } from './components/CommandPalette';
import type { Category, Prompt, DatabaseData } from './types';
import { 
  Search, Terminal, Plus, Zap, Bookmark, AlertTriangle, Layers
} from 'lucide-react';
import { PRESET_MODELS, getCustomModels, saveCustomModels } from './utils/aiModels';

type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'promptvault-theme-preferences';

type BackupScope = 'workspace' | 'prompts';

interface WorkspaceBackupPayload {
  kind: 'promptvault-backup';
  version: 2;
  scope: 'workspace';
  exportedAt: number;
  data: {
    categories: Category[];
    prompts: Prompt[];
    settings: {
      themeMode: ThemeMode;
      accentColor: string;
      customModels: string[];
    };
  };
}

interface PromptsBackupPayload {
  kind: 'promptvault-backup';
  version: 2;
  scope: 'prompts';
  exportedAt: number;
  data: {
    prompts: Prompt[];
  };
}

type BackupPayload = WorkspaceBackupPayload | PromptsBackupPayload;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeHex = (hex: string): string => {
  const cleaned = hex.trim().replace('#', '');
  if (cleaned.length === 3) {
    return `#${cleaned
      .split('')
      .map(char => char + char)
      .join('')
      .toUpperCase()}`;
  }
  if (cleaned.length === 6) {
    return `#${cleaned.toUpperCase()}`;
  }
  return '#8B5CF6';
};

const hexToRgb = (hex: string) => {
  const normalized = normalizeHex(hex);
  const value = normalized.replace('#', '');
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
};

const adjustHex = (hex: string, amount: number) => {
  const { r, g, b } = hexToRgb(hex);
  const toHex = (channel: number) => clamp(channel + amount, 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const isPromptArray = (value: unknown): value is Prompt[] =>
  Array.isArray(value);

const isCategoryArray = (value: unknown): value is Category[] =>
  Array.isArray(value);

const getVersionKey = (version: Prompt['versions'][number]) =>
  version.id || `${version.version}:${version.timestamp}:${version.content}`;

const comparePromptVersions = (
  left: Prompt['versions'][number] | undefined,
  right: Prompt['versions'][number] | undefined
) => {
  if (!left && !right) return 0;
  if (!left) return -1;
  if (!right) return 1;
  if (left.version !== right.version) {
    return left.version - right.version;
  }
  return left.timestamp - right.timestamp;
};

const normalizePromptVersions = (prompt: Prompt): Prompt['versions'] => {
  const versions = Array.isArray(prompt.versions) ? prompt.versions : [];
  const seen = new Set<string>();

  return versions
    .map(version => ({
      ...version,
      id: version.id || `${prompt.id}-v${version.version}-${version.timestamp}`,
    }))
    .filter(version => {
      const key = getVersionKey(version);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
};

const mergePromptHistory = (existing: Prompt | undefined, incoming: Prompt): Prompt | null => {
  const normalizedIncoming = {
    ...incoming,
    versions: normalizePromptVersions(incoming),
  };

  if (!existing) {
    return normalizedIncoming;
  }

  const normalizedExisting = {
    ...existing,
    versions: normalizePromptVersions(existing),
  };

  const existingLatest = normalizedExisting.versions[normalizedExisting.versions.length - 1];
  const incomingLatest = normalizedIncoming.versions[normalizedIncoming.versions.length - 1];
  const incomingIsNewer = comparePromptVersions(incomingLatest, existingLatest) > 0;

  if (existingLatest && incomingLatest && getVersionKey(existingLatest) === getVersionKey(incomingLatest)) {
    return null;
  }

  const mergedVersions = [...normalizedExisting.versions];
  const existingVersionKeys = new Set(mergedVersions.map(getVersionKey));

  normalizedIncoming.versions.forEach(version => {
    const key = getVersionKey(version);
    if (!existingVersionKeys.has(key)) {
      existingVersionKeys.add(key);
      mergedVersions.push(version);
    }
  });

  mergedVersions.sort((left, right) => {
    if (left.version !== right.version) {
      return left.version - right.version;
    }
    return left.timestamp - right.timestamp;
  });

  const latestVersion = mergedVersions[mergedVersions.length - 1];
  const activeSource = incomingIsNewer ? normalizedIncoming : normalizedExisting;

  return {
    ...activeSource,
    versions: mergedVersions,
    version: latestVersion?.version ?? normalizedIncoming.version,
    content: latestVersion?.content ?? normalizedIncoming.content,
    updatedAt: Math.max(normalizedExisting.updatedAt, normalizedIncoming.updatedAt),
    createdAt: Math.min(normalizedExisting.createdAt, normalizedIncoming.createdAt),
    usageCount: Math.max(normalizedExisting.usageCount || 0, normalizedIncoming.usageCount || 0),
  };
};

const mergePromptsByIdAndVersion = (base: Prompt[], incoming: Prompt[]) => {
  const merged = [...base];
  const byId = new Map(base.map(prompt => [prompt.id, prompt]));

  incoming.forEach(prompt => {
    const mergedPrompt = mergePromptHistory(byId.get(prompt.id), prompt);
    if (mergedPrompt === null) {
      return;
    }

    if (byId.has(prompt.id)) {
      const index = merged.findIndex(item => item.id === prompt.id);
      if (index !== -1) {
        merged[index] = mergedPrompt;
      }
    } else {
      merged.push(mergedPrompt);
    }

    byId.set(prompt.id, mergedPrompt);
  });

  return merged;
};

const createPromptVersion = (promptId: string, version: number, timestamp: number, content: string) => ({
  id: `${promptId}-v${version}-${timestamp}`,
  version,
  timestamp,
  content,
});

const mergeCategoriesWithoutOverwriting = (base: Category[], incoming: Category[]) => {
  const existingIds = new Set(base.map(item => item.id));
  const normalizedIncoming = incoming.map(item => {
    if (!existingIds.has(item.id)) {
      existingIds.add(item.id);
      return item;
    }

    return item;
  });

  return [...base, ...normalizedIncoming.filter(item => !base.some(existing => existing.id === item.id))];
};

const parseBackupPayload = (raw: unknown): { scope: BackupScope; prompts: Prompt[]; categories?: Category[]; settings?: WorkspaceBackupPayload['data']['settings'] } | null => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const backup = raw as Record<string, unknown>;

  if (backup.kind === 'promptvault-backup' && backup.version === 2 && backup.scope === 'workspace') {
    const data = backup.data as Record<string, unknown> | undefined;
    if (!data || !isPromptArray(data.prompts) || !isCategoryArray(data.categories)) {
      return null;
    }

    const settings = (data.settings && typeof data.settings === 'object')
      ? data.settings as WorkspaceBackupPayload['data']['settings']
      : undefined;

    return {
      scope: 'workspace',
      prompts: data.prompts,
      categories: data.categories,
      settings,
    };
  }

  if (backup.kind === 'promptvault-backup' && backup.version === 2 && backup.scope === 'prompts') {
    const data = backup.data as Record<string, unknown> | undefined;
    if (!data || !isPromptArray(data.prompts)) {
      return null;
    }

    return {
      scope: 'prompts',
      prompts: data.prompts,
    };
  }

  // Legacy format compatibility: treat as workspace backup
  if (isPromptArray(backup.prompts) && isCategoryArray(backup.categories)) {
    return {
      scope: 'workspace',
      prompts: backup.prompts,
      categories: backup.categories,
    };
  }

  // Legacy prompt-only format compatibility
  if (isPromptArray(backup.prompts)) {
    return {
      scope: 'prompts',
      prompts: backup.prompts,
    };
  }

  return null;
};

// Robust local fallback seed data for browser/quick testing
const FALLBACK_SEED: DatabaseData = {
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
      createdAt: Date.now() - 172800000,
      updatedAt: Date.now() - 172800000,
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
    }
  ]
};

function App() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Editor state
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  
  // Command Palette state
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Status Alerts notifications
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Global visual theme state
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const [accentColor, setAccentColor] = useState('#8B5CF6');
  const [isThemeSettingsOpen, setIsThemeSettingsOpen] = useState(false);

  // Load database on start
  useEffect(() => {
    loadDatabase();
  }, []);

  // Restore saved user theme preferences
  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as { mode?: ThemeMode; accent?: string };
      if (parsed.mode === 'light' || parsed.mode === 'dark') {
        setThemeMode(parsed.mode);
      }
      if (typeof parsed.accent === 'string') {
        setAccentColor(normalizeHex(parsed.accent));
      }
    } catch {
      localStorage.removeItem(THEME_STORAGE_KEY);
    }
  }, []);

  // Apply CSS variables + persist any preference updates
  useEffect(() => {
    const root = document.documentElement;
    const normalizedAccent = normalizeHex(accentColor);
    const { r, g, b } = hexToRgb(normalizedAccent);

    root.setAttribute('data-theme', themeMode);
    root.style.setProperty('--theme-accent', normalizedAccent);
    root.style.setProperty('--theme-accent-deep', adjustHex(normalizedAccent, -42));
    root.style.setProperty('--theme-accent-rgb', `${r}, ${g}, ${b}`);

    localStorage.setItem(
      THEME_STORAGE_KEY,
      JSON.stringify({ mode: themeMode, accent: normalizedAccent })
    );
  }, [accentColor, themeMode]);

  // Keyboard listener setups
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      // Ctrl + K / Cmd + K opens Spotlight search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
      
      // Ctrl + N / Cmd + N opens new prompt editor
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewPrompt();
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, []);

  const triggerNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const loadDatabase = async () => {
    try {
      if (window.api && window.api.getAllData) {
        const data = await window.api.getAllData();
        setPrompts(data.prompts || []);
        setCategories(data.categories || []);
      } else {
        // Fallback for browser previews
        console.warn('Electron window.api not detected, seeding mock browser memory.');
        setPrompts(FALLBACK_SEED.prompts);
        setCategories(FALLBACK_SEED.categories);
      }
    } catch (e) {
      console.error('Failed to load database:', e);
      triggerNotification('Failed to read prompts database.', 'error');
    }
  };

  const handleSelectPrompt = (promptId: string) => {
    const prompt = prompts.find(p => p.id === promptId);
    if (prompt) {
      setSelectedPrompt(prompt);
      setEditorOpen(true);
    }
  };

  const handleNewPrompt = () => {
    setSelectedPrompt(null);
    setEditorOpen(true);
  };

  const handleSavePrompt = async (promptData: Partial<Prompt> & { title: string; content: string }) => {
    try {
      if (window.api && window.api.savePrompt) {
        const data = await window.api.savePrompt(promptData);
        setPrompts(data.prompts);
        setCategories(data.categories);
        triggerNotification(promptData.id ? 'Prompt template saved.' : 'New prompt template created.');
      } else {
        // Fallback save mock memory
        if (promptData.id) {
          setPrompts(prev => prev.map(p => p.id === promptData.id ? { ...p, ...promptData, updatedAt: Date.now(), version: p.version + 1 } as Prompt : p));
        } else {
          const newPromptId = 'mock_' + Math.random().toString(36).substr(2, 9);
          const createdAt = Date.now();
          const newPrompt: Prompt = {
            ...promptData,
            id: newPromptId,
            version: 1,
            versions: [createPromptVersion(newPromptId, 1, createdAt, promptData.content)],
            createdAt,
            updatedAt: createdAt,
            usageCount: 0,
            isPinned: promptData.isPinned || false,
            isFavorite: promptData.isFavorite || false
          } as Prompt;
          setPrompts(prev => [newPrompt, ...prev]);
        }
        triggerNotification('Template saved locally (Web Memory).');
      }
      setEditorOpen(false);
    } catch (e) {
      console.error('Save failed:', e);
      triggerNotification('Failed to save prompt template.', 'error');
    }
  };

  const handleDeletePrompt = async (promptId: string) => {
    if (!confirm('Are you sure you want to permanently delete this template?')) return;
    try {
      if (window.api && window.api.deletePrompt) {
        const data = await window.api.deletePrompt(promptId);
        setPrompts(data.prompts);
        setCategories(data.categories);
        triggerNotification('Prompt template deleted.');
      } else {
        setPrompts(prev => prev.filter(p => p.id !== promptId));
        triggerNotification('Template deleted.');
      }
      setEditorOpen(false);
    } catch (e) {
      console.error('Delete failed:', e);
      triggerNotification('Failed to delete prompt template.', 'error');
    }
  };

  const handleToggleFavorite = async (prompt: Prompt) => {
    const updated = { ...prompt, isFavorite: !prompt.isFavorite };
    await handleSavePrompt(updated);
  };

  const handleTogglePin = async (prompt: Prompt) => {
    const updated = { ...prompt, isPinned: !prompt.isPinned };
    await handleSavePrompt(updated);
  };

  const handleAddCategory = async (name: string, icon: string, color: string) => {
    try {
      if (window.api && window.api.saveCategory) {
        const data = await window.api.saveCategory({ name, icon, color });
        setPrompts(data.prompts);
        setCategories(data.categories);
        triggerNotification(`Category "${name}" created.`);
      } else {
        const newCat: Category = {
          id: 'mock_cat_' + Math.random().toString(36).substr(2, 9),
          name,
          icon,
          color
        };
        setCategories(prev => [...prev, newCat]);
        triggerNotification(`Category "${name}" created locally.`);
      }
    } catch (e) {
      console.error('Add category failed:', e);
      triggerNotification('Failed to create category.', 'error');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;
    
    if (!confirm(`Are you sure you want to delete category "${cat.name}"? Any prompts inside will be re-grouped as uncategorized.`)) return;

    try {
      if (window.api && window.api.deleteCategory) {
        const data = await window.api.deleteCategory(categoryId);
        setPrompts(data.prompts);
        setCategories(data.categories);
        triggerNotification(`Category "${cat.name}" deleted.`);
      } else {
        setCategories(prev => prev.filter(c => c.id !== categoryId));
        setPrompts(prev => prev.map(p => p.categoryId === categoryId ? { ...p, categoryId: null } : p));
        triggerNotification('Category deleted locally.');
      }
      
      if (selectedCategoryId === categoryId) {
        setSelectedCategoryId(null);
      }
    } catch (e) {
      console.error('Delete category failed:', e);
      triggerNotification('Failed to delete category.', 'error');
    }
  };

  const handleExportBackup = async () => {
    try {
      const selectedScope: BackupScope = confirm(
        'Export entire workspace?\n\nOK = Entire Workspace (prompts, categories, theme, AI models)\nCancel = Prompts only'
      )
        ? 'workspace'
        : 'prompts';

      const normalizedAccent = normalizeHex(accentColor);
      const payload: BackupPayload =
        selectedScope === 'workspace'
          ? {
              kind: 'promptvault-backup',
              version: 2,
              scope: 'workspace',
              exportedAt: Date.now(),
              data: {
                categories,
                prompts,
                settings: {
                  themeMode,
                  accentColor: normalizedAccent,
                  customModels: getCustomModels(),
                },
              },
            }
          : {
              kind: 'promptvault-backup',
              version: 2,
              scope: 'prompts',
              exportedAt: Date.now(),
              data: {
                prompts,
              },
            };

      if (window.api && window.api.exportBackup) {
        const success = await window.api.exportBackup(payload, selectedScope);
        if (success) {
          triggerNotification(
            selectedScope === 'workspace'
              ? 'Workspace backup exported successfully.'
              : 'Prompts backup exported successfully.'
          );
        }
      } else {
        // Fallback file download for web browser previews
        const dataStr =
          'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute(
          'download',
          selectedScope === 'workspace'
            ? 'promptvault_workspace_backup_web.json'
            : 'promptvault_prompts_backup_web.json'
        );
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        triggerNotification(
          selectedScope === 'workspace'
            ? 'Workspace backup downloaded.'
            : 'Prompts backup downloaded.'
        );
      }
    } catch (e) {
      console.error('Export failed:', e);
      triggerNotification('Failed to export backup.', 'error');
    }
  };

  const persistDatabase = async (nextData: DatabaseData) => {
    if (window.api && window.api.setAllData) {
      try {
        window.api.setAllData(nextData);
      } catch (error) {
        console.warn('setAllData handler unavailable, falling back to in-memory update:', error);
      }
    }

    setPrompts(nextData.prompts);
    setCategories(nextData.categories);
  };

  const syncModelsFromPrompts = (importedPrompts: Prompt[], explicitCustomModels?: string[]) => {
    const modelNames = importedPrompts
      .map(item => item.model?.trim())
      .filter((item): item is string => Boolean(item));

    const promptCustomModels = modelNames.filter(
      modelName => !PRESET_MODELS.some(preset => preset.toLowerCase() === modelName.toLowerCase())
    );

    const requestedCustomModels = (explicitCustomModels || [])
      .map(model => model.trim())
      .filter(model => model.length > 0);

    const existing = getCustomModels();
    const merged = Array.from(new Set([...existing, ...promptCustomModels, ...requestedCustomModels]));
    saveCustomModels(merged);
  };

  const applyParsedImport = async (parsed: { scope: BackupScope; prompts: Prompt[]; categories?: Category[]; settings?: WorkspaceBackupPayload['data']['settings'] }) => {
    if (parsed.scope === 'workspace') {
      const applyWorkspace = confirm(
        'Detected a WORKSPACE backup.\n\nOK = Add workspace prompts/categories and apply theme + AI model settings\nCancel = Import prompts only'
      );

      if (applyWorkspace) {
        const nextPrompts = mergePromptsByIdAndVersion(prompts, parsed.prompts);
        const nextCategories = parsed.categories ? mergeCategoriesWithoutOverwriting(categories, parsed.categories) : categories;
        await persistDatabase({ prompts: nextPrompts, categories: nextCategories });

        if (parsed.settings) {
          if (parsed.settings.themeMode === 'light' || parsed.settings.themeMode === 'dark') {
            setThemeMode(parsed.settings.themeMode);
          }
          if (typeof parsed.settings.accentColor === 'string') {
            setAccentColor(normalizeHex(parsed.settings.accentColor));
          }
        }

        syncModelsFromPrompts(parsed.prompts, parsed.settings?.customModels);
        triggerNotification('Workspace backup imported and settings applied.');
        return;
      }
    }

    const mergedPrompts = mergePromptsByIdAndVersion(prompts, parsed.prompts);
    await persistDatabase({ prompts: mergedPrompts, categories });
    syncModelsFromPrompts(parsed.prompts);
    triggerNotification('Prompts imported successfully.');
  };

  const handleImportBackup = async () => {
    try {
      if (window.api && window.api.importBackup) {
        const importedRaw = await window.api.importBackup();
        if (importedRaw) {
          const parsed = parseBackupPayload(importedRaw);
          if (!parsed) {
            triggerNotification('Invalid backup format.', 'error');
            return;
          }
          await applyParsedImport(parsed);
        } else {
          triggerNotification('Import cancelled or failed.', 'info');
        }
      } else {
        // Simple file select prompt fallback for Web
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = async event => {
            try {
              const importedData = JSON.parse(event.target?.result as string);
              const parsed = parseBackupPayload(importedData);
              if (!parsed) {
                triggerNotification('Invalid JSON backup format.', 'error');
                return;
              }
              await applyParsedImport(parsed);
            } catch (err) {
              triggerNotification('Failed to parse JSON file.', 'error');
            }
          };
          reader.readAsText(file);
        };
        input.click();
      }
    } catch (e) {
      console.error('Import failed:', e);
      triggerNotification('Failed to import backup.', 'error');
    }
  };

  // ==========================================
  // SEARCH & FILTERING LOGIC
  // ==========================================
  const getFilteredPrompts = () => {
    let result = [...prompts];

    // 1. Filter by sidebar categories / special indicators
    if (selectedCategoryId === 'favorites') {
      result = result.filter(p => p.isFavorite);
    } else if (selectedCategoryId === 'pinned') {
      result = result.filter(p => p.isPinned);
    } else if (selectedCategoryId !== null) {
      result = result.filter(p => p.categoryId === selectedCategoryId);
    }

    // 2. Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.title.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        p.content.toLowerCase().includes(q) ||
        p.tags.some(tag => tag.toLowerCase().includes(q)) ||
        p.model.toLowerCase().includes(q)
      );
    }

    // 3. Sort logic: Pinned prompts always stay at the top
    return result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.updatedAt - a.updatedAt; // otherwise newest updated first
    });
  };

  const filteredPrompts = getFilteredPrompts();

  const handleToggleTheme = () => {
    setThemeMode(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleAccentColorChange = (newColor: string) => {
    setAccentColor(normalizeHex(newColor));
  };

  // Model statistics calculation
  const totalPrompts = prompts.length;
  const favoriteCount = prompts.filter(p => p.isFavorite).length;
  const pinnedCount = prompts.filter(p => p.isPinned).length;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-obsidian-950">
      {/* Title Bar */}
      <TitleBar
        themeMode={themeMode}
        accentColor={accentColor}
        settingsOpen={isThemeSettingsOpen}
        onToggleTheme={handleToggleTheme}
        onToggleSettings={() => setIsThemeSettingsOpen(prev => !prev)}
        onCloseSettings={() => setIsThemeSettingsOpen(false)}
        onAccentColorChange={handleAccentColorChange}
      />

      {/* Main App Window Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Glowing Background Grid Orbs */}
        <div className="absolute top-[10%] left-[20%] w-[400px] h-[400px] rounded-full bg-cyber-violet/5 blur-[120px] pointer-events-none animate-glow" />
        <div className="absolute bottom-[10%] right-[20%] w-[350px] h-[350px] rounded-full bg-cyber-cyan/5 blur-[120px] pointer-events-none animate-glow" style={{ animationDelay: '3s' }} />

        {/* Sidebar Component */}
        <Sidebar
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
        />

        {/* Main Dashboard Space */}
        <main className="flex-1 flex flex-col overflow-hidden px-8 py-6 relative z-10">
          
          {/* Header Action Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-obsidian-100 flex items-center gap-2">
                <Zap size={18} className="text-cyber-violet" />
                Prompt Workspace
              </h2>
              <p className="text-xs text-obsidian-400">
                Quickly search templates, parameters, and copy structured presets.
              </p>
            </div>

            <button
              onClick={handleNewPrompt}
              className="titlebar-nodrag flex items-center gap-1.5 bg-gradient-cyber font-semibold text-white px-4 py-2 rounded-lg text-xs shadow-glow-violet hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Plus size={14} />
              New Prompt <kbd className="hidden sm:inline bg-white/10 px-1.5 py-0.5 rounded text-[9px] font-mono ml-1.5">Ctrl+N</kbd>
            </button>
          </div>

          {/* Search Spotlight and Stats Header */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center gap-3 bg-obsidian-950/70 border border-obsidian-850 rounded-xl px-4 py-3 shadow-inner focus-within:border-cyber-violet/40 transition-colors">
              <Search className="text-obsidian-400 shrink-0" size={18} />
              
              <input
                type="text"
                placeholder="Search prompt titles, tags (#midjourney), descriptions, or model specifications..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-obsidian-100 placeholder-obsidian-600 focus:outline-none"
              />

              <button
                onClick={() => setCommandPaletteOpen(true)}
                className="titlebar-nodrag flex items-center gap-1.5 text-[10px] text-obsidian-400 bg-obsidian-900 border border-obsidian-850 hover:border-cyber-violet px-2.5 py-1.5 rounded-lg transition-all"
                title="Open Command Spotlight (Ctrl+K)"
              >
                <Terminal size={12} className="text-cyber-violet" />
                Command Menu
                <kbd className="bg-obsidian-850 border border-obsidian-800 px-1 py-0.5 rounded text-[8px] font-bold font-mono">Ctrl+K</kbd>
              </button>
            </div>

            {/* Quick Stats Banner */}
            <div className="flex flex-wrap items-center gap-4 text-[10px] text-obsidian-400">
              <div className="flex items-center gap-1.5 bg-obsidian-950/30 border border-obsidian-900 px-2.5 py-1 rounded-full">
                <Layers size={11} className="text-cyber-violet" />
                <span>Total: <strong className="text-obsidian-100">{totalPrompts}</strong> templates</span>
              </div>
              <div className="flex items-center gap-1.5 bg-obsidian-950/30 border border-obsidian-900 px-2.5 py-1 rounded-full">
                <Bookmark size={11} className="text-cyber-cyan" />
                <span>Pinned: <strong className="text-obsidian-100">{pinnedCount}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 bg-obsidian-950/30 border border-obsidian-900 px-2.5 py-1 rounded-full">
                <Bookmark size={11} className="text-yellow-500" />
                <span>Favorites: <strong className="text-obsidian-100">{favoriteCount}</strong></span>
              </div>
              {searchQuery && (
                <div className="text-cyber-cyan italic animate-pulse font-semibold ml-auto">
                  Showing {filteredPrompts.length} search matches
                </div>
              )}
            </div>
          </div>

          {/* Prompts Canvas Scrolling List */}
          <div className="flex-1 overflow-y-auto pr-1 pb-10">
            {filteredPrompts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[350px] text-obsidian-600 space-y-3">
                <AlertTriangle size={36} className="stroke-[1.5] text-obsidian-600" />
                <div className="text-center">
                  <span className="text-xs font-semibold block text-obsidian-400">No prompt templates found</span>
                  <span className="text-[10px] text-obsidian-600 block mt-1">Try broadening your search keywords or create a new template.</span>
                </div>
              </div>
            ) : (
              <PromptGrid
                prompts={filteredPrompts}
                categories={categories}
                onSelectPrompt={handleSelectPrompt}
                onToggleFavorite={handleToggleFavorite}
                onTogglePin={handleTogglePin}
              />
            )}
          </div>

        </main>

        {/* Global Slide-Out Editor Panel */}
        {editorOpen && (
          <PromptEditor
            prompt={selectedPrompt}
            categories={categories}
            onClose={() => setEditorOpen(false)}
            onSave={handleSavePrompt}
            onDelete={handleDeletePrompt}
          />
        )}

        {/* Floating Command Palette Overlay */}
        <CommandPalette
          isOpen={commandPaletteOpen}
          onClose={() => setCommandPaletteOpen(false)}
          prompts={prompts}
          categories={categories}
          onSelectPrompt={handleSelectPrompt}
          onNewPrompt={handleNewPrompt}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
        />

        {/* Action Copy/Save Toast Notification Banner */}
        {notification && (
          <div className="fixed bottom-6 right-6 bg-obsidian-950 border border-obsidian-800 text-obsidian-100 px-4 py-3 rounded-xl shadow-2xl z-[9999] flex items-center gap-2.5 animate-bounce">
            <div className={`w-2 h-2 rounded-full ${
              notification.type === 'success' ? 'bg-cyber-emerald shadow-[0_0_8px_#10B981]' : 
              notification.type === 'error' ? 'bg-cyber-rose shadow-[0_0_8px_#F43F5E]' : 'bg-cyber-cyan shadow-[0_0_8px_#06B6D4]'
            }`} />
            <span className="text-xs font-semibold">{notification.message}</span>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
