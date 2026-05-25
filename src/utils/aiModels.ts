export const PRESET_MODELS = [
  'General',
  'Anthropic Claude',
  'OpenAi ChatGPT',
  'Google Gemini',
];

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
