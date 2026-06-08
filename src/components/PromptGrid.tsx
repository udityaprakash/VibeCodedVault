import { useState, useEffect } from 'react';
import { Pin, Star, Copy, Check, Flame, Layers, Tag } from 'lucide-react';
import ColorSwitch from './switches/ColorSwitch';
import NoteSwitch from './switches/NoteSwitch';
import CopyableTextSwitch from './switches/CopyableTextSwitch';
import BooleanSwitch from './switches/BooleanSwitch';
import ReminderSwitch from './switches/ReminderSwitch';
import type { Prompt, Category } from '../types';
import type { SwitchInstance } from '../core/models/switch';
import { SwitchRegistryLoader } from '../core/services/switchRegistryLoader';
import { SwitchResolver } from '../core/services/switchResolver';
import { PromptActionService } from '../core/services/promptActionService';
import { PromptTilePresentationService } from '../core/services/promptTilePresentationService';

interface PromptGridProps {
  prompts: Prompt[];
  categories: Category[];
  onSelectPrompt: (promptId: string) => void;
  onToggleFavorite: (prompt: Prompt) => void;
  onTogglePin: (prompt: Prompt) => void;
}

export const PromptGrid: React.FC<PromptGridProps> = ({
  prompts,
  categories,
  onSelectPrompt,
  onToggleFavorite,
  onTogglePin
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const promptActionService = new PromptActionService();
  const promptTilePresentationService = new PromptTilePresentationService();
  const [switchResolver, setSwitchResolver] = useState<SwitchResolver | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const loader = new SwitchRegistryLoader(new URL('../config/switch_registry.json', import.meta.url));
        const registry = await loader.load();
        if (!mounted) return;
        setSwitchResolver(new SwitchResolver(registry.switches || []));
      } catch (e) {
        // If registry fails to load, we silently continue without resolver
        console.warn('Failed to load switch registry in PromptGrid:', e);
      }
    };
    void load();
    return () => { mounted = false; };
  }, []);

  const handleCopy = (e: React.MouseEvent, prompt: Prompt) => {
    e.stopPropagation(); // prevent opening the editor when clicking copy
    void promptActionService.copyPromptContent(prompt.content, prompt.id).then(success => {
      if (success) {
        setCopiedId(prompt.id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {prompts.map((prompt) => {
        const cat = categories.find(c => c.id === prompt.categoryId);
        const categorySwitches: SwitchInstance[] = (cat as unknown as { switchInstances?: SwitchInstance[] }).switchInstances || [];
        const promptSwitches: SwitchInstance[] = (prompt as unknown as { switchInstances?: SwitchInstance[] }).switchInstances || [];
        const resolved = switchResolver ? switchResolver.resolve(categorySwitches, promptSwitches) : [];
        const promptColorSwitch = resolved.find(si => si.switchId === 'tile_color' || si.switchId === 'color');
        const promptNoteSwitch = resolved.find(si => si.switchId === 'note');
        const promptCopyable = resolved.find(si => si.switchId === 'copyable_text');
        const promptBoolean = resolved.find(si => si.switchId === 'strike_through' || si.switchId === 'done_checkbox');
        const promptReminder = resolved.find(si => si.switchId === 'reminder');
        const isCopied = copiedId === prompt.id;
        
        return (
          <div
            key={prompt.id}
            onClick={() => onSelectPrompt(prompt.id)}
            className="glass-card group p-5 rounded-xl flex flex-col justify-between h-[230px] cursor-pointer relative overflow-hidden"
            style={promptColorSwitch && typeof promptColorSwitch.value === 'string' ? { boxShadow: `inset 0 0 0 1px ${promptColorSwitch.value}12` } : undefined}
          >
            {/* Holographic Glowing Border Hover Effect */}
            <div className="absolute inset-0 bg-gradient-cyber opacity-0 group-hover:opacity-[0.03] transition-all duration-300 pointer-events-none" />

            <div>
              {/* Card Header Info */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-1.5 min-w-0">
                  {cat ? (
                    <span
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full border truncate"
                      style={{ 
                        color: cat.color, 
                        borderColor: `${cat.color}25`, 
                        backgroundColor: `${cat.color}08` 
                      }}
                    >
                      {cat.name}
                    </span>
                  ) : (
                    <span className="text-[9px] text-obsidian-600 font-bold bg-obsidian-950 border border-obsidian-850 px-2 py-0.5 rounded-full">
                      General
                    </span>
                  )}
                  
                  {/* Model Compatibility Badge (hidden for 'General') */}
                  {prompt.model && prompt.model.toLowerCase() !== 'general' && (
                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border truncate ${promptTilePresentationService.getModelBadgeClass(prompt.model)}`}>
                      {prompt.model}
                    </span>
                  )}
                  {promptColorSwitch && (
                      <span className="ml-2"><ColorSwitch value={promptColorSwitch.value} /></span>
                    )}
                </div>

                {/* Quick Toggle Actions */}
                <div className="flex items-center gap-1 shrink-0 z-10 titlebar-nodrag">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin(prompt);
                    }}
                    className={`p-1.5 rounded-md hover:bg-obsidian-800 transition-colors cursor-pointer ${
                      prompt.isPinned ? 'text-cyber-cyan' : 'text-obsidian-600 hover:text-obsidian-400'
                    }`}
                    title={prompt.isPinned ? 'Unpin prompt' : 'Pin prompt'}
                  >
                    <Pin size={12} className={prompt.isPinned ? 'fill-cyber-cyan/10' : ''} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(prompt);
                    }}
                    className={`p-1.5 rounded-md hover:bg-obsidian-800 transition-colors cursor-pointer ${
                      prompt.isFavorite ? 'text-yellow-500' : 'text-obsidian-600 hover:text-obsidian-400'
                    }`}
                    title={prompt.isFavorite ? 'Remove from favorites' : 'Mark as favorite'}
                  >
                    <Star size={12} className={prompt.isFavorite ? 'fill-yellow-500/10' : ''} />
                  </button>
                </div>
              </div>

              {/* Title & Description */}
              <h4 className="text-sm font-bold text-obsidian-100 group-hover:text-cyber-violet transition-colors truncate mb-1">
                {prompt.title}
              </h4>
              <p className="text-xs text-obsidian-400 line-clamp-2 leading-relaxed mb-4">
                {prompt.description || 'No description provided.'}
              </p>
            </div>

            {/* Card Footer Details */}
            <div className="flex flex-col gap-3 pt-2 border-t border-obsidian-850/50">
              
              {/* Tags Section */}
              {prompt.tags && prompt.tags.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {prompt.tags.slice(0, 3).map((tag, idx) => (
                    <span 
                      key={idx} 
                      className="text-[9px] font-medium text-obsidian-400 bg-obsidian-850 border border-obsidian-800 px-2 py-0.5 rounded shrink-0"
                    >
                      #{tag}
                    </span>
                  ))}
                  {prompt.tags.length > 3 && (
                    <span className="text-[9px] text-obsidian-600 font-bold shrink-0">
                      +{prompt.tags.length - 3} more
                    </span>
                  )}
                </div>
              )}
              {
                promptNoteSwitch && (
                  <div className="mt-2">
                    <NoteSwitch value={promptNoteSwitch.value} />
                  </div>
                )
              }
              {/* Footer row */}
              <div className="flex items-center justify-between text-[10px] text-obsidian-600">
                <div className="flex items-center gap-3">
                  {/* Usage Heat Level */}
                  <span className="flex items-center gap-1" title="Usage count">
                    <Flame size={12} className={prompt.usageCount > 15 ? 'text-cyber-rose fill-cyber-rose/10' : prompt.usageCount > 5 ? 'text-orange-400' : 'text-obsidian-600'} />
                    <span>{prompt.usageCount || 0} copies</span>
                  </span>

                  {/* Versions Count */}
                  <span className="flex items-center gap-1" title="Revision history version">
                    <Layers size={11} />
                    <span>v{prompt.version || 1}</span>
                  </span>
                </div>
                {/* Quick Copy Button */}
                <button
                  onClick={(e) => handleCopy(e, prompt)}
                  className={`titlebar-nodrag p-2 rounded-lg flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                    isCopied 
                      ? 'bg-cyber-emerald/10 text-cyber-emerald border border-cyber-emerald/20 px-3'
                      : 'bg-obsidian-850 border border-obsidian-800 hover:border-cyber-violet hover:text-cyber-violet text-obsidian-400'
                  }`}
                  title="Copy prompt text"
                >
                  {isCopied ? (
                    <>
                      <Check size={11} />
                      <span className="text-[9px] font-bold uppercase tracking-wider">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={11} />
                      <span className="text-[9px] font-bold uppercase tracking-wider">Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            {/* Inline Switch Previews (with source badge) */}
            <div className="absolute top-3 right-3 flex flex-col items-end gap-2 z-20">
              {promptCopyable && (
                <div className="relative">
                  <CopyableTextSwitch value={promptCopyable.value} />
                  <div title={promptCopyable.source === 'prompt' ? 'Defined on Prompt' : 'Inherited from Category'} className={`absolute -top-2 -right-2 text-[10px] px-1 py-0.5 rounded-full ${promptCopyable.source === 'prompt' ? 'bg-cyber-violet text-white' : 'bg-cyber-cyan text-black'}`}>{promptCopyable.source === 'prompt' ? 'Prompt' : 'Category'}</div>
                </div>
              )}
              {promptBoolean && (
                <div className="relative">
                  <BooleanSwitch value={promptBoolean.value} />
                  <div title={promptBoolean.source === 'prompt' ? 'Defined on Prompt' : 'Inherited from Category'} className={`absolute -top-2 -right-2 text-[10px] px-1 py-0.5 rounded-full ${promptBoolean.source === 'prompt' ? 'bg-cyber-violet text-white' : 'bg-cyber-cyan text-black'}`}>{promptBoolean.source === 'prompt' ? 'Prompt' : 'Category'}</div>
                </div>
              )}
              {promptReminder && (
                <div className="relative">
                  <ReminderSwitch value={promptReminder.value} />
                  <div title={promptReminder.source === 'prompt' ? 'Defined on Prompt' : 'Inherited from Category'} className={`absolute -top-2 -right-2 text-[10px] px-1 py-0.5 rounded-full ${promptReminder.source === 'prompt' ? 'bg-cyber-violet text-white' : 'bg-cyber-cyan text-black'}`}>{promptReminder.source === 'prompt' ? 'Prompt' : 'Category'}</div>
                </div>
              )}
            </div>

            {/* Resolved switches badge panel (shows on hover) */}
            {resolved && resolved.length > 0 && (
              <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                <div className="flex items-center gap-2">
                  {resolved.slice(0, 4).map(r => {
                    const def = switchResolver?.getDefinition(r.switchId);
                    const displayName = def?.name || r.switchId;
                    return (
                      <div
                        key={`${r.switchId}-${r.updatedAt}`}
                        title={`${displayName} — ${r.source === 'prompt' ? 'Prompt override' : 'Category default'}`}
                        role="status"
                        aria-label={`${displayName} ${r.source === 'prompt' ? 'defined on prompt' : 'inherited from category'}`}
                        tabIndex={0}
                        className="flex items-center gap-1 bg-obsidian-900/80 border border-obsidian-800 px-2 py-0.5 rounded text-[10px] text-obsidian-300 hover:scale-105 focus:scale-105 transition-transform duration-150 focus:outline-none focus:ring-2 focus:ring-cyber-violet"
                      >
                        <span className={`w-2 h-2 rounded-full ${r.source === 'prompt' ? 'bg-cyber-violet' : 'bg-cyber-cyan'}`} />
                        <Tag size={12} className="text-obsidian-300" />
                        <span className="truncate max-w-[120px]">{displayName}</span>
                        <span className={`text-[10px] font-semibold ml-1 ${r.source === 'prompt' ? 'text-cyber-violet' : 'text-cyber-cyan'}`}>{r.source === 'prompt' ? 'Prompt' : 'Category'}</span>
                      </div>
                    );
                  })}
                  {resolved.length > 4 && (
                    <div className="px-2 py-0.5 rounded bg-obsidian-900/80 border border-obsidian-800 text-xs">+{resolved.length - 4}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
