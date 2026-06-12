import { useState, useEffect } from 'react';
import { 
  Save, Sparkles, Copy, Check, Calendar, History, 
  Layers, Pin, Star, Info, Settings, Eye, Edit, Trash2, Plus,
  Type, CheckSquare, AlignLeft, Link, Palette, Clock, AlertTriangle
} from 'lucide-react';
import type { Prompt, Category, RawSwitchData } from '../types';
import {
  CUSTOM_MODELS_UPDATED_EVENT,
  PRESET_MODELS,
  getCustomModels,
  normalizeModelName,
  resolveExistingModelName,
  saveCustomModels,
} from '../utils/aiModels';
import { SwitchFactory } from '../utils/switches';

interface PromptEditorProps {
  prompt: Prompt | null; // Null means create new
  categories: Category[];
  onClose: () => void;
  onSave: (prompt: Partial<Prompt> & { title: string; content: string }) => void;
  onDelete?: (promptId: string) => void;
}

const CUSTOM_MODEL_VALUE = '__custom__';

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

export const PromptEditor: React.FC<PromptEditorProps> = ({
  prompt,
  categories,
  onClose,
  onSave,
  onDelete
}) => {
  // Main form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [model, setModel] = useState('General');
  const [customModels, setCustomModels] = useState<string[]>(() => getCustomModels());
  const [customModelInput, setCustomModelInput] = useState('');
  const [showCustomModelInput, setShowCustomModelInput] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Switches state
  const [promptSwitches, setPromptSwitches] = useState<RawSwitchData[]>([]);
  const [showAddSwitchMenu, setShowAddSwitchMenu] = useState(false);

  // Tab views
  const [activeTab, setActiveTab] = useState<'editor' | 'compiler' | 'history'>('editor');
  
  // Variables / Template placeholders states
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [copiedCompiled, setCopiedCompiled] = useState(false);
  
  // AI Polish states
  const [polishing, setPolishing] = useState(false);

  const allModelOptions = [...PRESET_MODELS, ...customModels];

  // Sync with model updates from Settings panel or other components
  useEffect(() => {
    const syncModels = () => setCustomModels(getCustomModels());
    window.addEventListener(CUSTOM_MODELS_UPDATED_EVENT, syncModels as EventListener);
    window.addEventListener('storage', syncModels);
    return () => {
      window.removeEventListener(CUSTOM_MODELS_UPDATED_EVENT, syncModels as EventListener);
      window.removeEventListener('storage', syncModels);
    };
  }, []);

  const addCustomModel = (rawModelName: string) => {
    const normalized = normalizeModelName(rawModelName);
    if (!normalized) {
      return;
    }

    const existing = resolveExistingModelName(normalized, customModels);
    if (existing) {
      setModel(existing);
      setCustomModelInput('');
      setShowCustomModelInput(false);
      return;
    }

    const nextModels = saveCustomModels([...customModels, normalized]);
    setCustomModels(nextModels);
    setModel(normalized);
    setCustomModelInput('');
    setShowCustomModelInput(false);
  };

  // Load prompt data on select/change
  useEffect(() => {
    if (prompt) {
      setTitle(prompt.title);
      setDescription(prompt.description || '');
      setContent(prompt.content);
      setCategoryId(prompt.categoryId);
      setModel(prompt.model);
      setShowCustomModelInput(false);
      setCustomModelInput('');
      setTagsInput(prompt.tags ? prompt.tags.join(', ') : '');
      setIsPinned(prompt.isPinned || false);
      setIsFavorite(prompt.isFavorite || false);
      setPromptSwitches(prompt.switches || []);
      
      // Parse initial placeholders
      const vars = extractPlaceholders(prompt.content);
      const initialVars: Record<string, string> = {};
      vars.forEach(v => {
        initialVars[v] = '';
      });
      setVariables(initialVars);
      setActiveTab('editor');
    } else {
      // Setup default seed for new prompt
      setTitle('');
      setDescription('');
      setContent('');
      
      const firstCatId = categories.length > 0 ? categories[0].id : null;
      setCategoryId(firstCatId);
      
      // Load first category preset switches if exist
      if (firstCatId) {
        const cat = categories.find(c => c.id === firstCatId);
        setPromptSwitches(
          cat?.switches?.map(s => ({
            ...s,
            id: 'sw_' + Math.random().toString(36).substr(2, 9)
          })) || []
        );
      } else {
        setPromptSwitches([]);
      }

      setModel('General');
      setShowCustomModelInput(false);
      setCustomModelInput('');
      setTagsInput('');
      setIsPinned(false);
      setIsFavorite(false);
      setVariables({});
      setActiveTab('editor');
    }
  }, [prompt, categories]);

  // Ensure edited prompts with unknown models become available in future dropdown usage
  useEffect(() => {
    if (!prompt?.model) {
      return;
    }

    const normalized = prompt.model.trim();
    if (!normalized) {
      return;
    }

    const existsInPreset = PRESET_MODELS.some(item => item.toLowerCase() === normalized.toLowerCase());
    const existsInCustom = customModels.some(item => item.toLowerCase() === normalized.toLowerCase());
    if (existsInPreset || existsInCustom) {
      return;
    }

    const nextModels = saveCustomModels([...customModels, normalized]);
    setCustomModels(nextModels);
  }, [customModels, prompt?.model]);

  // Extract variables in double braces {{variable}}
  const extractPlaceholders = (text: string): string[] => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = new Set<string>();
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.add(match[1].trim());
    }
    return Array.from(matches);
  };

  // Re-run extraction when content changes in editor
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    
    const vars = extractPlaceholders(val);
    const updatedVars = { ...variables };
    
    // Clear out unused variables, retain filled ones, add new ones
    vars.forEach(v => {
      if (updatedVars[v] === undefined) {
        updatedVars[v] = '';
      }
    });
    
    // Remove old ones
    Object.keys(updatedVars).forEach(k => {
      if (!vars.includes(k)) {
        delete updatedVars[k];
      }
    });
    
    setVariables(updatedVars);
  };

  // Compile prompt by replacing placeholders with form values
  const getCompiledContent = () => {
    let result = content;
    Object.entries(variables).forEach(([key, val]) => {
      const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, 'g');
      result = result.replace(regex, val || `{{${key}}}`);
    });
    return result;
  };

  const handleCopyCompiled = () => {
    const compiledText = getCompiledContent();
    navigator.clipboard.writeText(compiledText);
    setCopiedCompiled(true);
    
    if (prompt && window.api && window.api.incrementUsage) {
      window.api.incrementUsage(prompt.id);
    }
    
    setTimeout(() => setCopiedCompiled(false), 2000);
  };

  // Simulated AI polisher that expands prompts elegantly
  const handleAIPolish = () => {
    if (!content.trim()) return;
    setPolishing(true);

    setTimeout(() => {
      const polished = `[Structure / Intent: High-Fidelity Professional Output]\n\n` +
        `Role: You are an elite domain expert. Maintain maximum specificity, depth, and structured clarity in your responses.\n\n` +
        `Instructions:\n` +
        `- Focus on elegant presentation and state-of-the-art parameters.\n` +
        `- Follow strict type-safety boundaries where applicable.\n` +
        `- Avoid generic guidelines; prioritize advanced optimization and curated design models.\n\n` +
        `Core Prompt Task:\n` +
        content;
      
      setContent(polished);
      setPolishing(false);
      
      // Update variables based on new polished text
      const vars = extractPlaceholders(polished);
      const updatedVars: Record<string, string> = {};
      vars.forEach(v => {
        updatedVars[v] = variables[v] || '';
      });
      setVariables(updatedVars);
    }, 1200);
  };

  // Revert version callback
  const handleRevertVersion = (historicContent: string) => {
    setContent(historicContent);
    setActiveTab('editor');
    
    const vars = extractPlaceholders(historicContent);
    const updatedVars: Record<string, string> = {};
    vars.forEach(v => {
      updatedVars[v] = '';
    });
    setVariables(updatedVars);
  };

  // Dynamic switches management
  const handleCategoryChange = (newCatId: string | null) => {
    setCategoryId(newCatId);
    if (!newCatId) return;

    const cat = categories.find(c => c.id === newCatId);
    if (cat && cat.switches) {
      // Overwrite or append preset switches
      setPromptSwitches(prev => {
        const next = [...prev];
        cat.switches?.forEach(catSw => {
          const exists = next.some(s => s.type === catSw.type);
          if (!exists) {
            next.push({
              ...catSw,
              id: 'sw_' + Math.random().toString(36).substr(2, 9)
            });
          }
        });
        return next;
      });
    }
  };

  const handleAddSwitch = (type: string) => {
    if (promptSwitches.some(s => s.type === type)) return;
    const defaultSw = SwitchFactory.createDefault(type);
    setPromptSwitches(prev => [...prev, defaultSw.toRaw()]);
    setShowAddSwitchMenu(false);
  };

  const handleRemoveSwitch = (id: string) => {
    setPromptSwitches(prev => prev.filter(s => s.id !== id));
  };

  const handleUpdateSwitchLabel = (id: string, newLabel: string) => {
    setPromptSwitches(prev => prev.map(s => s.id === id ? { ...s, label: newLabel } : s));
  };

  const handleUpdateSwitchValue = (id: string, newValue: any) => {
    setPromptSwitches(prev => prev.map(s => s.id === id ? { ...s, value: newValue } : s));
  };

  const handleSave = () => {
    if (!title.trim() || !content.trim()) return;

    const tags = tagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    onSave({
      id: prompt?.id,
      title: title.trim(),
      description: description.trim(),
      content: content.trim(),
      tags,
      categoryId,
      model: model.trim() || 'General',
      isPinned,
      isFavorite,
      switches: promptSwitches
    });
  };

  const variableKeys = Object.keys(variables);

  return (
    <div className="fixed inset-0 bg-obsidian-950/80 backdrop-blur-md flex justify-end z-[500] animate-in slide-in-from-right duration-300">
      <div className="glass-panel w-full max-w-[800px] h-full flex flex-col border-l border-obsidian-850 shadow-2xl overflow-hidden">
        
        {/* Editor Window Chrome Header */}
        <div className="px-6 py-4 border-b border-obsidian-850 bg-obsidian-950/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5 shrink-0">
              <button 
                onClick={onClose}
                className="w-3 h-3 rounded-full bg-cyber-rose/80 hover:bg-cyber-rose cursor-pointer transition-colors"
                title="Discard changes and exit"
              />
              <button 
                className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 cursor-not-allowed"
                disabled
              />
              <button 
                onClick={handleSave}
                className="w-3 h-3 rounded-full bg-cyber-emerald hover:bg-cyber-emerald/80 cursor-pointer transition-colors"
                title="Save changes"
              />
            </div>
            <h3 className="text-xs font-bold text-obsidian-400 uppercase tracking-widest border-l border-obsidian-800 pl-3">
              {prompt ? 'Edit Template' : 'New Template'}
            </h3>
          </div>

          {/* Tab Navigation */}
          <div className="titlebar-nodrag flex items-center gap-1 bg-obsidian-950 border border-obsidian-850 rounded-lg p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1 rounded-md font-semibold cursor-pointer transition-all titlebar-nodrag ${
                activeTab === 'editor' ? 'bg-obsidian-800 text-obsidian-100 shadow' : 'text-obsidian-400 hover:text-obsidian-200'
              }`}
            >
              <span className="pointer-events-none flex items-center gap-1.5">
                <Edit size={12} />
                Editor
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('compiler')}
              className={`px-3 py-1 rounded-md font-semibold cursor-pointer transition-all relative titlebar-nodrag ${
                activeTab === 'compiler' ? 'bg-obsidian-800 text-obsidian-100 shadow' : 'text-obsidian-400 hover:text-obsidian-200'
              }`}
            >
              <span className="pointer-events-none flex items-center gap-1.5">
                <Eye size={12} />
                Compiler
                {variableKeys.length > 0 && (
                  <span className="pointer-events-none absolute -top-1 -right-1 bg-cyber-cyan text-black font-extrabold text-[8px] h-4 w-4 rounded-full flex items-center justify-center border border-obsidian-950">
                    {variableKeys.length}
                  </span>
                )}
              </span>
            </button>
            {prompt && (
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1 rounded-md font-semibold cursor-pointer transition-all titlebar-nodrag ${
                  activeTab === 'history' ? 'bg-obsidian-800 text-obsidian-100 shadow' : 'text-obsidian-400 hover:text-obsidian-200'
                }`}
              >
                <span className="pointer-events-none flex items-center gap-1.5">
                  <History size={12} />
                  Revisions
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Content Workspace */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          
          {activeTab === 'editor' && (
            <div className="space-y-5">
              
              {/* Row 1: Title & Pin/Favorite state */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex-1 w-full">
                  <label className="text-[10px] uppercase font-bold text-obsidian-400 tracking-wider block mb-1.5">Title</label>
                  <input
                    type="text"
                    placeholder="Enter an elegant prompt title..."
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-obsidian-950/80 border border-obsidian-850 focus-glow-violet px-3 py-2 rounded-lg text-sm text-obsidian-100 font-semibold"
                  />
                </div>
                
                {/* Favorites toggles */}
                <div className="flex gap-2 shrink-0 pt-5">
                  <button
                    onClick={() => setIsPinned(!isPinned)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                      isPinned 
                        ? 'bg-cyber-cyan/10 border-cyber-cyan/30 text-cyber-cyan' 
                        : 'bg-obsidian-950 border-obsidian-850 text-obsidian-400 hover:text-obsidian-200'
                    }`}
                  >
                    <Pin size={12} className={isPinned ? 'fill-cyber-cyan/15' : ''} />
                    Pin
                  </button>

                  <button
                    onClick={() => setIsFavorite(!isFavorite)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                      isFavorite 
                        ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' 
                        : 'bg-obsidian-950 border-obsidian-850 text-obsidian-400 hover:text-obsidian-200'
                    }`}
                  >
                    <Star size={12} className={isFavorite ? 'fill-yellow-500/15' : ''} />
                    Favorite
                  </button>
                </div>
              </div>

              {/* Row 2: Description */}
              <div>
                <label className="text-[10px] uppercase font-bold text-obsidian-400 tracking-wider block mb-1.5">Description</label>
                <input
                  type="text"
                  placeholder="Describe what this prompt achieves (e.g. creates detailed portraits, code boilerplate...)"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-obsidian-950/80 border border-obsidian-850 focus-glow-violet px-3 py-2 rounded-lg text-xs text-obsidian-400"
                />
              </div>

              {/* Row 3: Category & Compatibility */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-obsidian-400 tracking-wider block mb-1.5">Category</label>
                  <select
                    value={categoryId || ''}
                    onChange={e => handleCategoryChange(e.target.value || null)}
                    className="w-full bg-obsidian-950/80 border border-obsidian-850 focus-glow-violet px-3 py-2 rounded-lg text-xs text-obsidian-300 font-semibold cursor-pointer"
                  >
                    <option value="">Uncategorized / General</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-obsidian-400 tracking-wider block mb-1.5">Compatibility</label>
                  <select
                    value={model}
                    onChange={e => {
                      if (e.target.value === CUSTOM_MODEL_VALUE) {
                        setShowCustomModelInput(true);
                        return;
                      }
                      setModel(e.target.value);
                      setShowCustomModelInput(false);
                    }}
                    className="w-full bg-obsidian-950/80 border border-obsidian-850 focus-glow-violet px-3 py-2 rounded-lg text-xs text-obsidian-300 font-semibold cursor-pointer"
                  >
                    {allModelOptions.map(m => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                    <option value={CUSTOM_MODEL_VALUE}>+ Custom compatibility tag...</option>
                  </select>

                  {showCustomModelInput && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Enter custom compatibility tag"
                        value={customModelInput}
                        onChange={e => setCustomModelInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addCustomModel(customModelInput);
                          }
                        }}
                        className="flex-1 bg-obsidian-950/80 border border-obsidian-850 focus-glow-violet px-3 py-2 rounded-lg text-xs text-obsidian-300"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => addCustomModel(customModelInput)}
                        className="px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-cyber-violet/15 border border-cyber-violet/40 text-cyber-violet hover:bg-cyber-violet/25 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 4: Prompt Content Canvas & AI Polish */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] uppercase font-bold text-obsidian-400 tracking-wider flex items-center gap-1.5">
                    Prompt Prompt Text
                    <span className="cursor-help" title="Use double curly braces like {{topic}} to declare variables that generate inputs dynamically in compile view.">
                      <Info size={12} className="text-obsidian-600" />
                    </span>
                  </label>
                  
                  {/* AI Polish Trigger Button */}
                  <button
                    onClick={handleAIPolish}
                    disabled={polishing || !content.trim()}
                    className={`flex items-center gap-1 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider cursor-pointer border transition-all ${
                      polishing 
                        ? 'bg-cyber-violet/20 border-cyber-violet text-white animate-pulse'
                        : 'bg-obsidian-950 border-obsidian-850 hover:border-cyber-violet text-cyber-violet'
                    }`}
                  >
                    <Sparkles size={11} className={polishing ? 'animate-spin' : ''} />
                    {polishing ? 'Polishing...' : 'AI Polish Prompt'}
                  </button>
                </div>

                <textarea
                  placeholder="Write your prompt content here... Use {{variableName}} to define fillable parameters. E.g. 'Generate a logo about {{topic}} using {{colors}} color scheme.'"
                  value={content}
                  onChange={handleContentChange}
                  rows={8}
                  className="w-full bg-obsidian-950/80 border border-obsidian-850 focus-glow-violet p-4 rounded-xl text-xs text-obsidian-300 font-mono leading-relaxed resize-y focus:outline-none"
                />
              </div>

              {/* Row 5: Tags list */}
              <div>
                <label className="text-[10px] uppercase font-bold text-obsidian-400 tracking-wider block mb-1.5">Tags (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. writing, midjourney, coding, typescript"
                  value={tagsInput}
                  onChange={e => setTagsInput(e.target.value)}
                  className="w-full bg-obsidian-950/80 border border-obsidian-850 focus-glow-violet px-3 py-2 rounded-lg text-xs text-obsidian-400 placeholder-obsidian-750"
                />
              </div>

              {/* Dynamic Switches Customization Workspace */}
              {promptSwitches.length > 0 && (
                <div className="border-t border-obsidian-850/60 pt-4 space-y-3">
                  <h4 className="text-[10px] font-bold text-obsidian-400 uppercase tracking-widest">Active Switches Configuration</h4>
                  <div className="space-y-3">
                    {promptSwitches.map((sw) => {
                      const opt = SWITCH_OPTIONS.find(o => o.type === sw.type);
                      const IconComp = opt?.icon || Info;

                      return (
                        <div key={sw.id} className="p-4 rounded-xl border border-obsidian-850 bg-obsidian-950/30 space-y-3 transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <IconComp size={12} className="text-cyber-violet" />
                              <span className="text-xs font-bold text-obsidian-200">{opt?.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveSwitch(sw.id)}
                              className="text-obsidian-500 hover:text-cyber-rose transition-colors p-1"
                              title="Delete Switch"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            {/* Switch Label configuration */}
                            <div>
                              <label className="text-[8px] uppercase tracking-wider text-obsidian-550 block mb-0.5">Label</label>
                              <input
                                type="text"
                                value={sw.label}
                                onChange={e => handleUpdateSwitchLabel(sw.id, e.target.value)}
                                className="w-full bg-obsidian-950 border border-obsidian-850 rounded px-2.5 py-1 text-[11px] text-obsidian-300"
                                placeholder="Configure label text"
                              />
                            </div>

                            {/* Specific Value customization inputs based on switch type */}
                            {sw.type === 'color' && (
                              <div>
                                <label className="text-[8px] uppercase tracking-wider text-obsidian-550 block mb-0.5">Value (Color Accent)</label>
                                <input
                                  type="color"
                                  value={sw.value}
                                  onChange={e => handleUpdateSwitchValue(sw.id, e.target.value)}
                                  className="w-full h-7 rounded border border-obsidian-850 bg-transparent cursor-pointer"
                                />
                              </div>
                            )}

                            {sw.type === 'strikethrough' && (
                              <div>
                                <label className="text-[8px] uppercase tracking-wider text-obsidian-550 block mb-0.5">Enable Strikethrough?</label>
                                <select
                                  value={String(sw.value)}
                                  onChange={e => handleUpdateSwitchValue(sw.id, e.target.value === 'true')}
                                  className="w-full bg-obsidian-950 border border-obsidian-850 rounded px-2 py-1 text-[11px] text-obsidian-300 font-semibold cursor-pointer"
                                >
                                  <option value="false">Unchecked (No strikethrough)</option>
                                  <option value="true">Checked (Cross out title)</option>
                                </select>
                              </div>
                            )}

                            {sw.type === 'checkbox' && (
                              <div>
                                <label className="text-[8px] uppercase tracking-wider text-obsidian-550 block mb-0.5">Default Checkbox Done State</label>
                                <select
                                  value={String(sw.value)}
                                  onChange={e => handleUpdateSwitchValue(sw.id, e.target.value === 'true')}
                                  className="w-full bg-obsidian-950 border border-obsidian-850 rounded px-2 py-1 text-[11px] text-obsidian-300 font-semibold cursor-pointer"
                                >
                                  <option value="false">TODO (Unchecked)</option>
                                  <option value="true">DONE (Checked)</option>
                                </select>
                              </div>
                            )}

                            {sw.type === 'textarea' && (
                              <div>
                                <label className="text-[8px] uppercase tracking-wider text-obsidian-550 block mb-0.5">Paragraph Content</label>
                                <textarea
                                  value={sw.value}
                                  onChange={e => handleUpdateSwitchValue(sw.id, e.target.value)}
                                  rows={1}
                                  className="w-full bg-obsidian-950 border border-obsidian-850 rounded px-2.5 py-1 text-[11px] text-obsidian-300 resize-none font-mono"
                                  placeholder="Default text field value"
                                />
                              </div>
                            )}

                            {sw.type === 'copyable' && (
                              <div>
                                <label className="text-[8px] uppercase tracking-wider text-obsidian-550 block mb-0.5">Copyable Text Value</label>
                                <textarea
                                  value={sw.value}
                                  onChange={e => handleUpdateSwitchValue(sw.id, e.target.value)}
                                  rows={1}
                                  className="w-full bg-obsidian-950 border border-obsidian-850 rounded px-2.5 py-1 text-[11px] text-obsidian-300 resize-none font-mono"
                                  placeholder="Text to be copied"
                                />
                              </div>
                            )}

                            {sw.type === 'link' && (
                              <div>
                                <label className="text-[8px] uppercase tracking-wider text-obsidian-550 block mb-0.5">Target URL Link</label>
                                <input
                                  type="text"
                                  value={sw.value}
                                  onChange={e => handleUpdateSwitchValue(sw.id, e.target.value)}
                                  className="w-full bg-obsidian-950 border border-obsidian-850 rounded px-2.5 py-1 text-[11px] text-obsidian-300"
                                  placeholder="https://..."
                                />
                              </div>
                            )}

                            {sw.type === 'note' && (
                              <div>
                                <label className="text-[8px] uppercase tracking-wider text-obsidian-550 block mb-0.5">Note (Calendar display override)</label>
                                <input
                                  type="text"
                                  value={sw.value}
                                  onChange={e => handleUpdateSwitchValue(sw.id, e.target.value)}
                                  className="w-full bg-obsidian-950 border border-obsidian-850 rounded px-2.5 py-1 text-[11px] text-obsidian-300"
                                  placeholder="Default title override"
                                />
                              </div>
                            )}

                            {sw.type === 'reminder' && (
                              <div className="col-span-2 grid grid-cols-2 gap-3 border-t border-obsidian-850/50 pt-2 mt-1">
                                <div>
                                  <label className="text-[8px] uppercase tracking-wider text-obsidian-550 block mb-0.5">Reminder Date & Time</label>
                                  <input
                                    type="datetime-local"
                                    value={sw.value?.dateTime || ''}
                                    onChange={e => handleUpdateSwitchValue(sw.id, { ...sw.value, dateTime: e.target.value, notified: false })}
                                    className="w-full bg-obsidian-950 border border-obsidian-850 rounded px-2 py-1 text-[11px] text-obsidian-300 cursor-pointer"
                                  />
                                </div>
                                <div>
                                  <label className="text-[8px] uppercase tracking-wider text-obsidian-550 block mb-0.5">Notification Message</label>
                                  <input
                                    type="text"
                                    value={sw.value?.description || ''}
                                    onChange={e => handleUpdateSwitchValue(sw.id, { ...sw.value, description: e.target.value })}
                                    className="w-full bg-obsidian-950 border border-obsidian-850 rounded px-2 py-1 text-[11px] text-obsidian-300"
                                    placeholder="Reminder text"
                                  />
                                </div>
                              </div>
                            )}

                            {sw.type === 'delete' && (
                              <div>
                                <label className="text-[8px] uppercase tracking-wider text-obsidian-550 block mb-0.5">Scheduled Destruction Date</label>
                                <input
                                  type="datetime-local"
                                  value={sw.value || ''}
                                  onChange={e => handleUpdateSwitchValue(sw.id, e.target.value)}
                                  className="w-full bg-obsidian-950 border border-obsidian-850 rounded px-2 py-1 text-[11px] text-obsidian-300 cursor-pointer"
                                />
                              </div>
                            )}

                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Compiler Tab - Dynamic Forms rendering placeholders on the fly */}
          {activeTab === 'compiler' && (
            <div className="space-y-6">
              <div className="glass-panel p-4 rounded-xl border border-obsidian-850 flex items-start gap-3">
                <Info size={18} className="text-cyber-cyan shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-obsidian-100">Dynamic Template Form Compiler</h4>
                  <p className="text-[10px] text-obsidian-400 leading-relaxed">
                    This view parses all variables enclosed in double curly braces (e.g. `{"{{variable}}"}`) in your template. Renders custom form fields on the fly. Fill in inputs to compile your prompt dynamically.
                  </p>
                </div>
              </div>

              {/* Form Input fields */}
              {variableKeys.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-obsidian-600 space-y-2">
                  <Settings size={28} className="stroke-[1.5]" />
                  <span className="text-xs">No variables found in this template.</span>
                  <span className="text-[10px] text-obsidian-700">Write {"{{variableName}}"} in the prompt editor to configure placeholders.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-cyber-cyan uppercase tracking-wider">Configure Parameters</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {variableKeys.map(k => (
                      <div key={k} className="glass-panel p-3.5 rounded-lg border border-obsidian-850">
                        <label className="text-[10px] font-bold text-obsidian-400 uppercase tracking-widest block mb-1.5">{k}</label>
                        <input
                          type="text"
                          placeholder={`Enter value for ${k}...`}
                          value={variables[k]}
                          onChange={e => setVariables({ ...variables, [k]: e.target.value })}
                          className="w-full bg-obsidian-950 border border-obsidian-800 focus-glow-cyan px-2.5 py-1.5 rounded text-xs text-obsidian-200"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Real-time compiled preview */}
              <div className="space-y-3 pt-4 border-t border-obsidian-850">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-cyber-violet uppercase tracking-wider">Compiled Output Preview</h4>
                  
                  <button
                    onClick={handleCopyCompiled}
                    disabled={!content.trim()}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                      copiedCompiled
                        ? 'bg-cyber-emerald/10 border-cyber-emerald text-cyber-emerald'
                        : 'bg-obsidian-950 border-obsidian-850 hover:border-cyber-violet hover:text-cyber-violet text-obsidian-400'
                    }`}
                  >
                    {copiedCompiled ? (
                      <>
                        <Check size={12} />
                        <span>Compiled Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copy Compiled Prompt</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-obsidian-950/80 border border-obsidian-850 p-4 rounded-xl text-xs text-obsidian-400 font-mono leading-relaxed whitespace-pre-wrap select-text h-[200px] overflow-y-auto">
                  {getCompiledContent() || <span className="text-obsidian-700 italic">No content to compile. Write some prompt text in the editor.</span>}
                </div>
              </div>

            </div>
          )}

          {/* Revision History Logs */}
          {activeTab === 'history' && prompt && (
            <div className="space-y-5">
              <h4 className="text-xs font-bold text-cyber-violet uppercase tracking-wider">Revision History timeline</h4>
              
              {(!prompt.versions || prompt.versions.length === 0) ? (
                <div className="text-xs text-obsidian-600 italic">No revision history recorded for this prompt.</div>
              ) : (
                <div className="space-y-4">
                  {prompt.versions.map((ver, idx) => (
                    <div key={idx} className="glass-panel p-4 rounded-xl border border-obsidian-850 space-y-3">
                      
                      <div className="flex items-center justify-between text-xs border-b border-obsidian-850 pb-2">
                        <div className="flex items-center gap-2">
                          <Layers size={13} className="text-cyber-violet" />
                          <span className="font-bold text-obsidian-200">Version {ver.version}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-obsidian-600">
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            {new Date(ver.timestamp).toLocaleString()}
                          </span>
                          
                          {/* Revert Trigger */}
                          {prompt.version !== ver.version && (
                            <button
                              onClick={() => handleRevertVersion(ver.content)}
                              className="text-cyber-cyan hover:underline font-bold uppercase tracking-wider cursor-pointer"
                            >
                              Restore
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="text-[11px] text-obsidian-400 font-mono max-h-[100px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                        {ver.content}
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Actions Panel */}
        <div className="px-6 py-4 border-t border-obsidian-850 bg-obsidian-950/40 flex items-center justify-between shrink-0">
          <span className="text-[10px] text-obsidian-600 font-medium font-mono">
            {content.length} characters | {content.split(/\s+/).filter(Boolean).length} words
          </span>

          <div className="flex items-center gap-2.5 relative">
            {prompt && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(prompt.id)}
                className="bg-cyber-rose/10 border border-cyber-rose/30 text-cyber-rose hover:bg-cyber-rose hover:text-white font-semibold px-3.5 py-2 rounded-lg text-xs cursor-pointer transition-all duration-150 mr-2"
                title="Delete Template"
              >
                <Trash2 size={14} />
              </button>
            )}

            {/* Add Switch Popup menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowAddSwitchMenu(!showAddSwitchMenu)}
                className="bg-obsidian-850 border border-obsidian-800 text-obsidian-300 font-semibold px-4 py-2 rounded-lg text-xs hover:bg-obsidian-800 cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={14} />
                Add Switches
              </button>

              {showAddSwitchMenu && (
                <div className="absolute right-0 bottom-[44px] w-64 rounded-xl border border-obsidian-800 bg-obsidian-950/95 backdrop-blur-md shadow-2xl p-1.5 z-[100] max-h-60 overflow-y-auto">
                  <div className="text-[9px] uppercase tracking-wider text-obsidian-500 px-2 py-1">Available Switches</div>
                  {SWITCH_OPTIONS.map(opt => {
                    const isAdded = promptSwitches.some(s => s.type === opt.type);
                    const IconComp = opt.icon;
                    return (
                      <button
                        key={opt.type}
                        type="button"
                        disabled={isAdded}
                        onClick={() => handleAddSwitch(opt.type)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-start gap-2.5 transition-all text-xs ${
                          isAdded
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

            <button
              onClick={onClose}
              className="bg-obsidian-850 border border-obsidian-800 text-obsidian-300 font-semibold px-4 py-2 rounded-lg text-xs hover:bg-obsidian-800 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim() || !content.trim()}
              className={`flex items-center gap-1.5 bg-gradient-cyber text-white font-semibold px-5 py-2 rounded-lg text-xs shadow-glow-violet cursor-pointer transition-opacity ${
                (!title.trim() || !content.trim()) ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
              }`}
            >
              <Save size={14} />
              Save Template
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
