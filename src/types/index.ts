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

export interface IElectronAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  getAllData: () => Promise<DatabaseData>;
  savePrompt: (prompt: Partial<Prompt> & { title: string; content: string }) => Promise<DatabaseData>;
  deletePrompt: (promptId: string) => Promise<DatabaseData>;
  incrementUsage: (promptId: string) => Promise<DatabaseData>;
  saveCategory: (category: Partial<Category> & { name: string }) => Promise<DatabaseData>;
  deleteCategory: (categoryId: string) => Promise<DatabaseData>;
  setAllData: (data: DatabaseData) => void;
  exportBackup: (backupPayload: unknown) => Promise<boolean>;
  importBackup: () => Promise<string | false>;
}

declare global {
  interface Window {
    api: IElectronAPI;
  }
}
