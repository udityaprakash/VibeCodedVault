import React, { useState } from 'react';
import { 
  X, Plus, Trash2, Folder, Zap, Circle, Calendar,
  Type, CheckSquare, AlignLeft, Copy, Link, Palette, Clock, AlertTriangle
} from 'lucide-react';
import type { Category, RawSwitchData } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { SwitchFactory } from '../utils/switches';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: Partial<Category> & { name: string }) => void;
  categoryToEdit?: Category | null;
}

const PRESET_ICONS = ['Code', 'Image', 'Megaphone', 'PenTool', 'Zap', 'Target', 'FileText', 'MessageSquare', 'Layers', 'Smile'];
const PRESET_COLORS = ['#8B5CF6', '#06B6D4', '#10B981', '#F43F5E', '#F59E0B', '#EC4899', '#3B82F6', '#6366F1'];

const SWITCH_OPTIONS = [
  { type: 'strikethrough', name: 'Strikethrough Title', desc: 'Crosses out the prompt title text', icon: Type },
  { type: 'checkbox', name: 'Checkbox Status', desc: 'Adds a toggle checkbox (e.g. TODO / Done)', icon: CheckSquare },
  { type: 'textarea', name: 'Text Area Field', desc: 'Adds a large paragraphs input field', icon: AlignLeft },
  { type: 'copyable', name: 'Copyable Text Block', desc: 'Adds copyable text areas with quick-copy buttons', icon: Copy },
  { type: 'link', name: 'External Link', desc: 'Adds direct web links opening in default browser', icon: Link },
  { type: 'color', name: 'Custom Tile Color', desc: 'Applies transparency color layer to prompt cards', icon: Palette },
  { type: 'reminder', name: 'Scheduled Reminder', desc: 'Sets custom time reminders with system notifications', icon: Clock },
  { type: 'delete', name: 'Scheduled Auto Delete', desc: 'Automatically schedules removal of tiles to recycle bin', icon: AlertTriangle },
  { type: 'note', name: 'Calendar Note', desc: 'Overrides default title shown in the calendar view', icon: Calendar }
];

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  categoryToEdit = null
}) => {
  const [name, setName] = useState(categoryToEdit?.name || '');
  const [icon, setIcon] = useState(categoryToEdit?.icon || 'Zap');
  const [color, setColor] = useState(categoryToEdit?.color || '#8B5CF6');
  const [switches, setSwitches] = useState<RawSwitchData[]>(categoryToEdit?.switches || []);
  const [showAddMenu, setShowAddMenu] = useState(false);

  if (!isOpen) return null;

  // TODO: Implement handleAddSwitch to append preset switch
  const handleAddSwitch = (type: string) => {
    const existingCount = switches.filter(s => s.type === type).length;
    const isLimitReached = (type === 'textarea' || type === 'checkbox' || type === 'link')
      ? existingCount >= 3
      : existingCount >= 1;
    if (isLimitReached) return;
    
    const newSwitchObj = SwitchFactory.createDefault(type);
    setSwitches(prev => [...prev, newSwitchObj.toRaw()]);
    setShowAddMenu(false);
  };

  // TODO: Implement handleRemoveSwitch to delete preset switch
  const handleRemoveSwitch = (id: string) => {
    setSwitches(prev => prev.filter(s => s.id !== id));
  };

  // TODO: Implement handleUpdateSwitchLabel for customization
  const handleUpdateSwitchLabel = (id: string, newLabel: string) => {
    setSwitches(prev => prev.map(s => s.id === id ? { ...s, label: newLabel } : s));
  };

  // TODO: Implement handleUpdateSwitchValue for customized default values
  const handleUpdateSwitchValue = (id: string, newValue: any) => {
    setSwitches(prev => prev.map(s => s.id === id ? { ...s, value: newValue } : s));
  };

  const handleUpdateSwitchHighlight = (id: string, highlightOnChecked: boolean) => {
    setSwitches(prev => prev.map(s => s.id === id ? { ...s, highlightOnChecked } : s));
  };

  const handleUpdateSwitchStrikethrough = (id: string, strikeThroughOnChecked: boolean) => {
    setSwitches(prev => prev.map(s => s.id === id ? { ...s, strikeThroughOnChecked } : s));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim().slice(0, 30);
    if (!trimmed) return;

    onSave({
      id: categoryToEdit?.id,
      name: trimmed,
      icon,
      color,
      switches
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-obsidian-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-lg rounded-2xl border border-obsidian-850 bg-obsidian-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-obsidian-850 flex items-center justify-between bg-obsidian-950/40">
          <h3 className="text-sm font-bold text-obsidian-100 flex items-center gap-2">
            <Folder size={16} className="text-cyber-violet" />
            {categoryToEdit ? 'Modify Category' : 'Create Category'}
          </h3>
          <button onClick={onClose} className="text-obsidian-400 hover:text-obsidian-100 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Category Name */}
          <div>
            <label className="text-[10px] uppercase font-bold text-obsidian-400 tracking-wider block mb-1.5">Category Name</label>
            <input
              type="text"
              placeholder="e.g. Task Management, Social Media..."
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={30}
              className="w-full bg-obsidian-950 border border-obsidian-800 rounded-lg px-3.5 py-2 text-xs text-obsidian-100 focus-glow-violet"
              required
              autoFocus
            />
          </div>

          {/* Icon Selector Grid */}
          <div>
            <label className="text-[10px] uppercase font-bold text-obsidian-400 tracking-wider block mb-1.5">Preset Icon</label>
            <div className="grid grid-cols-5 gap-1.5">
              {PRESET_ICONS.map(ic => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={`p-2 rounded-lg flex justify-center items-center cursor-pointer transition-all hover:bg-obsidian-800 ${
                    icon === ic ? 'bg-cyber-violet/20 border border-cyber-violet' : 'bg-obsidian-950/60 border border-obsidian-850'
                  }`}
                >
                  <CategoryIcon name={ic} size={14} className="text-obsidian-200" />
                </button>
              ))}
            </div>
          </div>

          {/* Color Presets */}
          <div>
            <label className="text-[10px] uppercase font-bold text-obsidian-400 tracking-wider block mb-1.5">Accent Color</label>
            <div className="flex gap-2 flex-wrap items-center">
              {PRESET_COLORS.map(col => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setColor(col)}
                  className="w-5 h-5 rounded-full flex justify-center items-center cursor-pointer transition-transform hover:scale-110"
                  style={{ backgroundColor: col }}
                >
                  {color === col && <Circle size={6} className="text-white fill-white" />}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[10px] text-obsidian-500 font-semibold">{color}</span>
                <input
                  type="color"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className="w-6 h-6 rounded border border-obsidian-800 bg-transparent cursor-pointer"
                  title="Pick customized color"
                />
              </div>
            </div>
          </div>

          {/* Preset Switches Section */}
          <div className="border-t border-obsidian-850/60 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-[11px] font-bold text-obsidian-300 uppercase tracking-wider">Default Preset Switches</h4>
                <p className="text-[9px] text-obsidian-500 mt-0.5">These switches pre-populate when creating prompts under this category.</p>
              </div>

              {/* Add Switch Dropdown Trigger */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-cyber-violet/10 border border-cyber-violet/30 hover:bg-cyber-violet/20 text-cyber-violet cursor-pointer transition-all"
                >
                  <Plus size={11} />
                  Add Preset
                </button>

                {showAddMenu && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl border border-obsidian-800 bg-obsidian-950/95 backdrop-blur-md shadow-2xl p-1.5 z-50 max-h-60 overflow-y-auto">
                    <div className="text-[9px] uppercase tracking-wider text-obsidian-500 px-2 py-1">Available Switches</div>
                    {SWITCH_OPTIONS.map(opt => {
                      const existingCount = switches.filter(s => s.type === opt.type).length;
                      const isLimitReached = (opt.type === 'textarea' || opt.type === 'checkbox' || opt.type === 'link')
                        ? existingCount >= 3
                        : existingCount >= 1;
                      const IconComp = opt.icon;
                      return (
                        <button
                          key={opt.type}
                          type="button"
                          disabled={isLimitReached}
                          onClick={() => handleAddSwitch(opt.type)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-start gap-2.5 transition-all text-xs ${
                            isLimitReached
                              ? 'opacity-40 cursor-not-allowed text-obsidian-600'
                              : 'hover:bg-obsidian-850 text-obsidian-300 hover:text-obsidian-100 cursor-pointer'
                          }`}
                        >
                          <IconComp size={13} className="shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <div className="font-semibold">{opt.name}</div>
                            <div className="text-[9px] text-obsidian-500 truncate">{opt.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* List of current preset switches */}
            {switches.length === 0 ? (
              <div className="rounded-xl border border-dashed border-obsidian-850 p-4 text-center text-xs text-obsidian-550">
                No default preset switches. Add switches to pre-configure prompts in this category.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {switches.map((sw) => {
                  const opt = SWITCH_OPTIONS.find(o => o.type === sw.type);
                  const IconComp = opt?.icon || Zap;
                  
                  return (
                    <div key={sw.id} className="p-3 rounded-xl border border-obsidian-850 bg-obsidian-950/40 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <IconComp size={12} className="text-cyber-cyan" />
                          <span className="text-xs font-bold text-obsidian-200">{opt?.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSwitch(sw.id)}
                          className="text-obsidian-500 hover:text-cyber-rose transition-colors p-1"
                          title="Remove switch"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      {/* Customize parameters for default presets */}
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <div>
                          <label className="text-[8px] uppercase tracking-wider text-obsidian-500 block mb-0.5">Preset Label</label>
                          <input
                            type="text"
                            value={sw.label}
                            onChange={e => handleUpdateSwitchLabel(sw.id, e.target.value)}
                            className="w-full bg-obsidian-950 border border-obsidian-850 rounded px-2 py-1 text-[10px] text-obsidian-300"
                            placeholder="Change label"
                          />
                        </div>

                        {/* Custom values editing inside presets */}
                        {sw.type === 'color' && (
                          <div>
                            <label className="text-[8px] uppercase tracking-wider text-obsidian-500 block mb-0.5">Default Value</label>
                            <input
                              type="color"
                              value={sw.value}
                              onChange={e => handleUpdateSwitchValue(sw.id, e.target.value)}
                              className="w-full h-6 rounded border border-obsidian-850 bg-transparent cursor-pointer"
                            />
                          </div>
                        )}

                        {sw.type === 'strikethrough' && (
                          <div>
                            <label className="text-[8px] uppercase tracking-wider text-obsidian-500 block mb-0.5">Default Crossed Out?</label>
                            <select
                              value={String(sw.value)}
                              onChange={e => handleUpdateSwitchValue(sw.id, e.target.value === 'true')}
                              className="w-full bg-obsidian-950 border border-obsidian-850 rounded px-2 py-1 text-[10px] text-obsidian-300 cursor-pointer font-semibold"
                            >
                              <option value="false">No (Default)</option>
                              <option value="true">Yes</option>
                            </select>
                          </div>
                        )}

                        {sw.type === 'checkbox' && (
                          <div className="col-span-2 space-y-2 mt-1">
                            <div>
                              <label className="text-[8px] uppercase tracking-wider text-obsidian-500 block mb-0.5">Default Checked State</label>
                              <select
                                value={String(sw.value)}
                                onChange={e => handleUpdateSwitchValue(sw.id, e.target.value === 'true')}
                                className="w-full bg-obsidian-950 border border-obsidian-850 rounded px-2 py-1 text-[10px] text-obsidian-300 cursor-pointer font-semibold"
                              >
                                <option value="false">Unchecked (Default)</option>
                                <option value="true">Checked (Done)</option>
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-0.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] text-obsidian-400 font-medium">Highlight checked</span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSwitchHighlight(sw.id, sw.highlightOnChecked !== false ? false : true)}
                                  className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                    sw.highlightOnChecked !== false ? 'bg-cyber-violet' : 'bg-obsidian-850'
                                  }`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                      sw.highlightOnChecked !== false ? 'translate-x-3' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] text-obsidian-400 font-medium">Strikethrough checked</span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateSwitchStrikethrough(sw.id, sw.strikeThroughOnChecked === true ? false : true)}
                                  className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                    sw.strikeThroughOnChecked === true ? 'bg-cyber-violet' : 'bg-obsidian-850'
                                  }`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                      sw.strikeThroughOnChecked === true ? 'translate-x-3' : 'translate-x-0'
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {sw.type === 'textarea' && (
                          <div className="col-span-2 mt-1">
                            <label className="text-[8px] uppercase tracking-wider text-obsidian-500 block mb-0.5">Default Text Content</label>
                            <textarea
                              value={sw.value}
                              onChange={e => handleUpdateSwitchValue(sw.id, e.target.value)}
                              rows={7}
                              className="w-full bg-obsidian-950 border border-obsidian-850 rounded px-2 py-1 text-[10px] text-obsidian-300 resize-y font-mono leading-normal"
                              placeholder="Default value placeholder"
                            />
                          </div>
                        )}

                        {sw.type === 'copyable' && (
                          <div>
                            <label className="text-[8px] uppercase tracking-wider text-obsidian-500 block mb-0.5">Default Copy Value</label>
                            <input
                              type="text"
                              value={sw.value}
                              onChange={e => handleUpdateSwitchValue(sw.id, e.target.value)}
                              className="w-full bg-obsidian-950 border border-obsidian-850 rounded px-2 py-1 text-[10px] text-obsidian-300"
                              placeholder="Default copied text"
                            />
                          </div>
                        )}

                        {sw.type === 'link' && (
                          <div>
                            <label className="text-[8px] uppercase tracking-wider text-obsidian-500 block mb-0.5">Default URL</label>
                            <input
                              type="text"
                              value={sw.value}
                              onChange={e => handleUpdateSwitchValue(sw.id, e.target.value)}
                              className="w-full bg-obsidian-950 border border-obsidian-850 rounded px-2 py-1 text-[10px] text-obsidian-300"
                              placeholder="https://..."
                            />
                          </div>
                        )}

                        {sw.type === 'note' && (
                          <div>
                            <label className="text-[8px] uppercase tracking-wider text-obsidian-500 block mb-0.5">Default Note Content</label>
                            <input
                              type="text"
                              value={sw.value}
                              onChange={e => handleUpdateSwitchValue(sw.id, e.target.value)}
                              className="w-full bg-obsidian-950 border border-obsidian-850 rounded px-2 py-1 text-[10px] text-obsidian-300"
                              placeholder="Note shown on calendar"
                            />
                          </div>
                        )}

                        {(sw.type === 'reminder' || sw.type === 'delete') && (
                          <div className="col-span-2">
                            <p className="text-[9px] text-obsidian-500 italic mt-1.5">Scheduled dates and times can only be set during prompt initialization.</p>
                          </div>
                        )}

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-obsidian-850 bg-obsidian-950/40 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs border border-obsidian-800 bg-obsidian-900 text-obsidian-300 hover:bg-obsidian-850 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className={`rounded-lg px-5 py-2 text-xs font-semibold text-white bg-gradient-cyber shadow-glow-violet transition-opacity ${
              !name.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
            }`}
          >
            {categoryToEdit ? 'Save Changes' : 'Create Category'}
          </button>
        </div>

      </div>
    </div>
  );
};
