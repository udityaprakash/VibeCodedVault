import { useState } from 'react';
import { Pin, Star, Copy, Check, Flame, Layers } from 'lucide-react';
import type { Prompt, Category } from '../types';

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

  const handleCopy = (e: React.MouseEvent, prompt: Prompt) => {
    e.stopPropagation(); // prevent opening the editor when clicking copy
    navigator.clipboard.writeText(prompt.content);
    setCopiedId(prompt.id);
    
    // Log usage count in database
    if (window.api && window.api.incrementUsage) {
      window.api.incrementUsage(prompt.id);
    }
    
    setTimeout(() => setCopiedId(null), 2000);
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
        const isCopied = copiedId === prompt.id;
        
        return (
          <div
            key={prompt.id}
            onClick={() => onSelectPrompt(prompt.id)}
            className="glass-card group p-5 rounded-xl flex flex-col justify-between h-[230px] cursor-pointer relative overflow-hidden"
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
                  <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border truncate ${getModelColor(prompt.model)}`}>
                    {prompt.model}
                  </span>
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
          </div>
        );
      })}
    </div>
  );
};
