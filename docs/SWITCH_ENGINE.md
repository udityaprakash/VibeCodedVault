# Switch Engine & IPC Reference

This document describes the Switch Engine (switch_registry.json), renderer contract, and key IPC methods used by PromptVault.

## switch_registry.json
- `id` (string): unique switch identifier
- `name` (string): display name
- `type` (string): one of `color`, `note`, `boolean`, `copyable`, `reminder`, etc.
- `defaultValue` (any): default value for new instances
- `schema` (object, optional): renderer-specific metadata

Example entry:

{
  "id": "tile_color",
  "name": "Tile Color",
  "type": "color",
  "defaultValue": "#8B5CF6",
  "schema": { "allowAlpha": false }
}

## Renderer Contract
Switch renderers (React components) must support two modes:
- Read-only / preview: show `value` and `enabled`
- Edit mode: call `onChange(value)` when the value changes and `onToggle(enabled)` when enable is toggled.

Props (recommendation):
- `value: any`
- `enabled: boolean`
- `onChange: (value: any) => void`
- `onToggle: (enabled: boolean) => void`
- `readOnly?: boolean`

Files for renderers live in `src/components/switches/`.

## Important IPC Methods (exposed via `window.api` in `electron/preload.js`)
- `getAllData()` -> { prompts, categories }
- `savePrompt(prompt)` -> returns updated DB snapshot
- `deletePrompt(promptId)` -> soft-delete
- `permanentlyDeletePrompt(promptId)` -> permanently remove
- `restorePrompt(promptId)` -> undo soft-delete
- `getPendingReminders()` -> list pending reminders
- `snoozeReminder(promptId, switchId, minutes)` -> snooze a reminder
- `markReminderFired(promptId, switchId)` -> mark reminder as fired
- `exportBackup(payload)` -> save backup file
- `importBackup()` -> open import dialog and return parsed payload (main process validation)

## Import/Migration Notes
- `PromptApplicationService.parseBackupPayload()` accepts v3 backups and attempts to migrate simple v1/v2 shapes into v3 for dry-run validation.
- Import is performed in two steps: parse/validate (dry-run), then apply selected sections (prompts/themes).

## Next Steps
- Add more renderer types as needed in the registry and implement matching components.
- Add automated migration unit tests for complex backup formats as they appear in the wild.

