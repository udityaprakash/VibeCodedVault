import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Bot, User, Cpu, RefreshCw, Trash2, Maximize2, Minimize2, Sparkles } from 'lucide-react';
import type { AIAgentSettings, ChatMessage, Prompt, Category } from '../types';
import { runAgentCycle } from '../utils/aiAgent';
import type { AgentContext } from '../utils/aiAgent';

interface AIAgentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  prompts: Prompt[];
  categories: Category[];
  themeMode: 'light' | 'dark';
  accentColor: string;
  onSearchPrompts: (query: string) => Prompt[];
  onCreatePrompt: (prompt: Partial<Prompt> & { title: string; content: string }) => Promise<void>;
  onDeletePrompt: (id: string) => Promise<void>;
  onCreateCategory: (category: Partial<Category> & { name: string }) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onSetTheme: (mode: 'light' | 'dark', accentColor?: string) => void;
  aiSettings: AIAgentSettings;
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export const AIAgentPanel: React.FC<AIAgentPanelProps> = ({
  isOpen,
  onClose,
  prompts,
  categories,
  themeMode,
  accentColor,
  onSearchPrompts,
  onCreatePrompt,
  onDeletePrompt,
  onCreateCategory,
  onDeleteCategory,
  onSetTheme,
  aiSettings,
  chatMessages,
  setChatMessages
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [activeTool, setActiveTool] = useState<{ name: string; args: any; status: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Decoupled Runner Loop: triggers whenever a new user message is appended
  useEffect(() => {
    if (!isOpen) return;
    const lastMsg = chatMessages[chatMessages.length - 1];
    if (lastMsg && lastMsg.sender === 'user' && !isThinking) {
      void executeAgentRun();
    }
  }, [chatMessages, isOpen]);

  useEffect(() => {
    // Scroll to bottom on new messages or thinking status change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isThinking, activeTool]);

  if (!isOpen) return null;

  const executeAgentRun = async () => {
    setIsThinking(true);
    setActiveTool(null);

    // Map current history to format expected by agent runner
    const historyPayload = chatMessages.map(msg => {
      let role: 'user' | 'assistant' | 'tool' = 'user';
      if (msg.sender === 'agent') role = 'assistant';
      if (msg.sender === 'system-tool') role = 'tool';
      return {
        role,
        content: msg.text,
        name: msg.toolCallName,
        tool_call_id: undefined // resolved inside runAgentCycle
      };
    });

    const agentContext: AgentContext = {
      prompts,
      categories,
      themeMode,
      accentColor,
      onSearchPrompts,
      onCreatePrompt,
      onDeletePrompt,
      onCreateCategory,
      onDeleteCategory,
      onSetTheme
    };

    try {
      const { text } = await runAgentCycle(
        historyPayload,
        aiSettings,
        agentContext,
        (toolLog) => {
          setActiveTool({
            name: toolLog.name,
            args: toolLog.args,
            status: toolLog.status
          });

          if (toolLog.status === 'success' || toolLog.status === 'error') {
            const toolMsg: ChatMessage = {
              id: 'tool_' + Math.random().toString(36).substr(2, 9),
              sender: 'system-tool',
              text: toolLog.result || 'Executed successfully.',
              timestamp: Date.now(),
              toolCallName: toolLog.name,
              toolCallStatus: toolLog.status
            };
            setChatMessages(prev => [...prev, toolMsg]);
          }
        }
      );

      const agentMsg: ChatMessage = {
        id: 'msg_' + Math.random().toString(36).substr(2, 9),
        sender: 'agent',
        text,
        timestamp: Date.now()
      };
      setChatMessages(prev => [...prev, agentMsg]);
    } catch (e: any) {
      const errMsg: ChatMessage = {
        id: 'msg_' + Math.random().toString(36).substr(2, 9),
        sender: 'agent',
        text: `Error running agent: ${e.message}`,
        timestamp: Date.now()
      };
      setChatMessages(prev => [...prev, errMsg]);
    } finally {
      setIsThinking(false);
      setActiveTool(null);
    }
  };

  const handleSend = () => {
    const query = inputVal.trim();
    if (!query) return;

    setInputVal('');

    const userMsg: ChatMessage = {
      id: 'msg_' + Math.random().toString(36).substr(2, 9),
      sender: 'user',
      text: query,
      timestamp: Date.now()
    };

    setChatMessages(prev => [...prev, userMsg]);
  };

  const handleClearHistory = () => {
    setChatMessages([]);
  };

  const suggestionChips = [
    { text: 'Switch to light mode', desc: 'Light Theme' },
    { text: 'Find Claude prompt templates', desc: 'Search Prompts' },
    { text: 'Create category Marketing', desc: 'Create Category' },
    { text: 'Delete prompt template by ID', desc: 'Delete Prompt' }
  ];

  return (
    <div 
      className="fixed right-0 top-10 bottom-0 z-[400] flex flex-col border-l border-obsidian-850 bg-obsidian-950/95 backdrop-blur-md transition-all duration-300 shadow-2xl"
      style={{ width: isExpanded ? '750px' : '400px' }}
    >
      {/* Panel Header */}
      <div className="px-5 py-3.5 border-b border-obsidian-850 bg-obsidian-950/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Bot size={15} className="text-cyber-violet animate-pulse" />
          <h3 className="text-xs font-bold text-obsidian-100 uppercase tracking-widest">
            AI Assistant
          </h3>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-cyber-violet/20 bg-cyber-violet/5 text-cyber-violet uppercase font-semibold">
            {aiSettings.provider}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Resize Toggle */}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-obsidian-450 hover:text-obsidian-100 transition-colors p-1 rounded hover:bg-obsidian-900 cursor-pointer"
            title={isExpanded ? 'Collapse panel' : 'Expand panel'}
          >
            {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          {/* Clear history */}
          <button 
            onClick={handleClearHistory}
            className="text-obsidian-450 hover:text-cyber-rose transition-colors p-1 rounded hover:bg-obsidian-900 cursor-pointer"
            title="Clear Chat Session"
          >
            <Trash2 size={13} />
          </button>

          {/* Close */}
          <button 
            onClick={onClose}
            className="text-obsidian-450 hover:text-obsidian-100 transition-colors p-1 rounded hover:bg-obsidian-900 cursor-pointer"
            title="Close Assistant"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Message History list */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-obsidian-950/20">
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 space-y-4">
            <div className="w-12 h-12 rounded-full bg-cyber-violet/10 border border-cyber-violet/30 flex items-center justify-center text-cyber-violet shadow-glow-violet animate-bounce">
              <Sparkles size={20} />
            </div>
            <div>
              <span className="text-xs font-semibold block text-obsidian-200">How can I assist you?</span>
              <span className="text-[10px] text-obsidian-550 block mt-1 max-w-[280px]">
                I can search prompt contents, create new templates, delete duplicates, or toggle light/dark theme.
              </span>
            </div>

            {/* Suggestions list */}
            <div className="w-full max-w-sm space-y-2 pt-4">
              {suggestionChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => setChatMessages([
                    {
                      id: 'msg_' + Math.random().toString(36).substr(2, 9),
                      sender: 'user',
                      text: chip.text,
                      timestamp: Date.now()
                    }
                  ])}
                  className="w-full text-left px-3 py-2 rounded-xl border border-obsidian-850 bg-obsidian-900 hover:border-cyber-violet text-[10px] text-obsidian-400 hover:text-obsidian-200 transition-all cursor-pointer flex items-center justify-between"
                >
                  <span>"{chip.text}"</span>
                  <span className="text-[8px] uppercase tracking-wider text-obsidian-550 bg-obsidian-950 px-2 py-0.5 rounded border border-obsidian-850">{chip.desc}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {chatMessages.map(msg => {
              if (msg.sender === 'system-tool') {
                return (
                  <div key={msg.id} className="flex items-center gap-2 text-[10px] text-obsidian-500 font-mono bg-obsidian-900/60 border border-obsidian-850 p-2.5 rounded-lg">
                    <Cpu size={12} className="text-cyber-cyan shrink-0" />
                    <span className="truncate">
                      Tool Response: <strong className="text-obsidian-400">{msg.toolCallName}</strong>
                    </span>
                    <span className={`ml-auto text-[8px] uppercase px-1.5 py-0.2 rounded border font-semibold shrink-0 ${
                      msg.toolCallStatus === 'success'
                        ? 'border-cyber-emerald/30 bg-cyber-emerald/10 text-cyber-emerald'
                        : 'border-cyber-rose/30 bg-cyber-rose/10 text-cyber-rose'
                    }`}>
                      {msg.toolCallStatus}
                    </span>
                  </div>
                );
              }

              const isUser = msg.sender === 'user';
              return (
                <div key={msg.id} className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                  <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center border text-xs ${
                    isUser
                      ? 'bg-cyber-violet/20 border-cyber-violet/40 text-cyber-violet'
                      : 'bg-obsidian-850 border-obsidian-750 text-obsidian-400'
                  }`}>
                    {isUser ? <User size={12} /> : <Bot size={12} />}
                  </div>

                  <div className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? 'bg-cyber-violet text-white shadow-glow-violet rounded-tr-none'
                      : 'bg-obsidian-900 border border-obsidian-800 text-obsidian-200 rounded-tl-none select-text'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              );
            })}

            {/* Active thinking states */}
            {isThinking && (
              <div className="flex gap-3 max-w-[85%] mr-auto items-start">
                <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center border bg-obsidian-850 border-obsidian-750 text-obsidian-400">
                  <Bot size={12} />
                </div>
                <div className="p-3 bg-obsidian-900 border border-obsidian-800 text-xs text-obsidian-400 rounded-2xl rounded-tl-none flex flex-col gap-2 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <RefreshCw size={12} className="animate-spin text-cyber-violet" />
                    <span>AI is thinking...</span>
                  </div>
                  {activeTool && (
                    <div className="text-[10px] font-mono p-2 rounded bg-obsidian-950 border border-obsidian-850 text-obsidian-500 animate-pulse">
                      Calling: <strong className="text-cyber-cyan">{activeTool.name}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Form Panel */}
      <div className="p-4 border-t border-obsidian-850 bg-obsidian-950/40 shrink-0 flex gap-2">
        <input
          type="text"
          placeholder="Ask the AI Assistant..."
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          disabled={isThinking}
          className="flex-1 bg-obsidian-950 border border-obsidian-850 rounded-xl px-3.5 py-2 text-xs text-obsidian-200 placeholder-obsidian-650 focus-glow-violet disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={isThinking || !inputVal.trim()}
          className="bg-cyber-violet text-white p-2 rounded-xl shadow-glow-violet hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center justify-center shrink-0"
        >
          <Send size={14} />
        </button>
      </div>

    </div>
  );
};
