export const PRESET_MODELS = [
  'General',
  'Anthropic Claude',
  'OpenAi ChatGPT',
  'Google Gemini',
];

export const GEMINI_MODEL_OPTIONS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro'] as const;
export const OPENAI_MODEL_OPTIONS = ['gpt-4o-mini', 'gpt-4.1-mini'] as const;

export const AI_MODEL_OPTIONS = {
  gemini: GEMINI_MODEL_OPTIONS,
  openai: OPENAI_MODEL_OPTIONS
} as const;

export type AIProvider = keyof typeof AI_MODEL_OPTIONS;

export const CUSTOM_MODELS_STORAGE_KEY = 'promptvault-custom-models';
export const CUSTOM_MODELS_UPDATED_EVENT = 'promptvault:custom-models-updated';

const uniqueCaseInsensitive = (values: string[]) =>
  values.filter(
    (item, index, arr) =>
      arr.findIndex(candidate => candidate.toLowerCase() === item.toLowerCase()) === index
  );

export const normalizeModelName = (value: string) => value.trim();

export const getCustomModels = (): string[] => {
  const stored = localStorage.getItem(CUSTOM_MODELS_STORAGE_KEY);
  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const normalized = parsed
      .filter((item): item is string => typeof item === 'string')
      .map(normalizeModelName)
      .filter(item => item.length > 0)
      .filter(item => !PRESET_MODELS.some(preset => preset.toLowerCase() === item.toLowerCase()));

    return uniqueCaseInsensitive(normalized);
  } catch {
    localStorage.removeItem(CUSTOM_MODELS_STORAGE_KEY);
    return [];
  }
};

export const saveCustomModels = (models: string[]) => {
  const sanitized = uniqueCaseInsensitive(
    models
      .map(normalizeModelName)
      .filter(item => item.length > 0)
      .filter(item => !PRESET_MODELS.some(preset => preset.toLowerCase() === item.toLowerCase()))
  );

  localStorage.setItem(CUSTOM_MODELS_STORAGE_KEY, JSON.stringify(sanitized));
  window.dispatchEvent(new CustomEvent(CUSTOM_MODELS_UPDATED_EVENT, { detail: sanitized }));
  return sanitized;
};

export const resolveExistingModelName = (value: string, customModels: string[]) => {
  const normalized = normalizeModelName(value).toLowerCase();
  const all = [...PRESET_MODELS, ...customModels];
  return all.find(option => option.toLowerCase() === normalized) || null;
};

export const getDefaultModelForProvider = (provider: AIProvider) => AI_MODEL_OPTIONS[provider][0];

export const isSupportedModelForProvider = (provider: AIProvider, model: string) =>
  AI_MODEL_OPTIONS[provider].some(option => option.toLowerCase() === normalizeModelName(model).toLowerCase());

export const resolveModelForProvider = (provider: AIProvider, model?: string) => {
  const fallback = getDefaultModelForProvider(provider);
  if (!model) {
    return fallback;
  }

  return isSupportedModelForProvider(provider, model) ? normalizeModelName(model) : fallback;
};

export const getDefaultAiProviderModel = (provider: AIProvider): string => {
  return getDefaultModelForProvider(provider);
};

export const getSupportedModelsForProvider = (provider: AIProvider): readonly string[] => {
  return AI_MODEL_OPTIONS[provider];
};

export const resolveAiModelName = (provider: AIProvider, model?: string): string => {
  return resolveModelForProvider(provider, model);
};
