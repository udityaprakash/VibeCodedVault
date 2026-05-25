import { type FC, useEffect } from 'react';
import { Check, Layers, Palette, X } from 'lucide-react';

type BackupOption = 'prompts' | 'theme';

interface BackupSelection {
  prompts: boolean;
  theme: boolean;
}

interface BackupDialogProps {
  isOpen: boolean;
  mode: 'export' | 'import';
  available: BackupSelection;
  selected: BackupSelection;
  onToggle: (option: BackupOption) => void;
  onClose: () => void;
  onConfirm: () => void;
  confirmDisabled?: boolean;
}

const rows: Array<{
  key: BackupOption;
  label: string;
  description: string;
  icon: typeof Layers;
}> = [
  {
    key: 'prompts',
    label: 'Prompts',
    description: 'Includes prompts and categories. Prompt compatibility tags are preserved from the imported data.',
    icon: Layers,
  },
  {
    key: 'theme',
    label: 'Theme',
    description: 'Includes theme mode, accent color, and custom compatibility tags.',
    icon: Palette,
  },
];

export const BackupDialog: FC<BackupDialogProps> = ({
  isOpen,
  mode,
  available,
  selected,
  onToggle,
  onClose,
  onConfirm,
  confirmDisabled = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) {
        return;
      }

      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const title =
    mode === 'export'
      ? 'Choose backup content'
      : available.theme && !available.prompts
        ? 'Theme import file detected'
        : available.prompts && !available.theme
          ? 'Prompts import file detected'
          : 'Choose what to import';

  const subtitle =
    mode === 'export'
      ? 'Select the content you want to include in the backup file.'
      : available.theme && !available.prompts
        ? 'This file contains only theme settings and custom compatibility tags.'
        : available.prompts && !available.theme
          ? 'This file contains only prompts and categories.'
          : 'Select which sections should be applied from this backup file.';

  return (
    <div
      className="fixed inset-0 z-[900] flex items-center justify-center bg-obsidian-950/80 backdrop-blur-md px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-obsidian-800 bg-obsidian-950/95 shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-obsidian-850 px-5 py-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-obsidian-500">
              {mode === 'export' ? 'Backup export' : 'Backup import'}
            </div>
            <h3 className="mt-1 text-lg font-semibold text-obsidian-100">{title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-obsidian-400">{subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-obsidian-800 bg-obsidian-900 p-2 text-obsidian-400 transition-colors hover:text-obsidian-100"
            aria-label="Close backup dialog"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          {rows.map(row => {
            const isAvailable = available[row.key];
            const isSelected = selected[row.key];
            const Icon = row.icon;

            if (!isAvailable) {
              return null;
            }

            return (
              <div
                key={row.key}
                className="flex items-center justify-between gap-4 rounded-xl border border-obsidian-850 bg-obsidian-900/60 px-4 py-3"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 rounded-lg border border-obsidian-800 bg-obsidian-950 p-2 text-cyber-violet">
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-obsidian-100">{row.label}</div>
                    <div className="text-xs leading-relaxed text-obsidian-400">{row.description}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onToggle(row.key)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    isSelected
                      ? 'border-cyber-violet/40 bg-cyber-violet/15 text-cyber-violet'
                      : 'border-obsidian-800 bg-obsidian-950 text-obsidian-500'
                  }`}
                  aria-pressed={isSelected}
                >
                  <Check size={11} className={isSelected ? 'opacity-100' : 'opacity-0'} />
                  {isSelected ? 'On' : 'Off'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-obsidian-850 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-obsidian-800 bg-obsidian-900 px-4 py-2 text-xs font-semibold text-obsidian-300 transition-colors hover:bg-obsidian-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={`rounded-lg px-4 py-2 text-xs font-semibold text-white transition-opacity ${
              mode === 'export'
                ? 'bg-gradient-cyber shadow-glow-violet hover:opacity-90'
                : 'bg-cyber-cyan shadow-[0_0_18px_rgba(6,182,212,0.25)] hover:opacity-90'
            } ${confirmDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          >
            {mode === 'export' ? 'Export' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
};