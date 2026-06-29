import { useState } from 'react';
import { 
  LayoutGrid, Star, Pin, Plus, Trash2, 
  Download, Upload, ChevronLeft, ChevronRight,
  Zap
} from 'lucide-react';
import type { Category } from '../types';
import { CategoryIcon } from './CategoryIcon';

interface SidebarProps {
  appVersion: string;
  categories: Category[];
  selectedCategoryId: string | null; // 'all', 'favorites', 'pinned', or a category UUID
  onSelectCategory: (id: string | null) => void;
  onOpenCategoryModal: () => void;
  onDeleteCategory: (id: string) => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  appVersion,
  categories,
  selectedCategoryId,
  onSelectCategory,
  onOpenCategoryModal,
  onDeleteCategory,
  onExportBackup,
  onImportBackup
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside 
      className={`glass-panel h-full flex flex-col transition-all duration-300 relative border-r border-obsidian-800 ${
        isCollapsed ? 'w-[70px]' : 'w-[280px]'
      }`}
    >
      {/* Collapse Toggle Button */}
      <button 
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="titlebar-nodrag absolute -right-4 top-16 z-50 flex h-8 w-8 items-center justify-center rounded-full border border-obsidian-700 bg-obsidian-850 text-obsidian-400 shadow-lg shadow-black/20 transition-all duration-200 hover:text-cyber-violet cursor-pointer"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRight size={14} className="pointer-events-none" /> : <ChevronLeft size={14} className="pointer-events-none" />}
      </button>

      {/* App Header Branding */}
      <div className={`pb-4 flex items-center ${isCollapsed ? 'justify-center gap-0 p-4 pt-5' : 'gap-3 p-6'}`}>
        <div className="flex items-center justify-center w-8 h-8 shrink-0 rounded-lg bg-gradient-cyber shadow-glow-violet">
          <Zap className="text-white" size={16} />
        </div>
        {!isCollapsed && (
          <div className="flex flex-col">
            <span className="font-extrabold tracking-wider bg-gradient-cyber bg-clip-text text-transparent text-lg">PROMPTVAULT</span>
            <span className="text-[10px] text-obsidian-400 font-medium uppercase tracking-widest mt-[-2px]">Local OS {appVersion}</span>
          </div>
        )}
      </div>

      {/* Main Sidebar Links / Scrolling Region */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6">
        
        {/* Smart Quick Filters */}
        <div className="space-y-1">
          {!isCollapsed && <h3 className="px-3 text-[11px] font-bold text-obsidian-400 uppercase tracking-widest mb-2">Filters</h3>}
          
          <button
            onClick={() => onSelectCategory(null)}
            className={`group w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-lg text-sm transition-all duration-150 cursor-pointer ${
              selectedCategoryId === null 
                ? 'bg-obsidian-800/80 text-obsidian-100 font-semibold shadow-inner border-l-2 border-cyber-violet'
                : 'text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-850/50'
            }`}
            title="All Prompts"
          >
            <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
              <LayoutGrid size={18} className={`${selectedCategoryId === null ? 'text-cyber-violet' : ''} transition-transform duration-150 ${selectedCategoryId === null ? 'scale-110' : 'group-hover:scale-105'}`} />
            </span>
            {!isCollapsed && <span>All Prompts</span>}
          </button>

          <button
            onClick={() => onSelectCategory('favorites')}
            className={`group w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-lg text-sm transition-all duration-150 cursor-pointer ${
              selectedCategoryId === 'favorites' 
                ? 'bg-obsidian-800/80 text-obsidian-100 font-semibold shadow-inner border-l-2 border-cyber-violet'
                : 'text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-850/50'
            }`}
            title="Favorites"
          >
            <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
              <Star size={18} className={`${selectedCategoryId === 'favorites' ? 'text-yellow-500 fill-yellow-500 scale-110' : 'group-hover:scale-105'} transition-transform duration-150`} />
            </span>
            {!isCollapsed && <span>Favorites</span>}
          </button>

          <button
            onClick={() => onSelectCategory('pinned')}
            className={`group w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-lg text-sm transition-all duration-150 cursor-pointer ${
              selectedCategoryId === 'pinned' 
                ? 'bg-obsidian-800/80 text-obsidian-100 font-semibold shadow-inner border-l-2 border-cyber-violet'
                : 'text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-850/50'
            }`}
            title="Pinned"
          >
            <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
              <Pin size={18} className={`${selectedCategoryId === 'pinned' ? 'text-cyber-cyan fill-cyber-cyan scale-110' : 'group-hover:scale-105'} transition-transform duration-150`} />
            </span>
            {!isCollapsed && <span>Pinned</span>}
          </button>
        </div>

        {/* Categories Section */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-3 mb-2">
            {!isCollapsed && <h3 className="text-[11px] font-bold text-obsidian-400 uppercase tracking-widest">Categories</h3>}
            {!isCollapsed && (
              <button 
                onClick={onOpenCategoryModal}
                className="text-obsidian-400 hover:text-cyber-violet cursor-pointer transition-colors duration-150"
                title="Create Category"
              >
                <Plus size={14} />
              </button>
            )}
          </div>

          {/* List of Custom Categories */}
          <div className="space-y-0.5">
            {categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <div 
                  key={cat.id}
                  className="group flex items-center justify-between rounded-lg transition-all duration-150"
                >
                  <button
                    onClick={() => onSelectCategory(cat.id)}
                    className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-all duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-obsidian-800/80 text-obsidian-100 font-semibold shadow-inner border-l-2'
                        : 'text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-850/50'
                    }`}
                    style={isSelected ? { borderLeftColor: cat.color } : undefined}
                    title={cat.name}
                  >
                    <CategoryIcon name={cat.icon} size={18} color={cat.color} />
                    {!isCollapsed && <span className="truncate">{cat.name}</span>}
                  </button>
                  
                  {/* Delete button (only show on hover, and if not collapsed) */}
                  {!isCollapsed && (
                    <button
                      onClick={() => onDeleteCategory(cat.id)}
                      className="opacity-0 group-hover:opacity-100 text-obsidian-600 hover:text-cyber-rose p-2 cursor-pointer transition-all duration-150"
                      title="Delete Category"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Backup & System Operations Footer */}
      <div className="p-4 border-t border-obsidian-850 space-y-1.5">
        <button
          onClick={onImportBackup}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-850 transition-all duration-150 cursor-pointer"
          title="Import JSON"
        >
          <Upload size={14} className="text-cyber-cyan" />
          {!isCollapsed && <span>Import Backup</span>}
        </button>

        <button
          onClick={onExportBackup}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-obsidian-400 hover:text-obsidian-100 hover:bg-obsidian-850 transition-all duration-150 cursor-pointer"
          title="Export JSON"
        >
          <Download size={14} className="text-cyber-violet" />
          {!isCollapsed && <span>Export Database</span>}
        </button>
      </div>

    </aside>
  );
};
