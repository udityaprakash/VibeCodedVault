import React from 'react';
import { StickyNote } from 'lucide-react';

interface NoteSwitchProps {
  value?: any;
}

export const NoteSwitch: React.FC<NoteSwitchProps> = ({ value }) => {
  const text = value && typeof value === 'object' ? (value.noteText || '') : (typeof value === 'string' ? value : '');
  if (!text) return null;
  return (
    <div className="flex items-center gap-2 text-[11px] text-obsidian-300">
      <StickyNote size={14} className="text-obsidian-400" />
      <span className="truncate max-w-[160px]">{text}</span>
    </div>
  );
};

export default NoteSwitch;
