import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import type { Category } from '../types';
import type { SwitchInstance } from '../core/models/switch';
import { SwitchRegistryLoader } from '../core/services/switchRegistryLoader';
import { SwitchResolver } from '../core/services/switchResolver';

interface CategoryEditorProps {
  category: Category | null;
  onClose: () => void;
  onSave: (category: Partial<Category> & { name: string }) => void;
}

export const CategoryEditor: React.FC<CategoryEditorProps> = ({ category, onClose, onSave }) => {
  const [name, setName] = useState(category?.name || '');
  const [icon, setIcon] = useState(category?.icon || 'Zap');
  const [color, setColor] = useState(category?.color || '#8B5CF6');
  const [switchDefs, setSwitchDefs] = useState<any[] | null>(null);
  const [switchInstances, setSwitchInstances] = useState<SwitchInstance[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const loader = new SwitchRegistryLoader(new URL('../config/switch_registry.json', import.meta.url));
        const registry = await loader.load();
        if (!mounted) return;
        setSwitchDefs(registry.switches || []);
        const resolver = new SwitchResolver(registry.switches || []);
        const defaults = resolver.buildDefaults('category');
        setSwitchInstances((category as any)?.switchInstances && Array.isArray((category as any).switchInstances) ? (category as any).switchInstances : defaults);
      } catch (e) {
        if (category && (category as any).switchInstances) setSwitchInstances((category as any).switchInstances);
      }
    };
    void load();
    return () => { mounted = false; };
  }, [category]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ id: category?.id, name: name.trim(), icon, color, switchInstances });
  };

  return (
    <div className="fixed inset-0 bg-obsidian-950/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="glass-panel w-full max-w-lg p-6 rounded-xl border border-obsidian-850">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold">{category ? 'Edit Category' : 'New Category'}</h3>
          <button onClick={onClose} className="text-obsidian-400">Close</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] uppercase text-obsidian-400">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-obsidian-950 border border-obsidian-800 px-2 py-2 rounded mt-1" />
          </div>

          <div className="flex items-center gap-3">
            <div>
              <label className="text-[10px] uppercase text-obsidian-400">Icon</label>
              <input value={icon} onChange={e => setIcon(e.target.value)} className="bg-obsidian-950 border border-obsidian-800 px-2 py-2 rounded mt-1" />
            </div>
            <div>
              <label className="text-[10px] uppercase text-obsidian-400">Color</label>
              <input type="color" value={color} onChange={e => setColor(e.target.value)} className="mt-1" />
            </div>
          </div>

          {switchDefs && (
            <div>
              <h4 className="text-xs font-bold text-obsidian-200 uppercase mb-2">Category Switch Defaults</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {switchDefs.map(def => {
                  const inst = switchInstances.find(si => si.switchId === def.id);
                  const enabled = Boolean(inst && inst.enabled);
                  const val = inst ? inst.value : def.defaultValue;
                  const setEnabled = (v: boolean) => setSwitchInstances(prev => {
                    const found = prev.find(p => p.switchId === def.id);
                    if (found) return prev.map(p => p.switchId === def.id ? { ...p, enabled: v, updatedAt: Date.now() } : p);
                    return [...prev, { switchId: def.id, value: def.defaultValue, enabled: v, scope: 'category', updatedAt: Date.now() }];
                  });
                  const setValue = (nv: any) => setSwitchInstances(prev => {
                    const found = prev.find(p => p.switchId === def.id);
                    if (found) return prev.map(p => p.switchId === def.id ? { ...p, value: nv, updatedAt: Date.now() } : p);
                    return [...prev, { switchId: def.id, value: nv, enabled: true, scope: 'category', updatedAt: Date.now() }];
                  });

                  return (
                    <div key={def.id} className="p-2 rounded border border-obsidian-800 bg-obsidian-950/40">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-obsidian-200">{def.name}</div>
                        <label className="text-xs text-obsidian-400">Enabled <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} /></label>
                      </div>
                      <div>
                        {def.renderer === 'ColorSwitch' ? (
                          <input type="color" value={(val && typeof val === 'object' && val.hex) ? val.hex : (typeof val === 'string' ? val : '#8B5CF6')} onChange={e => setValue({ hex: e.target.value, opacity: 1 })} />
                        ) : def.type === 'boolean' ? (
                          <input type="checkbox" checked={Boolean(val)} onChange={e => setValue(e.target.checked)} />
                        ) : (
                          <input type="text" value={typeof val === 'object' ? JSON.stringify(val) : String(val || '')} onChange={e => {
                            const raw = e.target.value;
                            try { setValue(JSON.parse(raw)); } catch { setValue(raw); }
                          }} className="w-full bg-obsidian-950 border border-obsidian-800 px-2 py-1 rounded" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 mt-4">
            <button onClick={onClose} className="px-3 py-1 rounded bg-obsidian-800">Cancel</button>
            <button onClick={handleSave} className="px-3 py-1 rounded bg-gradient-cyber text-white flex items-center gap-2"><Save size={14} />Save</button>
          </div>
        </div>
      </div>
    </div>
  );
};
