import React from 'react';
import { Copy } from 'lucide-react';
import { PromptActionService } from '../../core/services/promptActionService';

interface CopyableTextSwitchProps {
  value?: any;
  editable?: boolean;
  onChange?: (val: any) => void;
}

export const CopyableTextSwitch: React.FC<CopyableTextSwitchProps> = ({ value, editable = false, onChange }) => {
  const label = value && typeof value === 'object' ? (value.label || 'Copy') : 'Copy';
  const text = value && typeof value === 'object' ? (value.value || '') : (typeof value === 'string' ? value : '');
  const actionService = new PromptActionService();

  const handleCopy = async () => {
    await actionService.copyPromptContent(String(text || label), 'copy-switch');
  };

  if (editable) {
    return (
      <div className="flex items-center gap-2">
        <input className="bg-obsidian-950 border border-obsidian-850 px-2 py-1 rounded text-xs" value={text} onChange={e => onChange && onChange({ ...value, value: e.target.value })} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-obsidian-300 bg-obsidian-900 px-2 py-1 rounded">
        <Copy size={12} />
        <span className="truncate max-w-[160px]">{text || label}</span>
      </button>
    </div>
  );
};

export default CopyableTextSwitch;
