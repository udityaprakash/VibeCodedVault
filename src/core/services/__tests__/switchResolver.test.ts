import { describe, it, expect } from 'vitest';
import { SwitchResolver } from '../switchResolver';

const definitions = [
  { id: 'a', name: 'Alpha', defaultValue: false },
  { id: 'b', name: 'Beta', defaultValue: 'x' },
  { id: 'c', name: 'Charlie', defaultValue: 0 },
];

describe('SwitchResolver', () => {
  it('buildDefaults creates instances for all definitions', () => {
    const resolver = new SwitchResolver(definitions as any);
    const defaults = resolver.buildDefaults('prompt');
    expect(defaults.length).toBe(3);
    expect(defaults.find(d => d.switchId === 'a')?.value).toBe(false);
  });

  it('resolve prefers prompt-level over category-level', () => {
    const resolver = new SwitchResolver(definitions as any);
    const category = [{ switchId: 'a', value: true, enabled: true, scope: 'category', updatedAt: Date.now() }];
    const prompt = [{ switchId: 'a', value: false, enabled: true, scope: 'prompt', updatedAt: Date.now() }];

    const resolved = resolver.resolve(category as any, prompt as any);
    expect(resolved.length).toBe(1);
    expect(resolved[0].source).toBe('prompt');
    expect(resolved[0].value).toBe(false);
  });
});
