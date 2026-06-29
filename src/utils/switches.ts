import type { RawSwitchData } from '../types';

export abstract class PromptSwitch {
  public id: string;
  public type: string;
  public label: string;
  public value: any;

  constructor(id: string, type: string, label: string, value: any) {
    this.id = id;
    this.type = type;
    this.label = label;
    this.value = value;
  }

  abstract clone(): PromptSwitch;
  abstract toRaw(): RawSwitchData;
  abstract validate(): boolean;
}

// TODO: Implement strikethrough switch subclass
export class StrikethroughSwitch extends PromptSwitch {
  constructor(id: string, label = 'Strikethrough Title', value = false) {
    super(id, 'strikethrough', label, value);
  }

  clone(): StrikethroughSwitch {
    return new StrikethroughSwitch(this.id, this.label, this.value);
  }

  toRaw(): RawSwitchData {
    return { id: this.id, type: this.type, label: this.label, value: this.value };
  }

  validate(): boolean {
    return typeof this.value === 'boolean';
  }
}

// TODO: Implement checkbox switch subclass
export class CheckboxSwitch extends PromptSwitch {
  public highlightOnChecked: boolean;
  public strikeThroughOnChecked: boolean;

  constructor(id: string, label = 'Task Status', value = false, highlightOnChecked = true, strikeThroughOnChecked = false) {
    super(id, 'checkbox', label, value);
    this.highlightOnChecked = highlightOnChecked;
    this.strikeThroughOnChecked = strikeThroughOnChecked;
  }

  clone(): CheckboxSwitch {
    return new CheckboxSwitch(this.id, this.label, this.value, this.highlightOnChecked, this.strikeThroughOnChecked);
  }

  toRaw(): RawSwitchData {
    return { 
      id: this.id, 
      type: this.type, 
      label: this.label, 
      value: this.value,
      highlightOnChecked: this.highlightOnChecked,
      strikeThroughOnChecked: this.strikeThroughOnChecked
    };
  }

  validate(): boolean {
    return typeof this.value === 'boolean' && typeof this.label === 'string';
  }
}

// TODO: Implement textarea switch subclass
export class TextAreaSwitch extends PromptSwitch {
  constructor(id: string, label = 'Custom Input', value = '') {
    super(id, 'textarea', label, value);
  }

  clone(): TextAreaSwitch {
    return new TextAreaSwitch(this.id, this.label, this.value);
  }

  toRaw(): RawSwitchData {
    return { id: this.id, type: this.type, label: this.label, value: this.value };
  }

  validate(): boolean {
    return typeof this.value === 'string' && typeof this.label === 'string';
  }
}

// TODO: Implement copyable switch subclass
export class CopyableSwitch extends PromptSwitch {
  constructor(id: string, label = 'Copy Configuration', value = 'description') {
    super(id, 'copyable', label, value);
  }

  clone(): CopyableSwitch {
    return new CopyableSwitch(this.id, this.label, this.value);
  }

  toRaw(): RawSwitchData {
    return { id: this.id, type: this.type, label: this.label, value: this.value };
  }

  validate(): boolean {
    return typeof this.value === 'string' && typeof this.label === 'string';
  }
}

// TODO: Implement link switch subclass
export class LinkSwitch extends PromptSwitch {
  constructor(id: string, label = 'Link', value = '') {
    super(id, 'link', label, value);
  }

  clone(): LinkSwitch {
    return new LinkSwitch(this.id, this.label, this.value);
  }

  toRaw(): RawSwitchData {
    return { id: this.id, type: this.type, label: this.label, value: this.value };
  }

  validate(): boolean {
    return typeof this.value === 'string' && typeof this.label === 'string';
  }
}

// TODO: Implement color switch subclass
export class ColorSwitch extends PromptSwitch {
  constructor(id: string, label = 'Custom Tile Color', value = '#8B5CF6') {
    super(id, 'color', label, value);
  }

  clone(): ColorSwitch {
    return new ColorSwitch(this.id, this.label, this.value);
  }

  toRaw(): RawSwitchData {
    return { id: this.id, type: this.type, label: this.label, value: this.value };
  }

  validate(): boolean {
    return typeof this.value === 'string' && this.value.startsWith('#');
  }
}

// TODO: Implement schedule reminder switch subclass
export interface ReminderValue {
  dateTime: string;
  description: string;
  notified: boolean;
}

export class ReminderSwitch extends PromptSwitch {
  constructor(id: string, label = 'Reminder', value: ReminderValue = { dateTime: '', description: '', notified: false }) {
    super(id, 'reminder', label, value);
  }

  clone(): ReminderSwitch {
    return new ReminderSwitch(this.id, this.label, { ...this.value });
  }

  toRaw(): RawSwitchData {
    return { id: this.id, type: this.type, label: this.label, value: this.value };
  }

  validate(): boolean {
    return (
      typeof this.value === 'object' &&
      this.value !== null &&
      typeof this.value.dateTime === 'string' &&
      typeof this.value.description === 'string' &&
      typeof this.value.notified === 'boolean'
    );
  }
}

// TODO: Implement scheduled delete switch subclass
export class ScheduledDeleteSwitch extends PromptSwitch {
  constructor(id: string, label = 'Auto Delete Date', value = '') {
    super(id, 'delete', label, value);
  }

  clone(): ScheduledDeleteSwitch {
    return new ScheduledDeleteSwitch(this.id, this.label, this.value);
  }

  toRaw(): RawSwitchData {
    return { id: this.id, type: this.type, label: this.label, value: this.value };
  }

  validate(): boolean {
    return typeof this.value === 'string';
  }
}

// TODO: Implement calendar note switch subclass
export class NoteSwitch extends PromptSwitch {
  constructor(id: string, label = 'Calendar Note Override', value = '') {
    super(id, 'note', label, value);
  }

  clone(): NoteSwitch {
    return new NoteSwitch(this.id, this.label, this.value);
  }

  toRaw(): RawSwitchData {
    return { id: this.id, type: this.type, label: this.label, value: this.value };
  }

  validate(): boolean {
    return typeof this.value === 'string';
  }
}

// TODO: Implement SwitchFactory for instantiation and defaults
export class SwitchFactory {
  static create(raw: RawSwitchData): PromptSwitch {
    switch (raw.type) {
      case 'strikethrough':
        return new StrikethroughSwitch(raw.id, raw.label, raw.value);
      case 'checkbox':
        return new CheckboxSwitch(
          raw.id,
          raw.label,
          raw.value,
          raw.highlightOnChecked ?? true,
          raw.strikeThroughOnChecked ?? false
        );
      case 'textarea':
        return new TextAreaSwitch(raw.id, raw.label, raw.value);
      case 'copyable':
        return new CopyableSwitch(raw.id, raw.label, raw.value);
      case 'link':
        return new LinkSwitch(raw.id, raw.label, raw.value);
      case 'color':
        return new ColorSwitch(raw.id, raw.label, raw.value);
      case 'reminder':
        return new ReminderSwitch(raw.id, raw.label, raw.value);
      case 'delete':
        return new ScheduledDeleteSwitch(raw.id, raw.label, raw.value);
      case 'note':
        return new NoteSwitch(raw.id, raw.label, raw.value);
      default:
        throw new Error(`Unknown switch type: ${raw.type}`);
    }
  }

  static createDefault(type: string): PromptSwitch {
    const id = 'sw_' + Math.random().toString(36).substr(2, 9);
    switch (type) {
      case 'strikethrough':
        return new StrikethroughSwitch(id, 'Strikethrough Title', false);
      case 'checkbox':
        return new CheckboxSwitch(id, 'Mark as Done', false);
      case 'textarea':
        return new TextAreaSwitch(id, 'Notes/Observations', '');
      case 'copyable':
        return new CopyableSwitch(id, 'Copy Button Action', 'description');
      case 'link':
        return new LinkSwitch(id, 'Reference Link', '');
      case 'color':
        return new ColorSwitch(id, 'Tile Color Override', '#8B5CF6');
      case 'reminder':
        return new ReminderSwitch(id, 'Scheduled Reminder', { dateTime: '', description: '', notified: false });
      case 'delete':
        return new ScheduledDeleteSwitch(id, 'Self-Destruct Date', '');
      case 'note':
        return new NoteSwitch(id, 'Calendar Note Override', '');
      default:
        throw new Error(`Unknown switch type: ${type}`);
    }
  }
}
