export class PromptTilePresentationService {
  public getModelBadgeClass(model: string) {
    const normalized = model.toLowerCase();
    if (normalized.includes('claude')) return 'border-orange-500/20 text-orange-400 bg-orange-500/5';
    if (normalized.includes('gemini')) return 'border-blue-500/20 text-blue-400 bg-blue-500/5';
    if (normalized.includes('gpt') || normalized.includes('openai')) return 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5';
    if (normalized.includes('midjourney')) return 'border-cyan-500/20 text-cyan-400 bg-cyan-500/5';
    return 'border-obsidian-700 text-obsidian-400 bg-obsidian-950';
  }
}
