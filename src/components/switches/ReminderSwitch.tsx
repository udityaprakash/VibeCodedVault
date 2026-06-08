import React from 'react';
import { Bell } from 'lucide-react';

interface ReminderSwitchProps {
  value?: any;
}

export const ReminderSwitch: React.FC<ReminderSwitchProps> = ({ value }) => {
  const dt = value && typeof value === 'object' ? value.datetime : null;
  const title = value && typeof value === 'object' ? value.title : '';
  if (!dt) return null;

  const dateStr = typeof dt === 'number' ? new Date(dt).toLocaleString() : String(dt);

  return (
    <div className="flex items-center gap-2 text-[11px] text-obsidian-300">
      <Bell size={14} className="text-obsidian-400" />
      <div className="flex flex-col">
        <span className="font-semibold text-obsidian-200">{title || 'Reminder'}</span>
        <span className="text-xs text-obsidian-400">{dateStr}</span>
      </div>
    </div>
  );
};

export default ReminderSwitch;
