import React, { useEffect, useRef, useState } from 'react';
import { Download, Minus, Moon, Plus, RefreshCw, Settings2, Square, Sun, Tag, Trash2, X } from 'lucide-react';
import {
  PRESET_MODELS,
  getCustomModels,
  normalizeModelName,
  resolveExistingModelName,
  saveCustomModels,
} from '../utils/aiModels';
import type { UpdateInfo } from '../types';

type ThemeMode = 'light' | 'dark';

interface TitleBarProps {
  themeMode: ThemeMode;
  accentColor: string;
  settingsOpen: boolean;
  updateInfo: UpdateInfo | null;
  isCheckingForUpdates: boolean;
  isUpdatingVault: boolean;
  onToggleTheme: () => void;
  onToggleSettings: () => void;
  onAccentColorChange: (color: string) => void;
  onCloseSettings: () => void;
  onCheckForUpdates: () => void;
  onUpdateNow: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  themeMode,
  accentColor,
  settingsOpen,
  updateInfo,
  isCheckingForUpdates,
  isUpdatingVault,
  onToggleTheme,
  onToggleSettings,
  onAccentColorChange,
  onCloseSettings,
  onCheckForUpdates,
  onUpdateNow,
}) => {
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const [isModelManagerOpen, setIsModelManagerOpen] = useState(false);
  const [customModels, setCustomModels] = useState<string[]>(() => getCustomModels());
  const [customModelInput, setCustomModelInput] = useState('');

  useEffect(() => {
    if (!settingsOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (settingsRef.current && !settingsRef.current.contains(target)) {
        onCloseSettings();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onCloseSettings, settingsOpen]);

  useEffect(() => {
    if (!settingsOpen) {
      setIsModelManagerOpen(false);
      setCustomModelInput('');
    }
  }, [settingsOpen]);

  useEffect(() => {
    if (settingsOpen) {
      setCustomModels(getCustomModels());
    }
  }, [settingsOpen, isModelManagerOpen]);

  const handleAddCustomModel = () => {
    const normalized = normalizeModelName(customModelInput);
    if (!normalized) {
      return;
    }

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

  const handleMinimize = () => {
    if (window.api && window.api.minimize) {
      window.api.minimize();
    }
  };

  const handleMaximize = () => {
    if (window.api && window.api.maximize) {
      window.api.maximize();
    }
  };

  const handleClose = () => {
    if (window.api && window.api.close) {
      window.api.close();
    }
  };

  return (
    <header className="titlebar-drag h-10 w-full bg-obsidian-950/90 border-b border-obsidian-900 flex items-center justify-between px-4 select-none z-50">
      {/* Title Details */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase font-bold tracking-widest text-obsidian-400 bg-obsidian-900 border border-obsidian-800 px-2 py-0.5 rounded">
          Local DB persisted
        </span>
        <span className="text-xs font-medium text-obsidian-600">
          promptvault_db.json
        </span>
      </div>

      {/* Title Centered Text */}
      <div className="text-xs font-semibold text-obsidian-400 tracking-wide">
        PromptVault Studio
      </div>

      {/* Title Windows Controls */}
      <div className="titlebar-nodrag flex items-center h-full relative" ref={settingsRef}>
        <button
          onClick={onToggleTheme}
          className="group h-7 w-[54px] mr-1.5 ml-1 rounded-full border border-obsidian-800 bg-obsidian-900/90 px-1 flex items-center transition-all duration-300 hover:border-cyber-violet/60"
          title={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle theme"
        >
          <span
            className={`relative h-5 w-5 rounded-full transition-transform duration-300 ease-out flex items-center justify-center ${
              themeMode === 'dark'
                ? 'translate-x-0 bg-obsidian-800 text-obsidian-300'
                : 'translate-x-[28px] bg-cyber-violet text-white shadow-glow-violet'
            }`}
          >
            {themeMode === 'dark' ? <Moon size={11} /> : <Sun size={11} />}
          </span>
        </button>

        <button
          onClick={onToggleSettings}
          className={`h-7 w-7 mr-2 rounded-full border flex items-center justify-center transition-all duration-200 ${
            settingsOpen
              ? 'border-cyber-violet/60 bg-cyber-violet/15 text-cyber-violet'
              : 'border-obsidian-800 bg-obsidian-900/85 text-obsidian-400 hover:text-obsidian-100 hover:border-cyber-violet/50'
          }`}
          title="Theme settings"
          aria-label="Open theme settings"
        >
          <Settings2 size={13} />
        </button>

        {settingsOpen && (
          <div className="absolute top-[44px] right-[136px] w-[18rem] max-w-[calc(100vw-1.5rem)] rounded-xl border border-obsidian-800 bg-obsidian-950/95 backdrop-blur-md p-3 shadow-2xl z-[100]">
            <div className="text-[10px] uppercase tracking-widest text-obsidian-500 mb-2">Theme Studio</div>

            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => themeMode === 'light' || onToggleTheme()}
                className={`flex-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                  themeMode === 'light'
                    ? 'border-cyber-violet/60 bg-cyber-violet/15 text-cyber-violet'
                    : 'border-obsidian-800 bg-obsidian-900 text-obsidian-300 hover:border-cyber-violet/40'
                }`}
              >
                Light
              </button>
              <button
                onClick={() => themeMode === 'dark' || onToggleTheme()}
                className={`flex-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                  themeMode === 'dark'
                    ? 'border-cyber-violet/60 bg-cyber-violet/15 text-cyber-violet'
                    : 'border-obsidian-800 bg-obsidian-900 text-obsidian-300 hover:border-cyber-violet/40'
                }`}
              >
                Dark
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] text-obsidian-500 uppercase tracking-wider">Accent Color</div>
                <div className="text-[11px] text-obsidian-300">Pick from color dial</div>
              </div>
              <label
                className="relative block h-9 w-9 rounded-full border-2 border-obsidian-700 shadow-inner cursor-pointer overflow-hidden"
                style={{ backgroundColor: accentColor }}
                title="Select accent color"
              >
                <input
                  type="color"
                  value={accentColor}
                  onChange={(event) => onAccentColorChange(event.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  aria-label="Pick theme accent color"
                />
              </label>
            </div>

            <div className="mt-3 pt-3 border-t border-obsidian-850/70">
              <button
                onClick={() => setIsModelManagerOpen(prev => !prev)}
                className="w-full flex items-center justify-between rounded-lg border border-obsidian-800 bg-obsidian-900 px-2.5 py-2 text-[11px] text-obsidian-300 hover:border-cyber-violet/45 transition-colors"
              >
                <span className="flex items-center gap-1.5 font-semibold">
                  <Tag size={12} className="text-cyber-cyan" />
                  AI Models
                </span>
                <span className="text-[10px] text-obsidian-500">{PRESET_MODELS.length + customModels.length}</span>
              </button>
            </div>

            {isModelManagerOpen && (
              <div className="absolute top-[44px] right-[252px] w-72 rounded-xl border border-obsidian-800 bg-obsidian-950/95 backdrop-blur-md p-3 shadow-2xl z-[110]">
                <div className="text-[10px] uppercase tracking-widest text-obsidian-500 mb-2">AI Models</div>

                <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                  {PRESET_MODELS.map(modelName => (
                    <div
                      key={modelName}
                      className="flex items-center justify-between gap-2 rounded-lg border border-obsidian-850 bg-obsidian-900/70 px-2 py-1.5"
                    >
                      <span className="text-[11px] text-obsidian-300 truncate">{modelName}</span>
                      <span className="text-[9px] uppercase tracking-wider text-obsidian-500">Preset</span>
                    </div>
                  ))}

                  {customModels.length === 0 && (
                    <div className="text-[11px] text-obsidian-500 px-1 py-2">No custom models added yet.</div>
                  )}

                  {customModels.map(modelName => (
                    <div
                      key={modelName}
                      className="flex items-center justify-between gap-2 rounded-lg border border-obsidian-800 bg-obsidian-900 px-2 py-1.5"
                    >
                      <span className="text-[11px] text-obsidian-200 truncate">{modelName}</span>
                      <button
                        onClick={() => handleRemoveCustomModel(modelName)}
                        className="p-1 rounded-md text-obsidian-500 hover:text-cyber-rose hover:bg-cyber-rose/10 transition-colors"
                        title="Delete model"
                        aria-label={`Delete ${modelName}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="text"
                    value={customModelInput}
                    onChange={(event) => setCustomModelInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleAddCustomModel();
                      }
                    }}
                    placeholder="Add custom model"
                    className="flex-1 bg-obsidian-900 border border-obsidian-800 rounded-lg px-2.5 py-2 text-[11px] text-obsidian-300 focus-glow-violet"
                  />
                  <button
                    onClick={handleAddCustomModel}
                    className="inline-flex items-center gap-1 rounded-lg border border-cyber-violet/40 bg-cyber-violet/15 px-2.5 py-2 text-[10px] uppercase tracking-wider font-bold text-cyber-violet hover:bg-cyber-violet/25 transition-colors"
                  >
                    <Plus size={11} />
                    Add
                  </button>
                </div>
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-obsidian-850/70">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-obsidian-500">Vault Updates</div>
                  <div className="text-[11px] text-obsidian-400">
                    {updateInfo ? `v${updateInfo.latestVersion} available` : 'Check GitHub releases for new builds'}
                  </div>
                </div>
                <button
                  onClick={onCheckForUpdates}
                  disabled={isCheckingForUpdates}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-obsidian-800 bg-obsidian-900 px-2.5 py-1.5 text-[10px] uppercase tracking-wider font-bold text-obsidian-300 hover:border-cyber-violet/45 hover:text-obsidian-100 transition-colors disabled:opacity-60"
                >
                  <RefreshCw size={11} className={isCheckingForUpdates ? 'animate-spin' : ''} />
                  {isCheckingForUpdates ? 'Checking' : 'Check now'}
                </button>
              </div>

              {updateInfo ? (
                <div className="rounded-lg border border-cyber-violet/30 bg-cyber-violet/10 p-2.5 overflow-hidden">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-[11px] font-semibold text-cyber-violet">Update available</div>
                      <div className="text-[10px] text-obsidian-500">
                        Current v{updateInfo.currentVersion} → Latest v{updateInfo.latestVersion}
                      </div>
                    </div>
                    <button
                      onClick={onUpdateNow}
                      disabled={isUpdatingVault}
                      className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyber-violet/40 bg-cyber-violet/15 px-2.5 py-2 text-[10px] uppercase tracking-wider font-bold text-cyber-violet hover:bg-cyber-violet/25 transition-colors disabled:opacity-60"
                    >
                      <Download size={11} />
                      {isUpdatingVault ? 'Updating' : 'Update Vault now'}
                    </button>
                  </div>
                  {updateInfo.releaseName && (
                    <div className="mt-1.5 text-[10px] text-obsidian-500 truncate">{updateInfo.releaseName}</div>
                  )}
                </div>
              ) : (
                <div className="text-[10px] text-obsidian-500">Auto-check runs on launch and every few hours.</div>
              )}
            </div>
          </div>
        )}

        <button 
          onClick={handleMinimize}
          className="h-full px-4 flex items-center justify-center text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-850 cursor-pointer transition-colors duration-150"
          title="Minimize"
        >
          <Minus size={12} />
        </button>
        <button 
          onClick={handleMaximize}
          className="h-full px-4 flex items-center justify-center text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-850 cursor-pointer transition-colors duration-150"
          title="Maximize"
        >
          <Square size={10} />
        </button>
        <button 
          onClick={handleClose}
          className="h-full px-4 flex items-center justify-center text-obsidian-400 hover:text-cyber-rose hover:bg-cyber-rose/10 cursor-pointer transition-colors duration-150"
          title="Close"
        >
          <X size={12} />
        </button>
      </div>
    </header>
  );
};
