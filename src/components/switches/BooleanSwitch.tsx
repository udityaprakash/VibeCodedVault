import React from 'react';

interface BooleanSwitchProps {
  value?: any;
  editable?: boolean;
  onChange?: (val: boolean) => void;
}

export const BooleanSwitch: React.FC<BooleanSwitchProps> = ({ value, editable = false, onChange }) => {
  const v = typeof value === 'boolean' ? value : Boolean(value);

  if (editable) {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={v} onChange={e => onChange && onChange(e.target.checked)} />
        <span className="text-xs text-obsidian-300">{v ? 'On' : 'Off'}</span>
      </label>
    );
  }

  return (
    <span className={`px-2 py-0.5 rounded text-[11px] ${v ? 'bg-cyber-emerald/10 text-cyber-emerald' : 'bg-obsidian-900 text-obsidian-400'}`}>{v ? 'True' : 'False'}</span>
  );
};

export default BooleanSwitch;
