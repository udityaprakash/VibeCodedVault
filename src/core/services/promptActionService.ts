import type { Prompt } from '../../types';

export class PromptActionService {
  public async copyPromptContent(content: string, promptId?: Prompt['id']): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(content);

      if (promptId && window.api?.incrementUsage) {
        await window.api.incrementUsage(promptId);
      }

      return true;
    } catch (error) {
      console.error('Failed to copy prompt content:', error);
      return false;
    }
  }
}
