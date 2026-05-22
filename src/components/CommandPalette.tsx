import { useState, useEffect, useRef } from 'react';
import { Search, Terminal, FileText, Pin, Star, Plus, Download, Upload } from 'lucide-react';
import type { Prompt, Category } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  prompts: Prompt[];
  categories: Category[];
  onSelectPrompt: (promptId: string) => void;
  onNewPrompt: () => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  prompts,
  categories,
  onSelectPrompt,
  onNewPrompt,
  onExportBackup,
  onImportBackup,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onClose]);

  // Filter items
  const filteredPrompts = prompts.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.description.toLowerCase().includes(search.toLowerCase()) ||
    p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  const actions = [
    { id: 'act-new', name: 'Create New Prompt', description: 'Draft a new custom prompt template', icon: Plus, run: () => onNewPrompt() },
    { id: 'act-export', name: 'Export Backup', description: 'Export the complete database to a local file', icon: Download, run: () => onExportBackup() },
    { id: 'act-import', name: 'Import Backup', description: 'Load prompts and categories from a backup JSON', icon: Upload, run: () => onImportBackup() },
  ];

  const filteredActions = actions.filter(act => 
    act.name.toLowerCase().includes(search.toLowerCase()) ||
    act.description.toLowerCase().includes(search.toLowerCase())
  );

  const combinedItems = [
    ...filteredActions.map(act => ({ type: 'action', id: act.id, data: act })),
    ...filteredPrompts.map(p => ({ type: 'prompt', id: p.id, data: p }))
  ];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(combinedItems.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + combinedItems.length) % Math.max(combinedItems.length, 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (combinedItems[selectedIndex]) {
          const selected = combinedItems[selectedIndex];
          if (selected.type === 'action') {
            (selected.data as any).run();
          } else {
            onSelectPrompt(selected.id);
          }
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, combinedItems, onSelectPrompt, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-obsidian-950/80 backdrop-blur-sm flex justify-center pt-[15vh] z-[999] px-4">
      <div 
        ref={modalRef}
        className="glass-panel w-full max-w-[640px] h-[420px] rounded-xl flex flex-col shadow-2xl border border-obsidian-800/80 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Search Input Panel */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-obsidian-850 bg-obsidian-950/60">
          <Search className="text-obsidian-400 shrink-0" size={20} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search templates, trigger settings, or run commands..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent text-sm text-obsidian-100 placeholder-obsidian-600 focus:outline-none"
          />
          <kbd className="text-[10px] text-obsidian-600 font-bold bg-obsidian-900 border border-obsidian-850 px-2 py-0.5 rounded shadow">ESC</kbd>
        </div>

        {/* Results Panel */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {combinedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-obsidian-600 space-y-2">
              <Terminal size={32} className="stroke-[1.5]" />
              <span className="text-xs">No matching prompts or actions found</span>
            </div>
          ) : (
            combinedItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              
              if (item.type === 'action') {
                const act = item.data as any;
                const ActIcon = act.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      act.run();
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all duration-75 cursor-pointer ${
                      isSelected ? 'bg-cyber-purple/20 text-obsidian-100 border border-cyber-purple/30' : 'text-obsidian-400 hover:text-obsidian-200 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded bg-obsidian-850 border border-obsidian-800 ${isSelected ? 'text-cyber-violet' : ''}`}>
                        <ActIcon size={14} />
                      </div>
                      <div>
                        <div className="text-xs font-semibold">{act.name}</div>
                        <div className="text-[10px] text-obsidian-600">{act.description}</div>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-cyber-violet tracking-wider">System Action</span>
                  </button>
                );
              } else {
                const prompt = item.data as Prompt;
                const cat = categories.find(c => c.id === prompt.categoryId);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectPrompt(prompt.id);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all duration-75 cursor-pointer ${
                      isSelected ? 'bg-cyber-purple/20 text-obsidian-100 border border-cyber-purple/30' : 'text-obsidian-400 hover:text-obsidian-200 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-1.5 rounded bg-obsidian-850 border border-obsidian-800 shrink-0">
                        <FileText size={14} className={isSelected ? 'text-cyber-cyan' : ''} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                          {prompt.title}
                          {prompt.isPinned && <Pin size={10} className="text-cyber-cyan fill-cyber-cyan" />}
                          {prompt.isFavorite && <Star size={10} className="text-yellow-500 fill-yellow-500" />}
                        </div>
                        <div className="text-[10px] text-obsidian-600 truncate">{prompt.description || 'No description provided'}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      {cat && (
                        <span 
                          className="text-[9px] font-bold px-2 py-0.5 rounded border"
                          style={{ color: cat.color, borderColor: `${cat.color}25`, backgroundColor: `${cat.color}08` }}
                        >
                          {cat.name}
                        </span>
                      )}
                      <span className="text-[9px] text-obsidian-600 bg-obsidian-900 border border-obsidian-850 px-2 py-0.5 rounded font-mono">
                        {prompt.model}
                      </span>
                    </div>
                  </button>
                );
              }
            })
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-obsidian-850 bg-obsidian-950/20 text-[10px] text-obsidian-600">
          <div className="flex items-center gap-1">
            <kbd className="bg-obsidian-900 border border-obsidian-850 px-1 py-0.5 rounded font-mono">↑↓</kbd>
            <span>Navigate</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="bg-obsidian-900 border border-obsidian-850 px-1 py-0.5 rounded font-mono">Enter</kbd>
            <span>Select</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="bg-obsidian-900 border border-obsidian-850 px-1 py-0.5 rounded font-mono">Esc</kbd>
            <span>Close</span>
          </div>
          <div className="ml-auto font-medium text-cyber-violet">
            Spotlight Menu
          </div>
        </div>
      </div>
    </div>
  );
};
