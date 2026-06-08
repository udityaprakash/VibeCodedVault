import React, { useEffect, useState } from 'react';
import type { Prompt } from '../types';

interface RecycleBinProps {
  onClose: () => void;
}

export const RecycleBin: React.FC<RecycleBinProps> = ({ onClose }) => {
  const [deleted, setDeleted] = useState<Prompt[]>([]);

  const load = async () => {
    if (!window.api || !window.api.getAllData) return;
    const data = await window.api.getAllData();
    setDeleted((data.prompts || []).filter((p: any) => p.isDeleted));
  };

  useEffect(() => {
    void load();
  }, []);

  const handleRestore = async (id: string) => {
    if (!window.api) return;
    await (window.api as any).restorePrompt(id);
    await load();
  };

  const handlePurge = async (id: string) => {
    if (!window.api) return;
    if (!confirm('Permanently delete this prompt? This cannot be undone.')) return;
    await (window.api as any).permanentlyDeletePrompt(id);
    await load();
  };

  return (
    <div className="fixed inset-0 bg-obsidian-950/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="w-full max-w-2xl bg-obsidian-900 p-4 rounded-xl border border-obsidian-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold">Recycle Bin</h3>
          <button onClick={onClose} className="text-obsidian-400">Close</button>
        </div>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {deleted.length === 0 ? (
            <div className="text-xs text-obsidian-500">No deleted prompts.</div>
          ) : deleted.map(d => (
            <div key={d.id} className="flex items-center justify-between bg-obsidian-950 p-2 rounded">
              <div className="truncate">
                <div className="font-semibold text-obsidian-200">{d.title}</div>
                <div className="text-xs text-obsidian-400">{d.description}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleRestore(d.id)} className="px-2 py-1 rounded bg-obsidian-800 text-obsidian-200">Restore</button>
                <button onClick={() => handlePurge(d.id)} className="px-2 py-1 rounded bg-cyber-rose/10 text-cyber-rose">Permanently Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RecycleBin;
