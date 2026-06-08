import type { Category, Prompt } from '../../types';
import type { SwitchInstance } from '../models/switch';

export type ThemeMode = 'light' | 'dark';

export interface PromptsBackupSection {
  prompts: Prompt[];
  categories: Category[];
}

export interface ThemeBackupSection {
  themeMode: ThemeMode;
  accentColor: string;
  customModels: string[];
}

export interface ParsedBackupPayload {
  prompts?: PromptsBackupSection;
  theme?: ThemeBackupSection;
}

export interface PromptQueryContext {
  prompts: Prompt[];
  categories: Category[];
  selectedCategoryId: string | null;
  searchQuery: string;
}

export class PromptApplicationService {
  public createPromptVersion(promptId: string, version: number, timestamp: number, content: string) {
    return {
      id: `${promptId}-v${version}-${timestamp}`,
      version,
      timestamp,
      content,
    };
  }

  public mergePromptsByIdAndVersion(base: Prompt[], incoming: Prompt[]) {
    const merged = [...base];
    const byId = new Map(base.map(prompt => [prompt.id, prompt]));

    incoming.forEach(prompt => {
      const mergedPrompt = this.mergePromptHistory(byId.get(prompt.id), prompt);
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
  }

  public mergeCategoriesWithoutOverwriting(base: Category[], incoming: Category[]) {
    const existingIds = new Set(base.map(item => item.id));
    const normalizedIncoming = incoming.map(item => {
      if (!existingIds.has(item.id)) {
        existingIds.add(item.id);
        return item;
      }

      return item;
    });

    return [...base, ...normalizedIncoming.filter(item => !base.some(existing => existing.id === item.id))];
  }

  public parseBackupPayload(raw: unknown): ParsedBackupPayload | null {
    if (!raw || typeof raw !== 'object') return null;

    const backup = raw as Record<string, any>;
    // Accept version 3 explicitly
    if (backup.kind === 'promptvault-backup' && backup.version === 3 && backup.data && typeof backup.data === 'object') {
      const data = backup.data as Record<string, unknown>;
      const parsed: ParsedBackupPayload = {};

      if (data.prompts && typeof data.prompts === 'object') {
        const promptsSection = data.prompts as Record<string, unknown>;
        if (!this.isPromptArray(promptsSection.prompts) || !this.isCategoryArray(promptsSection.categories)) {
          return null;
        }

        parsed.prompts = {
          prompts: promptsSection.prompts,
          categories: promptsSection.categories,
        };
      }

      if (data.theme && typeof data.theme === 'object') {
        const themeSection = data.theme as Record<string, unknown>;
        if (!this.isThemeMode(themeSection.themeMode) || typeof themeSection.accentColor !== 'string' || !Array.isArray(themeSection.customModels)) {
          return null;
        }

        parsed.theme = {
          themeMode: themeSection.themeMode,
          accentColor: themeSection.accentColor,
          customModels: themeSection.customModels.filter((item): item is string => typeof item === 'string'),
        };
      }

      return parsed.prompts || parsed.theme ? parsed : null;
    }

    // Migration path: attempt to detect older backup formats (v1/v2)
    // Try common shapes: { prompts: [], categories: [] } or { data: { prompts, categories } }
    let candidate: any = null;
    if (Array.isArray((backup as any).prompts) && Array.isArray((backup as any).categories)) {
      candidate = { prompts: backup.prompts, categories: backup.categories };
    } else if (backup.data && Array.isArray(backup.data.prompts)) {
      candidate = { prompts: backup.data.prompts, categories: backup.data.categories || [] };
    } else if (Array.isArray((backup as any).data)) {
      // older export where data was top-level array of prompts
      candidate = { prompts: backup.data, categories: [] };
    }

    if (candidate) {
      // Validate arrays
      if (!this.isPromptArray(candidate.prompts) || !this.isCategoryArray(candidate.categories || [])) return null;
      const parsed: ParsedBackupPayload = {
        prompts: {
          prompts: candidate.prompts,
          categories: candidate.categories || [],
        }
      };
      return parsed;
    }

    return null;
  }

  public getFilteredPrompts(context: PromptQueryContext) {
    const { prompts, categories, selectedCategoryId, searchQuery } = context;
    let result = [...prompts];

    if (selectedCategoryId === 'favorites') {
      result = result.filter(prompt => prompt.isFavorite);
    } else if (selectedCategoryId === 'pinned') {
      result = result.filter(prompt => prompt.isPinned);
    } else if (selectedCategoryId !== null) {
      result = result.filter(prompt => prompt.categoryId === selectedCategoryId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const normalizedQuery = this.normalizeForSearch(searchQuery);
      const categoryNameById = new Map(categories.map(category => [category.id, category.name]));

      result = result.filter(prompt =>
        prompt.title.toLowerCase().includes(q) ||
        (prompt.description && prompt.description.toLowerCase().includes(q)) ||
        prompt.content.toLowerCase().includes(q) ||
        prompt.tags.some(tag => tag.toLowerCase().includes(q)) ||
        prompt.model.toLowerCase().includes(q) ||
        (prompt.categoryId !== null && this.isCategoryNameMatch(categoryNameById.get(prompt.categoryId) || '', normalizedQuery))
      );
    }

    return result.sort((left, right) => {
      if (left.isPinned && !right.isPinned) return -1;
      if (!left.isPinned && right.isPinned) return 1;
      return right.updatedAt - left.updatedAt;
    });
  }

  public getPromptSwitchValue(prompt: Prompt, switchId: string) {
    const instances = (prompt as unknown as { switchInstances?: SwitchInstance[] }).switchInstances;
    if (!Array.isArray(instances)) return undefined;

    const found = instances.find(i => i.switchId === switchId && i.enabled);
    return found ? found.value : undefined;
  }

  private mergePromptHistory(existing: Prompt | undefined, incoming: Prompt): Prompt | null {
    const normalizedIncoming = {
      ...incoming,
      versions: this.normalizePromptVersions(incoming),
    };

    if (!existing) {
      return normalizedIncoming;
    }

    const normalizedExisting = {
      ...existing,
      versions: this.normalizePromptVersions(existing),
    };

    const existingLatest = normalizedExisting.versions[normalizedExisting.versions.length - 1];
    const incomingLatest = normalizedIncoming.versions[normalizedIncoming.versions.length - 1];
    const incomingIsNewer = this.comparePromptVersions(incomingLatest, existingLatest) > 0;

    if (existingLatest && incomingLatest && this.getVersionKey(existingLatest) === this.getVersionKey(incomingLatest)) {
      return null;
    }

    const mergedVersions = [...normalizedExisting.versions];
    const existingVersionKeys = new Set(mergedVersions.map(version => this.getVersionKey(version)));

    normalizedIncoming.versions.forEach(version => {
      const key = this.getVersionKey(version);
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
  }

  private normalizePromptVersions(prompt: Prompt): Prompt['versions'] {
    const versions = Array.isArray(prompt.versions) ? prompt.versions : [];
    const seen = new Set<string>();

    return versions
      .map(version => ({
        ...version,
        id: version.id || `${prompt.id}-v${version.version}-${version.timestamp}`,
      }))
      .filter(version => {
        const key = this.getVersionKey(version);
        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      });
  }

  private comparePromptVersions(
    left: Prompt['versions'][number] | undefined,
    right: Prompt['versions'][number] | undefined
  ) {
    if (!left && !right) return 0;
    if (!left) return -1;
    if (!right) return 1;
    if (left.version !== right.version) {
      return left.version - right.version;
    }

    return left.timestamp - right.timestamp;
  }

  private getVersionKey(version: Prompt['versions'][number]) {
    return version.id || `${version.version}:${version.timestamp}:${version.content}`;
  }

  private normalizeForSearch(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private buildBigrams(value: string) {
    const source = ` ${value} `;
    const bigrams: string[] = [];
    for (let index = 0; index < source.length - 1; index += 1) {
      bigrams.push(source.slice(index, index + 2));
    }

    return bigrams;
  }

  private getBigramSimilarity(left: string, right: string) {
    if (!left || !right) {
      return 0;
    }

    if (left === right) {
      return 1;
    }

    const leftBigrams = this.buildBigrams(left);
    const rightBigrams = this.buildBigrams(right);
    if (!leftBigrams.length || !rightBigrams.length) {
      return 0;
    }

    const rightCounts = new Map<string, number>();
    rightBigrams.forEach(bigram => {
      rightCounts.set(bigram, (rightCounts.get(bigram) || 0) + 1);
    });

    let intersection = 0;
    leftBigrams.forEach(bigram => {
      const count = rightCounts.get(bigram) || 0;
      if (count > 0) {
        intersection += 1;
        rightCounts.set(bigram, count - 1);
      }
    });

    return (2 * intersection) / (leftBigrams.length + rightBigrams.length);
  }

  private isCategoryNameMatch(categoryName: string, query: string) {
    const normalizedCategory = this.normalizeForSearch(categoryName);
    if (!normalizedCategory || !query) {
      return false;
    }

    if (normalizedCategory.includes(query) || query.includes(normalizedCategory)) {
      return true;
    }

    const queryTokens = query.split(' ').filter(token => token.length > 1);
    const categoryTokens = normalizedCategory.split(' ').filter(token => token.length > 1);
    const hasTokenMatch = queryTokens.some(queryToken =>
      categoryTokens.some(categoryToken =>
        categoryToken.includes(queryToken) || queryToken.includes(categoryToken)
      )
    );

    if (hasTokenMatch) {
      return true;
    }

    return this.getBigramSimilarity(normalizedCategory, query) >= 0.8;
  }

  private isPromptArray(value: unknown): value is Prompt[] {
    return Array.isArray(value);
  }

  private isCategoryArray(value: unknown): value is Category[] {
    return Array.isArray(value);
  }

  private isThemeMode(value: unknown): value is ThemeMode {
    return value === 'light' || value === 'dark';
  }
}
