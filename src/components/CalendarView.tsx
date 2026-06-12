import React, { useState } from 'react';
import { 
  X, ChevronLeft, ChevronRight, Calendar, Info, 
  Layers, Pin, Star, Copy, Check, Eye
} from 'lucide-react';
import type { Prompt, Category } from '../types';

interface CalendarViewProps {
  isOpen: boolean;
  onClose: () => void;
  prompts: Prompt[];
  categories: Category[];
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  isOpen,
  onClose,
  prompts = [],
  categories = []
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [previewPrompt, setPreviewPrompt] = useState<Prompt | null>(null);

  if (!isOpen) return null;

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of the month
  const firstDayIndex = new Date(year, month, 1).getDay();
  // Total days in the month
  const totalDays = new Date(year, month + 1, 0).getDate();
  // Total days in the previous month
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const daysGrid: Array<{ date: Date; isCurrentMonth: boolean }> = [];

  // Padding days from previous month
  for (let index = firstDayIndex - 1; index >= 0; index--) {
    daysGrid.push({
      date: new Date(year, month - 1, prevMonthTotalDays - index),
      isCurrentMonth: false
    });
  }

  // Days in current month
  for (let index = 1; index <= totalDays; index++) {
    daysGrid.push({
      date: new Date(year, month, index),
      isCurrentMonth: true
    });
  }

  // Padding days from next month (grid of 42 cells total)
  const remainingCells = 42 - daysGrid.length;
  for (let index = 1; index <= remainingCells; index++) {
    daysGrid.push({
      date: new Date(year, month + 1, index),
      isCurrentMonth: false
    });
  }

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  // Helper getters
  const getScheduledDeleteDate = (prompt: Prompt): Date | null => {
    const delSw = prompt.switches?.find(s => s.type === 'delete');
    if (delSw && delSw.value) {
      const d = new Date(delSw.value);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  };

  const getCalendarEventsForDate = (date: Date) => {
    const events: Array<{ prompt: Prompt; type: 'creation' | 'edit' | 'delete'; text: string }> = [];

    prompts.forEach(p => {
      // 1. Creations
      if (p.createdAt && isSameDay(new Date(p.createdAt), date)) {
        const note = p.switches?.find(s => s.type === 'note')?.value;
        events.push({
          prompt: p,
          type: 'creation',
          text: note || p.title
        });
      }

      // 2. Edits
      if (p.updatedAt && p.version > 1 && isSameDay(new Date(p.updatedAt), date) && !isSameDay(new Date(p.createdAt), date)) {
        const note = p.switches?.find(s => s.type === 'note')?.value;
        events.push({
          prompt: p,
          type: 'edit',
          text: note || p.title
        });
      }

      // 3. Scheduled Deletes
      const delDate = getScheduledDeleteDate(p);
      if (delDate && isSameDay(delDate, date)) {
        const note = p.switches?.find(s => s.type === 'note')?.value;
        events.push({
          prompt: p,
          type: 'delete',
          text: note || `Scheduled Delete: ${p.title}`
        });
      }
    });

    return events;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const selectedEvents = getCalendarEventsForDate(selectedDate);

  return (
    <div className="fixed inset-0 bg-obsidian-950/80 backdrop-blur-md flex justify-end z-[500] animate-in slide-in-from-right duration-300">
      <div className="glass-panel w-full max-w-[800px] h-full flex border-l border-obsidian-850 shadow-2xl overflow-hidden">
        
        {/* Left Side: Calendar Month View */}
        <div className="flex-1 flex flex-col border-r border-obsidian-850/60 bg-obsidian-900/40">
          
          {/* Header Controls */}
          <div className="px-6 py-4 border-b border-obsidian-850 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-cyber-cyan" />
              <h3 className="text-sm font-bold text-obsidian-100 uppercase tracking-widest">
                Calendar Studio
              </h3>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrevMonth}
                className="p-1 rounded-md bg-obsidian-950 border border-obsidian-850 text-obsidian-400 hover:text-obsidian-100 transition-colors cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-bold text-obsidian-200 min-w-[100px] text-center">
                {monthNames[month]} {year}
              </span>
              <button 
                onClick={handleNextMonth}
                className="p-1 rounded-md bg-obsidian-950 border border-obsidian-850 text-obsidian-400 hover:text-obsidian-100 transition-colors cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 p-6 flex flex-col justify-between">
            
            {/* Days of week */}
            <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-wider text-obsidian-500 mb-2">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1 flex-1">
              {daysGrid.map((day, idx) => {
                const events = getCalendarEventsForDate(day.date);
                const hasCreation = events.some(e => e.type === 'creation');
                const hasEdit = events.some(e => e.type === 'edit');
                const hasDelete = events.some(e => e.type === 'delete');
                const isSelected = isSameDay(day.date, selectedDate);
                const isToday = isSameDay(day.date, new Date());

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedDate(day.date)}
                    className={`relative rounded-xl border flex flex-col justify-between p-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyber-cyan/10 border-cyber-cyan text-cyber-cyan shadow-glow-cyan'
                        : isToday
                        ? 'bg-obsidian-800 border-cyber-violet/50 text-cyber-violet'
                        : day.isCurrentMonth
                        ? 'bg-obsidian-950 border-obsidian-850/60 text-obsidian-200 hover:border-obsidian-750'
                        : 'bg-obsidian-950/20 border-transparent text-obsidian-650'
                    }`}
                  >
                    <span className="text-xs font-bold">{day.date.getDate()}</span>
                    
                    {/* Superscript Alert Indicators */}
                    <div className="flex justify-center gap-1 mt-auto">
                      {hasCreation && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyber-emerald shadow-[0_0_4px_#10B981]" title="Created Prompts" />
                      )}
                      {hasEdit && (
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-[0_0_4px_#F59E0B]" title="Edited Prompts" />
                      )}
                      {hasDelete && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyber-rose shadow-[0_0_4px_#F43F5E]" title="Scheduled Auto Delete" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

          </div>
        </div>

        {/* Right Side: Day Details & Previews */}
        <div className="w-[320px] flex flex-col bg-obsidian-950/40">
          
          <div className="px-5 py-4 border-b border-obsidian-850 flex items-center justify-between shrink-0 bg-obsidian-950/60">
            <div>
              <span className="text-[9px] uppercase tracking-widest text-obsidian-500 font-extrabold block">Selected Date</span>
              <span className="text-xs font-bold text-obsidian-100 block">
                {selectedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <button onClick={onClose} className="text-obsidian-400 hover:text-obsidian-100 cursor-pointer">
              <X size={16} />
            </button>
          </div>

          {/* Events List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {selectedEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[50vh] text-obsidian-600 space-y-2">
                <Info size={24} className="stroke-[1.5] text-obsidian-750" />
                <span className="text-xs">No prompt events today</span>
              </div>
            ) : (
              selectedEvents.map((ev, index) => (
                <div
                  key={index}
                  onClick={() => setPreviewPrompt(ev.prompt)}
                  className={`p-3.5 rounded-xl border cursor-pointer hover:bg-obsidian-850/40 transition-colors flex flex-col gap-1.5 ${
                    ev.type === 'creation' ? 'border-cyber-emerald/20 bg-cyber-emerald/5' :
                    ev.type === 'edit' ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-cyber-rose/25 bg-cyber-rose/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-full ${
                      ev.type === 'creation' ? 'bg-cyber-emerald/10 text-cyber-emerald' :
                      ev.type === 'edit' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-cyber-rose/10 text-cyber-rose'
                    }`}>
                      {ev.type}
                    </span>
                    <Eye size={10} className="text-obsidian-500" />
                  </div>
                  
                  <span className="text-xs font-bold text-obsidian-200 line-clamp-2 leading-relaxed">
                    {ev.text}
                  </span>
                </div>
              ))
            )}
          </div>

        </div>

      </div>

      {/* Read-Only Full Prompt Template Preview Modal */}
      {previewPrompt && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-obsidian-950/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-obsidian-850 bg-obsidian-900 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            
            <div className="px-6 py-4 border-b border-obsidian-850 flex items-center justify-between bg-obsidian-950/40 shrink-0">
              <span className="text-[10px] uppercase font-bold text-cyber-cyan tracking-widest">
                Template Preview
              </span>
              <button onClick={() => setPreviewPrompt(null)} className="text-obsidian-400 hover:text-obsidian-100 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-obsidian-100 mb-1">{previewPrompt.title}</h3>
                <p className="text-xs text-obsidian-400 leading-relaxed">{previewPrompt.description || 'No description.'}</p>
              </div>

              {previewPrompt.categoryId && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-obsidian-500 font-bold uppercase tracking-wider">Category:</span>
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
                    style={{
                      color: categories.find(c => c.id === previewPrompt.categoryId)?.color || '#fff',
                      borderColor: `${categories.find(c => c.id === previewPrompt.categoryId)?.color || '#fff'}30`
                    }}
                  >
                    {categories.find(c => c.id === previewPrompt.categoryId)?.name || 'General'}
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-1.5 pt-3 border-t border-obsidian-850/50">
                <span className="text-[10px] font-bold text-obsidian-500 uppercase tracking-wider">Template Prompt text</span>
                <pre className="bg-obsidian-950 border border-obsidian-850 rounded-xl p-4 text-xs text-obsidian-300 font-mono leading-relaxed whitespace-pre-wrap select-text max-h-48 overflow-y-auto">
                  {previewPrompt.content}
                </pre>
              </div>

              {previewPrompt.tags && previewPrompt.tags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap pt-2">
                  {previewPrompt.tags.map(t => (
                    <span key={t} className="text-[9px] font-bold text-obsidian-400 bg-obsidian-850 border border-obsidian-800 px-2 py-0.5 rounded">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-obsidian-850 bg-obsidian-950/40 flex justify-end shrink-0">
              <button
                onClick={() => setPreviewPrompt(null)}
                className="rounded-lg px-4 py-2 text-xs border border-obsidian-800 bg-obsidian-900 text-obsidian-300 hover:bg-obsidian-850 transition-colors"
              >
                Close Preview
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
