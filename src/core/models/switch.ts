export type SwitchValueType = 'boolean' | 'string' | 'number' | 'datetime' | 'object' | 'array';

export type SwitchScope = 'category' | 'prompt';

export interface SwitchValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
}

export interface SwitchDefinition {
  id: string;
  name: string;
  icon: string;
  type: SwitchValueType;
  defaultValue: unknown;
  renderer: string;
  validation?: SwitchValidationRule;
}

export interface SwitchRegistry {
  version: number;
  switches: SwitchDefinition[];
}

export interface SwitchInstance<TValue = unknown> {
  switchId: string;
  value: TValue;
  enabled: boolean;
  scope: SwitchScope;
  updatedAt: number;
}

export interface ResolvedSwitchInstance<TValue = unknown> extends SwitchInstance<TValue> {
  source: 'category' | 'prompt';
}
