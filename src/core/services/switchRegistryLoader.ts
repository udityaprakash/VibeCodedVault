import type { SwitchRegistry } from '../models/switch';

type SwitchRegistryShape = {
  version?: unknown;
  switches?: unknown;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isSwitchRegistry = (value: unknown): value is SwitchRegistry => {
  if (!isObject(value)) {
    return false;
  }

  const candidate = value as SwitchRegistryShape;
  return typeof candidate.version === 'number' && Array.isArray(candidate.switches);
};

export class SwitchRegistryLoader {
  private readonly registryUrl: URL;

  public constructor(registryUrl: URL) {
    this.registryUrl = registryUrl;
  }

  public async load(): Promise<SwitchRegistry> {
    const response = await fetch(this.registryUrl);
    if (!response.ok) {
      throw new Error(`Failed to load switch registry from ${this.registryUrl.toString()}`);
    }

    const payload = (await response.json()) as unknown;
    if (!isSwitchRegistry(payload)) {
      throw new Error('Invalid switch registry schema');
    }

    return payload;
  }
}
