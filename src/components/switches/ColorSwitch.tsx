import React from 'react';

interface ColorSwitchProps {
  value?: any;
  editable?: boolean;
  onChange?: (val: any) => void;
}

export const ColorSwitch: React.FC<ColorSwitchProps> = ({ value, editable = false, onChange }) => {
  const hex = value && typeof value === 'object' ? value.hex : (typeof value === 'string' ? value : '#8B5CF6');

  if (editable && typeof onChange === 'function') {
    return (
      <input
        type="color"
        value={hex}
        onChange={(e) => onChange({ hex: e.target.value, opacity: 1 })}
        className="w-8 h-8 rounded-full border"
        aria-label="Tile color"
      />
    );
  }

  return (
    <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: hex }} aria-hidden />
  );
};

export default ColorSwitch;
