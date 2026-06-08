import type { ResolvedSwitchInstance, SwitchDefinition, SwitchInstance } from '../models/switch';

export class SwitchResolver {
  private readonly definitionsById: Map<string, SwitchDefinition>;

  public constructor(definitions: SwitchDefinition[]) {
    this.definitionsById = new Map(definitions.map(definition => [definition.id, definition]));
  }

  public resolve(
    categorySwitches: SwitchInstance[],
    promptSwitches: SwitchInstance[]
  ): ResolvedSwitchInstance[] {
    const resolved = new Map<string, ResolvedSwitchInstance>();

    categorySwitches.forEach(switchInstance => {
      if (!this.definitionsById.has(switchInstance.switchId)) {
        return;
      }

      resolved.set(switchInstance.switchId, {
        ...switchInstance,
        source: 'category',
      });
    });

    promptSwitches.forEach(switchInstance => {
      if (!this.definitionsById.has(switchInstance.switchId)) {
        return;
      }

      resolved.set(switchInstance.switchId, {
        ...switchInstance,
        source: 'prompt',
      });
    });

    return Array.from(resolved.values()).sort((left, right) => {
      const leftDefinition = this.definitionsById.get(left.switchId);
      const rightDefinition = this.definitionsById.get(right.switchId);

      if (!leftDefinition && !rightDefinition) {
        return left.switchId.localeCompare(right.switchId);
      }

      if (!leftDefinition) {
        return 1;
      }

      if (!rightDefinition) {
        return -1;
      }

      return leftDefinition.name.localeCompare(rightDefinition.name);
    });
  }

  public buildDefaults(scope: 'category' | 'prompt'): SwitchInstance[] {
    return Array.from(this.definitionsById.values()).map(definition => ({
      switchId: definition.id,
      value: definition.defaultValue,
      enabled: false,
      scope,
      updatedAt: Date.now(),
    }));
  }

  public getDefinition(switchId: string) {
    return this.definitionsById.get(switchId);
  }
}
