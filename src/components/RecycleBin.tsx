import React from 'react';
import { X, Trash2, RotateCcw, AlertOctagon, Zap } from 'lucide-react';
import type { Prompt } from '../types';

interface RecycleBinProps {
  isOpen: boolean;
  onClose: () => void;
  deletedPrompts: Prompt[];
  onRestore: (promptId: string) => void;
  onDeletePermanently: (promptId: string) => void;
  onEmptyTrash: () => void;
}

export const RecycleBin: React.FC<RecycleBinProps> = ({
  isOpen,
  onClose,
  deletedPrompts = [],
  onRestore,
  onDeletePermanently,
  onEmptyTrash
}) => {
  if (!isOpen) return null;

  const handleEmptyBin = () => {
    if (confirm('Are you sure you want to permanently delete all prompts in the Recycle Bin? This action is irreversible.')) {
      onEmptyTrash();
    }
  };

  const handleDeletePermanently = (promptId: string, title: string) => {
    if (confirm(`Are you sure you want to permanently delete "${title}"?`)) {
      onDeletePermanently(promptId);
    }
  };

  const getDaysRemaining = (deletedAt?: number) => {
    if (!deletedAt) return '30 days';
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const elapsed = Date.now() - deletedAt;
    const remainingMs = Math.max(0, thirtyDaysMs - elapsed);
    const days = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
    return days === 1 ? '1 day' : `${days} days`;
  };

  return (
    <div className="fixed inset-0 bg-obsidian-950/80 backdrop-blur-md flex justify-end z-[500] animate-in slide-in-from-right duration-300">
      <div className="glass-panel w-full max-w-[550px] h-full flex flex-col border-l border-obsidian-850 shadow-2xl overflow-hidden">
        
        {/* Recycle Bin Header */}
        <div className="px-6 py-4 border-b border-obsidian-850 bg-obsidian-950/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trash2 size={16} className="text-cyber-rose" />
            <h3 className="text-sm font-bold text-obsidian-100 uppercase tracking-widest">
              Recycle Bin
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-obsidian-400 hover:text-obsidian-100 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Warning notification */}
        <div className="bg-cyber-rose/5 border-b border-cyber-rose/20 px-6 py-3 flex items-start gap-2.5">
          <AlertOctagon size={16} className="text-cyber-rose shrink-0 mt-0.5" />
          <p className="text-[10px] text-cyber-rose/80 leading-relaxed font-semibold">
            Deleted prompts are stored here for up to 30 days before being permanently purged. They are excluded from workspace exports and searches.
          </p>
        </div>

        {/* Deleted Prompts List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {deletedPrompts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-obsidian-650 space-y-3">
              <Trash2 size={40} className="stroke-[1.2] text-obsidian-750" />
              <div className="text-center">
                <span className="text-xs font-semibold block text-obsidian-400">Recycle Bin is empty</span>
                <span className="text-[10px] text-obsidian-600 block mt-1">No recently deleted prompt templates.</span>
              </div>
            </div>
          ) : (
            deletedPrompts.map(p => (
              <div key={p.id} className="p-4 rounded-xl border border-obsidian-850 bg-obsidian-950/30 flex flex-col justify-between hover:border-obsidian-800 transition-colors">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[9px] uppercase font-bold text-obsidian-600 bg-obsidian-950 px-2 py-0.5 rounded border border-obsidian-850">
                      Auto-purge in {getDaysRemaining(p.deletedAt)}
                    </span>
                    <span className="text-[9px] text-obsidian-600">
                      Deleted: {p.deletedAt ? new Date(p.deletedAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-obsidian-200 mb-1 line-clamp-1">{p.title}</h4>
                  <p className="text-[10px] text-obsidian-400 line-clamp-2 leading-relaxed mb-3">{p.description || 'No description.'}</p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-obsidian-850/50">
                  <button
                    onClick={() => onRestore(p.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan hover:bg-cyber-cyan/20 cursor-pointer transition-colors"
                  >
                    <RotateCcw size={11} />
                    Restore
                  </button>
                  <button
                    onClick={() => handleDeletePermanently(p.id, p.title)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-cyber-rose/10 border border-cyber-rose/30 text-cyber-rose hover:bg-cyber-rose/20 cursor-pointer transition-colors"
                  >
                    <Trash2 size={11} />
                    Purge
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer actions */}
        {deletedPrompts.length > 0 && (
          <div className="px-6 py-4 border-t border-obsidian-850 bg-obsidian-950/40 flex justify-end shrink-0">
            <button
              onClick={handleEmptyBin}
              className="w-full flex items-center justify-center gap-2 bg-cyber-rose text-white font-semibold py-2.5 rounded-lg text-xs hover:opacity-95 shadow-glow-violet cursor-pointer transition-opacity"
            >
              <Trash2 size={13} />
              Empty Recycle Bin
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
