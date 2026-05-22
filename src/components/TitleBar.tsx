import React from 'react';
import { Minus, Square, X } from 'lucide-react';

export const TitleBar: React.FC = () => {
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
      <div className="titlebar-nodrag flex items-center h-full">
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
