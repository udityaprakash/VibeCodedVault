import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface ReminderItem {
  promptId: string;
  title: string;
  datetime: number;
  description?: string;
  switchId: string;
}

interface ReminderPanelProps {
  onClose: () => void;
  onOpenPrompt: (promptId: string) => void;
}

export const ReminderPanel: React.FC<ReminderPanelProps> = ({ onClose, onOpenPrompt }) => {
  const [items, setItems] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      if (!window.api) {
        setItems([]);
        return;
      }
      const pending = await (window.api as any).getPendingReminders();
      setItems(Array.isArray(pending) ? pending : []);
    } catch (e) {
      console.error('Failed to load reminders', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    const handler = () => { void load(); };
    if ((window.api as any)?.onReminderFired) (window.api as any).onReminderFired(handler);
    return () => {};
  }, []);

  const handleSnooze = async (item: ReminderItem) => {
    const minutes = parseInt(prompt('Snooze minutes?', '10') || '10', 10) || 10;
    try {
      await (window.api as any).snoozeReminder(item.promptId, item.switchId, minutes);
      await load();
    } catch (e) {
      console.error('Snooze failed', e);
    }
  };

  const handleDismiss = async (item: ReminderItem) => {
    try {
      await (window.api as any).markReminderFired(item.promptId, item.switchId);
      await load();
    } catch (e) {
      console.error('Dismiss failed', e);
    }
  };

  return (
    <div className="fixed inset-0 bg-obsidian-950/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="w-full max-w-2xl bg-obsidian-900 p-4 rounded-xl border border-obsidian-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold flex items-center gap-2"><Clock size={14} /> Pending Reminders</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => load()} className="text-obsidian-400">Refresh</button>
            <button onClick={onClose} className="text-obsidian-400">Close</button>
          </div>
        </div>

        {loading ? (
          <div className="text-xs text-obsidian-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-xs text-obsidian-500">No pending reminders.</div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {items.map(it => (
              <div key={`${it.promptId}-${it.switchId}`} className="flex items-start justify-between bg-obsidian-950 p-2 rounded">
                <div className="flex-1">
                  <div className="font-semibold text-obsidian-200 cursor-pointer" onClick={() => { onOpenPrompt(it.promptId); onClose(); }}>{it.title}</div>
                  <div className="text-xs text-obsidian-400">{new Date(it.datetime).toLocaleString()}</div>
                  {it.description && <div className="text-xs text-obsidian-500 mt-1">{it.description}</div>}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button onClick={() => handleSnooze(it)} className="px-2 py-1 rounded bg-obsidian-800 text-obsidian-200">Snooze</button>
                  <button onClick={() => handleDismiss(it)} className="px-2 py-1 rounded bg-cyber-rose/10 text-cyber-rose">Dismiss</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReminderPanel;
