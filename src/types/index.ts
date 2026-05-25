export interface PromptVersion {
  id?: string;
  version: number;
  timestamp: number;
  content: string;
}

export interface Prompt {
  id: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
  categoryId: string | null;
  model: string;
  isPinned: boolean;
  isFavorite: boolean;
  version: number;
  versions: PromptVersion[];
  createdAt: number;
  updatedAt: number;
  usageCount: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface DatabaseData {
  categories: Category[];
  prompts: Prompt[];
}

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseUrl: string;
  releaseNotes?: string;
  publishedAt?: string | null;
  assetName?: string | null;
  assetUrl?: string | null;
}

export interface UpdateInstallResult {
  success: boolean;
  launchedInstaller?: boolean;
  message?: string;
  releaseUrl?: string;
}

export interface IElectronAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  getAllData: () => Promise<DatabaseData>;
  getAppVersion: () => Promise<string>;
  savePrompt: (prompt: Partial<Prompt> & { title: string; content: string }) => Promise<DatabaseData>;
  deletePrompt: (promptId: string) => Promise<DatabaseData>;
  incrementUsage: (promptId: string) => Promise<DatabaseData>;
  saveCategory: (category: Partial<Category> & { name: string }) => Promise<DatabaseData>;
  deleteCategory: (categoryId: string) => Promise<DatabaseData>;
  setAllData: (data: DatabaseData) => void;
  exportBackup: (backupPayload: unknown) => Promise<boolean>;
  importBackup: () => Promise<string | false>;
  checkForUpdates: () => Promise<UpdateInfo | null>;
  updateNow: () => Promise<UpdateInstallResult>;
  installUpdate: () => Promise<UpdateInstallResult>;
  onUpdateAvailable: (cb: (info: any) => void) => void;
  onUpdateNotAvailable: (cb: (info: any) => void) => void;
  onUpdateDownloadProgress: (cb: (progress: any) => void) => void;
  onUpdateDownloaded: (cb: (info: any) => void) => void;
  onUpdateError: (cb: (err: any) => void) => void;
  onUpdateInstallStarted: (cb: (info: any) => void) => void;
  onUpdateInstallError: (cb: (err: any) => void) => void;
  getInstallErrorLog: () => Promise<string | null>;
}

declare global {
  interface Window {
    api: IElectronAPI;
  }
}
