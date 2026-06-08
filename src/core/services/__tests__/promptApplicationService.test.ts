import { describe, it, expect } from 'vitest';
import { PromptApplicationService } from '../promptApplicationService';

const svc = new PromptApplicationService();

describe('PromptApplicationService.parseBackupPayload', () => {
  it('parses v3 payloads', () => {
    const payload = { kind: 'promptvault-backup', version: 3, data: { prompts: { prompts: [], categories: [] }, theme: { themeMode: 'dark', accentColor: '#000000', customModels: [] } } };
    const parsed = svc.parseBackupPayload(payload);
    expect(parsed).not.toBeNull();
    expect(parsed?.theme?.themeMode).toBe('dark');
  });

  it('migrates simple v2-like payloads', () => {
    const payload = { prompts: [{ id: 'x', title: 't', content: 'c', description: '', tags: [], model: 'm', version: 1, versions: [], createdAt: Date.now(), updatedAt: Date.now(), usageCount: 0 }], categories: [] };
    const parsed = svc.parseBackupPayload(payload as any);
    expect(parsed).not.toBeNull();
    expect(parsed?.prompts?.prompts.length).toBe(1);
  });
});
