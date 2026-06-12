import React, { useState } from 'react';
import { 
  Pin, Star, Copy, Check, Flame, Layers, 
  ExternalLink, CheckSquare, Square, Link2
} from 'lucide-react';
import type { Prompt, Category, RawSwitchData } from '../types';

interface PromptGridProps {
  prompts: Prompt[];
  categories: Category[];
  onSelectPrompt: (promptId: string) => void;
  onToggleFavorite: (prompt: Prompt) => void;
  onTogglePin: (prompt: Prompt) => void;
  onUpdateSwitches?: (promptId: string, switches: RawSwitchData[]) => void;
}

export const PromptGrid: React.FC<PromptGridProps> = ({
  prompts,
  categories,
  onSelectPrompt,
  onToggleFavorite,
  onTogglePin,
  onUpdateSwitches
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Resolve target string to copy based on copyable switch target selection
  const resolveCopyText = (prompt: Prompt, activeSwitches: RawSwitchData[], target: string): string => {
    if (target === 'title') {
      return prompt.title;
    }
    if (target === 'tags') {
      return prompt.tags ? prompt.tags.join(', ') : '';
    }
    if (target === 'description') {
      return prompt.description || prompt.content || '';
    }
    if (target === 'note') {
      const noteSw = activeSwitches.find(s => s.type === 'note');
      return noteSw ? String(noteSw.value || '') : '';
    }
    if (target.startsWith('sw_')) {
      const textSw = activeSwitches.find(s => s.id === target);
      return textSw ? String(textSw.value || '') : '';
    }
    return prompt.description || prompt.content || '';
  };

  const handleCopy = (e: React.MouseEvent, prompt: Prompt, activeSwitches: RawSwitchData[]) => {
    e.stopPropagation(); // prevent opening the editor when clicking copy
    
    const copyableSw = activeSwitches.find(s => s.type === 'copyable');
    let copyText = prompt.description || prompt.content || '';

    if (copyableSw) {
      copyText = resolveCopyText(prompt, activeSwitches, copyableSw.value || 'description');
    }

    navigator.clipboard.writeText(copyText);
    setCopiedId(prompt.id);
    
    // Log usage count in database
    if (window.api && window.api.incrementUsage) {
      window.api.incrementUsage(prompt.id);
    }
    
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Resolve active switches for a prompt card, returning prompt-level switches
  const getActiveSwitches = (prompt: Prompt): RawSwitchData[] => {
    return prompt.switches || [];
  };

  const handleUpdateSwitchValue = (prompt: Prompt, sw: RawSwitchData, newValue: any) => {
    if (!onUpdateSwitches) return;
    
    let localSwitches = prompt.switches ? [...prompt.switches] : [];
    const localIndex = localSwitches.findIndex(s => s.id === sw.id);

    if (localIndex !== -1) {
      // Modify local override
      localSwitches[localIndex] = { ...localSwitches[localIndex], value: newValue };
    } else {
      // Create local override from inherited category switch
      localSwitches.push({ ...sw, value: newValue });
    }

    onUpdateSwitches(prompt.id, localSwitches);
  };

  const getModelColor = (model: string) => {
    const m = model.toLowerCase();
    if (m.includes('claude')) return 'border-orange-500/20 text-orange-400 bg-orange-500/5';
    if (m.includes('gemini')) return 'border-blue-500/20 text-blue-400 bg-blue-500/5';
    if (m.includes('gpt') || m.includes('openai')) return 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5';
    if (m.includes('midjourney')) return 'border-cyan-500/20 text-cyan-400 bg-cyan-500/5';
    return 'border-obsidian-700 text-obsidian-400 bg-obsidian-950';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {prompts.map((prompt) => {
        const cat = categories.find(c => c.id === prompt.categoryId);
        const activeSwitches = getActiveSwitches(prompt);
        const isCopied = copiedId === prompt.id;

        // Extract switch states
        const strikethroughSw = activeSwitches.find(s => s.type === 'strikethrough');
        const colorSw = activeSwitches.find(s => s.type === 'color');
        const checkboxSwitches = activeSwitches.filter(s => s.type === 'checkbox');
        const copyableSw = activeSwitches.find(s => s.type === 'copyable');
        const linkSwitches = activeSwitches.filter(s => s.type === 'link');

        // Apply title strikethrough style
        const isStrikethrough = strikethroughSw?.value === true;
        
        // Apply tile background color (with 80% transparency = 20% opacity = '33' hex)
        const customBgStyle = colorSw?.value 
          ? { backgroundColor: `${colorSw.value}25`, borderColor: `${colorSw.value}40` }
          : undefined;

        return (
          <div
            key={prompt.id}
            onClick={() => onSelectPrompt(prompt.id)}
            style={customBgStyle}
            className="glass-card group p-5 rounded-xl flex flex-col justify-between min-h-[250px] cursor-pointer relative overflow-hidden transition-all duration-200"
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
                  
                  {/* Model Compatibility Badge */}
                  {prompt.model && prompt.model.toLowerCase() !== 'general' && (
                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border truncate ${getModelColor(prompt.model)}`}>
                      {prompt.model}
                    </span>
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
              <h4 className={`text-sm font-bold text-obsidian-100 group-hover:text-cyber-violet transition-colors truncate mb-1 ${
                isStrikethrough ? 'line-through opacity-50' : ''
              }`}>
                {prompt.title}
              </h4>
              
              <div 
                className="text-xs text-obsidian-400 whitespace-pre-wrap leading-relaxed mb-3 max-h-[120px] overflow-y-auto custom-scrollbar select-text pr-1 titlebar-nodrag"
                onClick={e => e.stopPropagation()}
              >
                {prompt.description || 'No description provided.'}
              </div>
            </div>

            {/* Switch Interactive Views rendered directly on the tile */}
            <div className="space-y-3 my-2 z-10 titlebar-nodrag">
              
              {/* Checkbox Done Toggle switches */}
              {checkboxSwitches.map((sw) => (
                <div 
                  key={sw.id}
                  className="flex items-center gap-2 text-xs text-obsidian-300"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => handleUpdateSwitchValue(prompt, sw, !sw.value)}
                    className="text-cyber-violet hover:opacity-80 transition-opacity cursor-pointer"
                  >
                    {sw.value ? (
                      <CheckSquare size={14} className="text-cyber-cyan" />
                    ) : (
                      <Square size={14} className="text-obsidian-600" />
                    )}
                  </button>
                  <span className={sw.value ? 'line-through opacity-60' : ''}>
                    {sw.label || 'Task Done'}
                  </span>
                </div>
              ))}

              {/* Hoverable External Links */}
              {linkSwitches.length > 0 && (
                <div 
                  className="flex items-center gap-2 flex-wrap"
                  onClick={e => e.stopPropagation()}
                >
                  {linkSwitches.map((sw) => (
                    <a
                      key={sw.id}
                      href={sw.value || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/link inline-flex items-center gap-1 bg-cyber-cyan/15 border border-cyber-cyan/20 text-cyber-cyan text-[10px] px-2 py-0.5 rounded-full hover:bg-cyber-cyan/25 transition-all"
                      title={sw.label || 'Open Link'}
                    >
                      <Link2 size={10} />
                      <span className="max-w-[80px] truncate">{sw.label || 'Link'}</span>
                      <ExternalLink size={8} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
                    </a>
                  ))}
                </div>
              )}

            </div>

            {/* Card Footer Details */}
            <div className="flex flex-col gap-3 pt-2 border-t border-obsidian-850/50 mt-auto shrink-0">
              
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

                {/* Quick Copy Button - shown only if copyable switch is active */}
                {copyableSw && (
                  <button
                    onClick={(e) => handleCopy(e, prompt, activeSwitches)}
                    className={`titlebar-nodrag p-2 rounded-lg flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                      isCopied 
                        ? 'bg-cyber-emerald/10 text-cyber-emerald border border-cyber-emerald/20 px-3'
                        : 'bg-obsidian-850 border border-obsidian-800 hover:border-cyber-violet hover:text-cyber-violet text-obsidian-400'
                    }`}
                    title={copyableSw.label || "Copy prompt text"}
                  >
                    {isCopied ? (
                      <>
                        <Check size={11} />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        <span className="text-[9px] font-bold uppercase tracking-wider">{copyableSw.label || 'Copy'}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
