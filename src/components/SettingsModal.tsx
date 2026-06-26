import React, { useState, useEffect } from 'react';
import { X, Palette, Moon, Sun, Tag, Cpu, Bot, Check, Trash2, Plus, Server, Eye, EyeOff, RefreshCw, Download } from 'lucide-react';
import { PRESET_MODELS, getCustomModels, saveCustomModels, normalizeModelName, resolveExistingModelName, resolveModelForProvider } from '../utils/aiModels';
import type { AIAgentSettings, UpdateInfo } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeMode: 'light' | 'dark';
  onToggleTheme: () => void;
  accentColor: string;
  onAccentColorChange: (color: string) => void;
  aiSettings: AIAgentSettings;
  onSaveAiSettings: (settings: AIAgentSettings) => void;
  // Updates props
  updateInfo: UpdateInfo | null;
  isCheckingForUpdates: boolean;
  isUpdatingVault: boolean;
  downloadProgress: number | null;
  installLaunching: boolean;
  installError: string | null;
  onCheckForUpdates: () => void;
  onUpdateNow: () => void;
}

const ACCENT_PRESETS = ['#8B5CF6', '#06B6D4', '#10B981', '#F43F5E', '#F59E0B', '#EC4899', '#3B82F6', '#6366F1'];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  themeMode,
  onToggleTheme,
  accentColor,
  onAccentColorChange,
  aiSettings,
  onSaveAiSettings,
  updateInfo,
  isCheckingForUpdates,
  isUpdatingVault,
  downloadProgress,
  installLaunching,
  installError,
  onCheckForUpdates,
  onUpdateNow
}) => {
  const [activeTab, setActiveTab] = useState<'appearance' | 'models' | 'ai' | 'updates'>('appearance');

  // Appearance state
  const [localAccent, setLocalAccent] = useState(accentColor);

  // Models state
  const [customModels, setCustomModels] = useState<string[]>([]);
  const [customModelInput, setCustomModelInput] = useState('');

  // AI Settings state
  const [aiEnabled, setAiEnabled] = useState(aiSettings.enabled);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai'>(aiSettings.provider);
  const [aiApiKey, setAiApiKey] = useState(aiSettings.apiKey);
  const [serverEnabled, setServerEnabled] = useState(aiSettings.serverEnabled);
  const [serverPort, setServerPort] = useState(aiSettings.serverPort || 3015);
  const [showApiKey, setShowApiKey] = useState(false);

  // Updates local states
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCustomModels(getCustomModels());
      setLocalAccent(accentColor);
      setAiEnabled(aiSettings.enabled);
      setAiProvider(aiSettings.provider);
      setAiApiKey(aiSettings.apiKey);
      setServerEnabled(aiSettings.serverEnabled);
      setServerPort(aiSettings.serverPort || 3015);
    }
  }, [isOpen, aiSettings, accentColor]);

  if (!isOpen) return null;

  const handleAddCustomModel = () => {
    const normalized = normalizeModelName(customModelInput);
    if (!normalized) return;

    const existing = resolveExistingModelName(normalized, customModels);
    if (existing) {
      setCustomModelInput('');
      return;
    }

    const nextModels = saveCustomModels([...customModels, normalized]);
    setCustomModels(nextModels);
    setCustomModelInput('');
  };

  const handleRemoveCustomModel = (modelName: string) => {
    const nextModels = customModels.filter(item => item.toLowerCase() !== modelName.toLowerCase());
    const persisted = saveCustomModels(nextModels);
    setCustomModels(persisted);
  };

  const handleSaveAll = () => {
    // Save AI Settings
    onSaveAiSettings({
      enabled: aiEnabled,
      provider: aiProvider,
      apiKey: aiApiKey.trim(),
      serverEnabled,
      serverPort: Number(serverPort) || 3015,
      model: resolveModelForProvider(aiProvider, aiSettings.model)
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-obsidian-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-obsidian-850 bg-obsidian-900 shadow-2xl overflow-hidden flex flex-col h-[520px]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-obsidian-850 flex items-center justify-between bg-obsidian-950/40">
          <h3 className="text-sm font-bold text-obsidian-100 flex items-center gap-2">
            <Cpu size={16} className="text-cyber-violet" />
            Application Settings
          </h3>
          <button onClick={onClose} className="text-obsidian-400 hover:text-obsidian-100 transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Tabs Sidebar */}
          <div className="w-[180px] border-r border-obsidian-850 bg-obsidian-950/30 p-3 flex flex-col gap-1 shrink-0">
            <button
              onClick={() => setActiveTab('appearance')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all cursor-pointer ${
                activeTab === 'appearance'
                  ? 'bg-obsidian-800 text-obsidian-100 border border-obsidian-750'
                  : 'text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-850/50'
              }`}
            >
              <Palette size={14} className={activeTab === 'appearance' ? 'text-cyber-violet' : ''} />
              Appearance
            </button>
            <button
              onClick={() => setActiveTab('models')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all cursor-pointer ${
                activeTab === 'models'
                  ? 'bg-obsidian-800 text-obsidian-100 border border-obsidian-750'
                  : 'text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-850/50'
              }`}
            >
              <Tag size={14} className={activeTab === 'models' ? 'text-cyber-cyan' : ''} />
              Compatibility
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all cursor-pointer ${
                activeTab === 'ai'
                  ? 'bg-obsidian-800 text-obsidian-100 border border-obsidian-750'
                  : 'text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-850/50'
              }`}
            >
              <Bot size={14} className={activeTab === 'ai' ? 'text-cyber-violet' : ''} />
              AI Assistant
            </button>
            <button
              onClick={() => setActiveTab('updates')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-left transition-all cursor-pointer ${
                activeTab === 'updates'
                  ? 'bg-obsidian-800 text-obsidian-100 border border-obsidian-750'
                  : 'text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-850/50'
              }`}
            >
              <RefreshCw size={14} className={activeTab === 'updates' ? 'text-cyber-cyan' : ''} />
              Vault Updates
            </button>
          </div>

          {/* Tab Content Panels */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">

            {activeTab === 'appearance' && (
              <div className="space-y-6 animate-in fade-in duration-100">
                <div>
                  <h4 className="text-xs font-bold text-cyber-violet uppercase tracking-wider mb-3">Theme Mode</h4>
                  <div className="flex gap-3">
                    <button
                      onClick={() => themeMode === 'light' || onToggleTheme()}
                      className={`flex-1 rounded-xl border p-4 text-xs font-bold flex flex-col items-center gap-2 transition-all cursor-pointer ${
                        themeMode === 'light'
                          ? 'border-cyber-violet bg-cyber-violet/10 text-cyber-violet shadow-glow-violet'
                          : 'border-obsidian-800 bg-obsidian-950/40 text-obsidian-400 hover:border-obsidian-700'
                      }`}
                    >
                      <Sun size={20} />
                      Light Theme
                    </button>
                    <button
                      onClick={() => themeMode === 'dark' || onToggleTheme()}
                      className={`flex-1 rounded-xl border p-4 text-xs font-bold flex flex-col items-center gap-2 transition-all cursor-pointer ${
                        themeMode === 'dark'
                          ? 'border-cyber-violet bg-cyber-violet/10 text-cyber-violet shadow-glow-violet'
                          : 'border-obsidian-800 bg-obsidian-950/40 text-obsidian-400 hover:border-obsidian-700'
                      }`}
                    >
                      <Moon size={20} />
                      Dark Theme
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-cyber-cyan uppercase tracking-wider mb-3">Accent Color Dial</h4>
                  <div className="flex flex-wrap gap-2.5">
                    {ACCENT_PRESETS.map(color => (
                      <button
                        key={color}
                        onClick={() => {
                          setLocalAccent(color);
                          onAccentColorChange(color);
                        }}
                        className="w-8 h-8 rounded-full border-2 border-obsidian-850 flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
                        style={{ backgroundColor: color }}
                      >
                        {localAccent === color && <Check size={14} className="text-white drop-shadow" />}
                      </button>
                    ))}
                    <label className="relative w-8 h-8 rounded-full border-2 border-obsidian-800 cursor-pointer overflow-hidden flex items-center justify-center bg-obsidian-950 hover:border-cyber-violet">
                      <Palette size={14} className="text-obsidian-400" />
                      <input
                        type="color"
                        value={localAccent}
                        onChange={e => {
                          setLocalAccent(e.target.value);
                          onAccentColorChange(e.target.value);
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'models' && (
              <div className="space-y-4 animate-in fade-in duration-100">
                <div>
                  <h4 className="text-xs font-bold text-cyber-cyan uppercase tracking-wider mb-1">Custom Compatibility Tags</h4>
                  <p className="text-[10px] text-obsidian-400 mb-3">Add target AI model tags that will appear as compatibility specifications in the Prompt Editor.</p>
                  
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      placeholder="e.g., DeepSeek-V3, GPT-4o-mini..."
                      value={customModelInput}
                      onChange={e => setCustomModelInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddCustomModel()}
                      className="flex-1 bg-obsidian-950 border border-obsidian-850 rounded-lg px-3 py-1.5 text-xs text-obsidian-200 focus-glow-violet"
                    />
                    <button
                      onClick={handleAddCustomModel}
                      className="bg-cyber-cyan/15 hover:bg-cyber-cyan/25 border border-cyber-cyan/35 text-cyber-cyan font-bold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus size={13} />
                      Add Tag
                    </button>
                  </div>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  <div className="text-[9px] uppercase tracking-wider text-obsidian-550 mb-1">Preset Options (Read-Only)</div>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESET_MODELS.map(model => (
                      <div key={model} className="flex items-center justify-between border border-obsidian-850 bg-obsidian-950/20 px-3 py-1.5 rounded-lg text-xs text-obsidian-400">
                        <span className="truncate">{model}</span>
                        <span className="text-[9px] uppercase tracking-wider text-obsidian-600 font-bold shrink-0">Preset</span>
                      </div>
                    ))}
                  </div>

                  <div className="text-[9px] uppercase tracking-wider text-obsidian-550 mt-4 mb-1">Custom Options</div>
                  {customModels.length === 0 ? (
                    <div className="text-xs text-obsidian-500 italic">No custom compatibility tags added yet.</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {customModels.map(model => (
                        <div key={model} className="flex items-center justify-between border border-obsidian-800 bg-obsidian-950/50 px-3 py-1.5 rounded-lg text-xs text-obsidian-200">
                          <span className="truncate">{model}</span>
                          <button
                            onClick={() => handleRemoveCustomModel(model)}
                            className="text-obsidian-500 hover:text-cyber-rose transition-colors cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-4 animate-in fade-in duration-100">
                <div className="flex items-center justify-between bg-obsidian-950/40 border border-obsidian-850 rounded-xl p-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-obsidian-100 flex items-center gap-1.5">
                      <Bot size={14} className="text-cyber-violet" />
                      Enable AI Agent Features
                    </span>
                    <span className="text-[10px] text-obsidian-450 mt-0.5">Let conversational AI edit prompts, search categories, or toggle themes.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={aiEnabled}
                      onChange={e => setAiEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-obsidian-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyber-violet"></div>
                  </label>
                </div>

                {aiEnabled && (
                  <div className="space-y-4 border-t border-obsidian-850 pt-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-obsidian-400 tracking-wider block mb-1.5">LLM Provider</label>
                        <select
                          value={aiProvider}
                          onChange={e => setAiProvider(e.target.value as 'gemini' | 'openai')}
                          className="w-full bg-obsidian-950 border border-obsidian-850 rounded-lg px-3 py-1.5 text-xs text-obsidian-200 focus-glow-violet"
                        >
                          <option value="gemini">Gemini Developer API</option>
                          <option value="openai">OpenAI API</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-obsidian-400 tracking-wider block mb-1.5">API Access Token</label>
                        <div className="relative flex items-center">
                          <input
                            type={showApiKey ? 'text' : 'password'}
                            placeholder={aiProvider === 'gemini' ? 'Gemini API Key...' : 'OpenAI Secret Key...'}
                            value={aiApiKey}
                            onChange={e => setAiApiKey(e.target.value)}
                            className="w-full bg-obsidian-950 border border-obsidian-850 rounded-lg pl-3 pr-10 py-1.5 text-xs text-obsidian-200 focus-glow-violet"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-3 text-obsidian-550 hover:text-obsidian-300 cursor-pointer"
                          >
                            {showApiKey ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-obsidian-950/30 border border-obsidian-850 rounded-xl p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-obsidian-100 flex items-center gap-1.5">
                            <Server size={14} className="text-cyber-cyan" />
                            Enable Local MCP Server
                          </span>
                          <span className="text-[10px] text-obsidian-450 mt-0.5">Allows external scripts (like Claude Code) to connect and manage prompts.</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={serverEnabled}
                            onChange={e => setServerEnabled(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-obsidian-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyber-cyan"></div>
                        </label>
                      </div>

                      {serverEnabled && (
                        <div className="flex items-center gap-4 animate-in slide-in-from-top-2 duration-150">
                          <div className="flex-1">
                            <label className="text-[10px] uppercase font-bold text-obsidian-450 tracking-wider block mb-1.5">Server Port</label>
                            <input
                              type="number"
                              min="1024"
                              max="65535"
                              value={serverPort}
                              onChange={e => setServerPort(Number(e.target.value))}
                              className="w-full bg-obsidian-950 border border-obsidian-850 rounded-lg px-3 py-1.5 text-xs text-obsidian-200 focus-glow-cyan"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] uppercase font-bold text-obsidian-450 tracking-wider block mb-1.5">MCP Access URL</label>
                            <div className="bg-obsidian-950 px-3 py-2 rounded-lg text-[10px] text-cyber-cyan font-mono truncate select-all border border-obsidian-850">
                              http://localhost:{serverPort}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'updates' && (
              <div className="space-y-4 animate-in fade-in duration-100">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h4 className="text-xs font-bold text-cyber-violet uppercase tracking-wider mb-1">Vault Updates</h4>
                    <p className="text-[10px] text-obsidian-450 mt-0.5">
                      {updateInfo ? `Version v${updateInfo.latestVersion} is available.` : 'Check GitHub releases for new builds.'}
                    </p>
                  </div>
                  <button
                    onClick={onCheckForUpdates}
                    disabled={isCheckingForUpdates}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-obsidian-800 bg-obsidian-950 px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold text-obsidian-300 hover:border-cyber-violet/45 hover:text-obsidian-100 transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    <RefreshCw size={11} className={isCheckingForUpdates ? 'animate-spin' : ''} />
                    {isCheckingForUpdates ? 'Checking' : 'Check now'}
                  </button>
                </div>

                {updateInfo ? (
                  <div className="rounded-lg border border-cyber-violet/30 bg-cyber-violet/10 p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-xs font-bold text-cyber-violet">Update Available</div>
                          <div className="text-[10px] text-obsidian-400 mt-0.5">
                            Current version: v{updateInfo.currentVersion} → Latest: v{updateInfo.latestVersion}
                          </div>
                        </div>
                        <button
                          onClick={onUpdateNow}
                          disabled={isUpdatingVault}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyber-violet/40 bg-cyber-violet/15 px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold text-cyber-violet hover:bg-cyber-violet/25 transition-colors disabled:opacity-60 cursor-pointer"
                        >
                          <Download size={11} />
                          {isUpdatingVault ? 'Updating...' : 'Update Vault Now'}
                        </button>
                      </div>

                      {/* Inline download / install progress */}
                      {downloadProgress !== null && downloadProgress < 100 && (
                        <div className="w-full">
                          <div className="h-2 w-full rounded bg-obsidian-800 overflow-hidden">
                            <div className="h-full bg-cyber-violet transition-all" style={{ width: `${downloadProgress}%` }} />
                          </div>
                          <div className="text-[10px] text-obsidian-450 mt-1">Downloading update — {downloadProgress}%</div>
                        </div>
                      )}

                      {installLaunching && (
                        <div className="w-full flex items-center gap-2 text-[10px] text-obsidian-400">
                          <RefreshCw size={12} className="animate-spin" />
                          <span>Launching installer…</span>
                        </div>
                      )}

                      {installError && (
                        <div className="w-full">
                          <div className="text-[10px] text-cyber-rose">{installError}</div>
                          <div className="mt-1">
                            <button
                              onClick={async () => {
                                if (!window.api?.getInstallErrorLog) return;
                                try {
                                  setLoadingDetails(true);
                                  const txt = await window.api.getInstallErrorLog();
                                  setErrorDetails(txt || 'No further details available.');
                                } catch (e) {
                                  setErrorDetails('Failed to read error details.');
                                } finally {
                                  setLoadingDetails(false);
                                }
                              }}
                              className="text-[10px] underline text-obsidian-300 hover:text-obsidian-100 cursor-pointer"
                            >
                              {loadingDetails ? 'Loading details…' : 'Show details'}
                            </button>
                          </div>
                          {errorDetails && (
                            <pre className="mt-2 max-h-40 overflow-auto text-[11px] p-2 rounded bg-obsidian-950 border border-obsidian-850 text-obsidian-300 whitespace-pre-wrap font-mono">{errorDetails}</pre>
                          )}
                        </div>
                      )}
                    </div>
                    {updateInfo.releaseName && (
                      <div className="mt-2 text-[10px] text-obsidian-550 truncate">{updateInfo.releaseName}</div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-obsidian-500 italic">No updates available. You are running the latest version of PromptVault.</div>
                )}
              </div>
            )}

          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-obsidian-850 bg-obsidian-950/40 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="bg-obsidian-850 border border-obsidian-800 text-obsidian-300 font-semibold px-4 py-2 rounded-lg text-xs hover:bg-obsidian-800 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAll}
            className="bg-gradient-cyber text-white font-semibold px-5 py-2 rounded-lg text-xs shadow-glow-violet hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1.5"
          >
            <Check size={14} />
            Save Settings
          </button>
        </div>

      </div>
    </div>
  );
};
