import React from 'react';
import { Minus, Moon, Settings2, Square, Sun, Trash2, X, Calendar, Bot } from 'lucide-react';

type ThemeMode = 'light' | 'dark';

interface TitleBarProps {
  themeMode: ThemeMode;
  accentColor: string;
  settingsOpen: boolean;
  onToggleTheme: () => void;
  onToggleSettings: () => void;
  onOpenCalendar: () => void;
  onOpenRecycleBin: () => void;
  aiAgentOpen: boolean;
  onToggleAIAgent: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  themeMode,
  settingsOpen,
  onToggleTheme,
  onToggleSettings,
  onOpenCalendar,
  onOpenRecycleBin,
  aiAgentOpen,
  onToggleAIAgent,
}) => {
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
      <div className="titlebar-nodrag flex items-center h-full relative">
        <button
          onClick={onOpenCalendar}
          className="h-7 w-7 mr-1.5 rounded-full border border-obsidian-800 bg-obsidian-900/85 text-obsidian-400 hover:text-obsidian-100 hover:border-cyber-cyan/50 flex items-center justify-center transition-all duration-200"
          title="Open Calendar View"
          aria-label="Open Calendar"
        >
          <Calendar size={13} />
        </button>

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
          onClick={onOpenRecycleBin}
          className="h-7 w-7 mr-1.5 rounded-full border border-obsidian-800 bg-obsidian-900/85 text-obsidian-400 hover:text-obsidian-100 hover:border-cyber-rose/50 flex items-center justify-center transition-all duration-200"
          title="Open Recycle Bin"
          aria-label="Open Recycle Bin"
        >
          <Trash2 size={13} />
        </button>

        <button
          onClick={onToggleSettings}
          className={`h-7 w-7 mr-2 rounded-full border flex items-center justify-center transition-all duration-200 ${
            settingsOpen
              ? 'border-cyber-violet/60 bg-cyber-violet/15 text-cyber-violet'
              : 'border-obsidian-800 bg-obsidian-900/85 text-obsidian-400 hover:text-obsidian-100 hover:border-cyber-violet/50'
          }`}
          title="Theme & AI Settings"
          aria-label="Open settings modal"
        >
          <Settings2 size={13} />
        </button>
      </div>

      <div className="titlebar-nodrag flex items-center h-full">
        <button
          onClick={onToggleAIAgent}
          className={`h-7 w-7 mr-2 rounded-full border flex items-center justify-center transition-all duration-250 ${
            aiAgentOpen
              ? 'border-cyber-violet/60 bg-cyber-violet/15 text-cyber-violet shadow-glow-violet'
              : 'border-obsidian-800 bg-obsidian-900/85 text-obsidian-400 hover:text-obsidian-100 hover:border-cyber-violet/50'
          }`}
          title="Open AI Assistant"
          aria-label="Toggle AI Assistant"
        >
          <Bot size={13} />
        </button>

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
