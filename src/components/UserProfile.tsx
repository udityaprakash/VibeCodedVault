import React, { useState } from 'react';
import { LogOut, Settings, RefreshCw, KeyRound, ExternalLink, Lock, Database, ArrowRight, ShieldCheck } from 'lucide-react';
import type { UserProfile as ProfileType, SyncStatus } from '../types';

interface UserProfileProps {
  profile: ProfileType | null;
  syncStatus: SyncStatus | null;
  clientId?: string;
  isLoggingIn?: boolean;
  isSyncing?: boolean;
  onLogin: (clientId: string) => void;
  onLogout: () => void;
  onToggleSync: (enabled: boolean) => void;
  onSaveClientId: (clientId: string) => void;
  onSyncNow: () => void;
  onClose?: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  profile,
  syncStatus,
  clientId,
  isLoggingIn,
  isSyncing,
  onLogin,
  onLogout,
  onToggleSync,
  onSaveClientId,
  onSyncNow,
  onClose
}) => {
  const [editingClientId, setEditingClientId] = useState(false);
  const [clientIdInput, setClientIdInput] = useState(clientId);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const handleSaveClientId = () => {
    onSaveClientId(clientIdInput.trim());
    setEditingClientId(false);
  };

  const handleCopyScope = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(index);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  const formatLastSynced = (timestamp: number | null) => {
    if (!timestamp) return 'Never synced';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="text-left">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-obsidian-850 pb-2 mb-3">
        <div className="text-[10px] uppercase tracking-widest text-obsidian-500 font-bold">Cloud Account</div>
        <button 
          onClick={onClose} 
          className="text-obsidian-500 hover:text-obsidian-300 text-xs"
          aria-label="Close panel"
        >
          ✕
        </button>
      </div>

      {profile ? (
        /* Logged In View */
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {profile.picture ? (
              <img 
                src={profile.picture} 
                alt={profile.name} 
                className="h-10 w-10 rounded-full border border-cyber-violet/50 shadow-glow-violet object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-10 w-10 rounded-full border border-cyber-violet bg-cyber-violet/10 text-cyber-violet flex items-center justify-center font-bold text-sm shadow-glow-violet">
                {profile.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-obsidian-100 truncate">{profile.name}</div>
              <div className="text-[10px] text-obsidian-400 truncate">{profile.email}</div>
            </div>
            <button
              onClick={() => setEditingClientId(prev => !prev)}
              className={`p-1.5 rounded-lg border transition-colors ${
                editingClientId 
                  ? 'border-cyber-violet/60 bg-cyber-violet/15 text-cyber-violet' 
                  : 'border-obsidian-800 bg-obsidian-900 text-obsidian-400 hover:text-obsidian-200'
              }`}
              title="Google Client Configuration"
            >
              <Settings size={12} />
            </button>
          </div>

          {editingClientId ? (
            /* Editing Client ID while logged in */
            <div className="rounded-lg border border-obsidian-800 bg-obsidian-900/60 p-2.5 space-y-2">
              <div className="text-[10px] uppercase font-bold tracking-wider text-obsidian-400">Google Client ID</div>
              <textarea
                value={clientIdInput}
                onChange={(e) => setClientIdInput(e.target.value)}
                placeholder="Enter client ID"
                rows={3}
                className="w-full text-[10px] bg-obsidian-950 border border-obsidian-800 rounded px-2 py-1 text-obsidian-300 focus-glow-violet resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveClientId}
                  className="flex-1 rounded bg-cyber-violet text-white text-[10px] font-bold py-1.5 hover:opacity-90 transition-opacity"
                >
                  Save ID
                </button>
                <button
                  onClick={() => setEditingClientId(false)}
                  className="flex-1 rounded border border-obsidian-800 text-obsidian-400 text-[10px] py-1.5 hover:bg-obsidian-900"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Standard Synced state controls */
            <div className="space-y-3">
              {/* Auto Sync Toggle */}
              <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-obsidian-800 bg-obsidian-900/40">
                <div>
                  <div className="text-[11px] font-semibold text-obsidian-200 flex items-center gap-1">
                    <Database size={11} className="text-cyber-cyan" />
                    Auto-Sync to Google Drive
                  </div>
                  <div className="text-[9px] text-obsidian-500">Backs up database in private AppData folder</div>
                </div>
                <button
                  onClick={() => onToggleSync(!syncStatus?.autoSyncEnabled)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    syncStatus?.autoSyncEnabled ? 'bg-cyber-violet shadow-glow-violet' : 'bg-obsidian-800'
                  }`}
                  aria-label="Toggle auto sync"
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      syncStatus?.autoSyncEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Sync Now button */}
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-obsidian-800 bg-obsidian-900/20">
                <div className="min-w-0">
                  <div className="text-[9px] uppercase tracking-wider font-bold text-obsidian-500">Last Synced</div>
                  <div className="text-[10px] text-obsidian-300 truncate">{formatLastSynced(syncStatus?.lastSynced ?? null)}</div>
                </div>
                <button
                  onClick={onSyncNow}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-cyber-cyan/40 bg-cyber-cyan/10 px-2.5 py-1.5 text-[10px] uppercase font-bold tracking-wider text-cyber-cyan hover:bg-cyber-cyan/20 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
                  {isSyncing ? 'Syncing' : 'Sync now'}
                </button>
              </div>

              {/* Logout */}
              <button
                onClick={onLogout}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-cyber-rose/30 bg-cyber-rose/5 py-2 text-[10px] font-bold uppercase tracking-wider text-cyber-rose hover:bg-cyber-rose/10 hover:border-cyber-rose/50 transition-all"
              >
                <LogOut size={12} />
                Sign Out Google Account
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Signed Out View */
        <div className="space-y-4">
          {!clientId || editingClientId ? (
            /* Setup Setup Step-by-Step guide */
            <div className="space-y-3">
              <div className="text-[11px] text-obsidian-300 font-semibold flex items-center gap-1">
                <KeyRound size={12} className="text-cyber-violet" />
                Google Client ID Required
              </div>
              
              <div className="text-[10px] text-obsidian-400 leading-relaxed bg-obsidian-900/60 p-2.5 rounded-lg border border-obsidian-850 space-y-2 max-h-60 overflow-y-auto pr-1">
                <p className="font-bold text-obsidian-200">Create a Google Desktop OAuth client:</p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>
                    Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-cyber-cyan underline inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink size={8} /></a> and create a new project.
                  </li>
                  <li>
                    Search for the <span className="text-cyber-cyan">Google Drive API</span> and click Enable.
                  </li>
                  <li>
                    Go to <span className="text-obsidian-200">OAuth Consent Screen</span>, choose <span className="text-obsidian-200">External</span>. Add scopes:
                    <div className="my-1.5 flex items-center gap-1 bg-obsidian-950 p-1.5 rounded border border-obsidian-800 text-[9px] font-mono break-all relative">
                      <span className="truncate pr-10 select-all">https://www.googleapis.com/auth/drive.appdata</span>
                      <button 
                        onClick={() => handleCopyScope('https://www.googleapis.com/auth/drive.appdata', 1)}
                        className="absolute right-1 top-1 bg-obsidian-900 text-obsidian-300 border border-obsidian-800 rounded px-1 text-[8px] hover:text-white"
                      >
                        {copiedStep === 1 ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </li>
                  <li>
                    Add your email to the <span className="text-obsidian-200">Test Users</span> section of the consent screen.
                  </li>
                  <li>
                    Under <span className="text-obsidian-200">Credentials</span>, click <span className="text-obsidian-200">Create Credentials</span> &gt; <span className="text-obsidian-200">OAuth Client ID</span>.
                  </li>
                  <li>
                    Select Application Type: <span className="text-cyber-cyan font-bold">Desktop App</span>, name it, click Create, and copy your Client ID.
                  </li>
                </ol>
              </div>

              {/* Client ID text box */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-obsidian-500 uppercase tracking-wider font-bold">Paste OAuth Client ID</label>
                <textarea
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  placeholder="e.g. 1234567-abcdefg.apps.googleusercontent.com"
                  rows={2}
                  className="w-full text-[10px] bg-obsidian-900 border border-obsidian-800 rounded px-2.5 py-2 text-obsidian-300 focus-glow-violet resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveClientId}
                  disabled={!clientIdInput.trim()}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-cyber-violet py-2 text-[10px] font-bold uppercase tracking-wider text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <ShieldCheck size={12} />
                  Save client ID
                </button>
                {clientId && (
                  <button
                    onClick={() => setEditingClientId(false)}
                    className="flex-1 rounded-lg border border-obsidian-800 text-obsidian-400 text-[10px] uppercase font-bold tracking-wider hover:bg-obsidian-900"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Setup is configured, show Continue with Google button */
            <div className="space-y-4">
              <div className="text-[10px] text-obsidian-400 leading-relaxed text-center">
                Log in using your Google Account to automatically synchronize and backup your vaults dynamically in Google Drive.
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => onLogin(clientId)}
                  disabled={isLoggingIn}
                  className="w-full relative inline-flex items-center justify-center gap-2.5 rounded-lg border border-cyber-cyan/30 bg-gradient-to-r from-cyber-violet/10 to-cyber-cyan/10 hover:from-cyber-violet/20 hover:to-cyber-cyan/20 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-all shadow-glow-cyan/5 hover:border-cyber-cyan/60"
                >
                  {isLoggingIn ? (
                    <>
                      <RefreshCw size={14} className="animate-spin text-cyber-cyan" />
                      Authenticating in Browser…
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                      </svg>
                      Continue with Google
                    </>
                  )}
                </button>
                
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      setClientIdInput(clientId);
                      setEditingClientId(true);
                    }}
                    className="text-[10px] text-obsidian-500 hover:text-obsidian-300 underline inline-flex items-center gap-1"
                  >
                    Change Client Config ID
                    <ArrowRight size={10} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Secure indicator footer */}
          <div className="pt-2.5 border-t border-obsidian-900/60 flex items-center justify-center gap-1.5 text-[9px] text-obsidian-500 text-center">
            <Lock size={10} className="text-cyber-emerald" />
            <span>DPAPI Encrypted local credential keychain</span>
          </div>
        </div>
      )}
    </div>
  );
};
