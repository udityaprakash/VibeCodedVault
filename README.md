# PromptVault

PromptVault is a local-first Electron desktop app for managing AI prompts, categories, templates, version history, and workspace backups. The current implementation stores data in a JSON file under the Electron user data directory and exposes a safe renderer API through `preload.cjs`.

## What It Does

- Create, edit, delete, and save prompts.
- Pin and favorite prompts for quick filtering.
- Copy raw prompt text or compiled prompt output.
- Organize prompts by categories.
- Search by title, description, tags, content, and model.
- Maintain version history for each prompt.
- Manage theme mode, accent color, and custom AI models.
- Export and import prompts and theme data through an in-app backup picker.
- Enforce a 30-character maximum for new category names.

## Architecture Diagram

```mermaid
flowchart LR
	U[User] --> R[Renderer: React App]

	subgraph Renderer[Renderer Process]
		A[App.tsx]
		T[TitleBar]
		S[Sidebar]
		G[PromptGrid]
		E[PromptEditor]
		C[CommandPalette]
		M[utils/aiModels.ts]
	end

	subgraph Bridge[Secure Bridge]
		P[preload.cjs\nwindow.api]
	end

	subgraph Main[Electron Main Process]
		I[main.cjs\nipcMain handlers]
		D[(prompts_db.json\nAppData storage)]
		F[OS dialogs\nimport/export file pickers]
	end

	U --> T
	U --> S
	U --> G
	U --> E
	U --> C
	A --> T
	A --> S
	A --> G
	A --> E
	A --> C
	A --> M
	A --> P
	P --> I
	I --> D
	I --> F
	M --> L[(localStorage\ncustom models + theme)]
	A --> L
```

## User Flow Block Diagram

```mermaid
flowchart TD
	Start([App opens]) --> Load[Load prompts + categories]
	Load --> Home[Main workspace]

	Home --> Search[Search prompts]
	Home --> FilterAll[View all prompts]
	Home --> FilterFav[Filter favorites]
	Home --> FilterPin[Filter pinned]
	Home --> FilterCat[Filter by category]
	Home --> Palette[Open command palette]
	Home --> NewPrompt[Create new prompt]
	Home --> ToggleTheme[Toggle light / dark theme]
	Home --> Accent[Change accent color]
	Home --> ModelMgr[Add / delete custom AI models]
	Home --> AddCat[Create category]
	Home --> Import[Import backup]
	Home --> Export[Export backup]
	Home --> Window[Minimize / maximize / close window]

	Search --> Result[Filtered prompt list]
	FilterAll --> Result
	FilterFav --> Result
	FilterPin --> Result
	FilterCat --> Result
	Palette --> PaletteSearch[Search prompts or system actions]

	Result --> OpenPrompt[Open prompt editor]
	PaletteSearch --> OpenPrompt
	NewPrompt --> OpenPrompt

	OpenPrompt --> Edit[Edit title, description, content, tags, category, model]
	OpenPrompt --> PinFav[Toggle pin / favorite]
	OpenPrompt --> Compile[Fill placeholders and compile]
	OpenPrompt --> CopyCompiled[Copy compiled prompt]
	OpenPrompt --> History[Review revisions]
	OpenPrompt --> Save[Save prompt]
	OpenPrompt --> Delete[Delete prompt]

	Result --> QuickCopy[Copy prompt from card]
	Result --> QuickPinFav[Toggle pin / favorite from card]

	Save --> Persist[(Write to prompts_db.json)]
	Delete --> Persist
	AddCat --> Persist
	Import --> Picker[Choose prompts, theme, or both]
	Picker --> Merge[Merge imported data]
	Merge --> Persist
	Export --> PickerExport[Choose prompts, theme, or both]
	PickerExport --> File[(Write backup JSON file)]
	ToggleTheme --> ThemeState[(Persist theme in localStorage)]
	Accent --> ThemeState
	ModelMgr --> ModelState[(Persist custom models in localStorage)]
	AddCat --> Limit[Clamp category name to 30 chars]
```

## Basic Sequence Diagrams

### 1. Create Or Edit Prompt

```mermaid
sequenceDiagram
	participant User
	participant UI as React UI
	participant Bridge as window.api
	participant Main as Electron Main
	participant DB as prompts_db.json

	User->>UI: Open new prompt or select existing prompt
	UI->>UI: Fill form fields and optionally add placeholders
	User->>UI: Click Save
	UI->>Bridge: savePrompt(payload)
	Bridge->>Main: db-save-prompt
	Main->>DB: Read current data
	Main->>DB: Write prompt + version history
	Main-->>UI: Return updated database snapshot
	UI-->>User: Close editor and refresh prompt list
```

### 2. Search, Open, And Copy Prompt

```mermaid
sequenceDiagram
	participant User
	participant UI as React UI
	participant Grid as PromptGrid
	participant Bridge as window.api
	participant Main as Electron Main
	participant DB as prompts_db.json

	User->>UI: Type search text or choose a filter
	UI->>Grid: Render filtered prompt cards
	User->>Grid: Click a prompt card or Copy
	alt Open prompt
		Grid->>UI: onSelectPrompt(promptId)
		UI->>UI: Open editor panel
	else Copy prompt text
		Grid->>Bridge: incrementUsage(promptId)
		Bridge->>Main: db-increment-usage
		Main->>DB: Increment usage count
		Main-->>Grid: Return updated snapshot
		Grid-->>User: Clipboard updated
	end
```

### 3. Backup Export And Import

```mermaid
sequenceDiagram
	participant User
	participant UI as React UI
	participant Bridge as window.api
	participant Main as Electron Main
	participant Modal as Backup Dialog
	participant Dialog as OS File Dialog

	User->>UI: Choose export or import
	alt Export backup
		UI->>Modal: Open backup picker
		User->>Modal: Toggle prompts / theme
		UI->>Bridge: exportBackup(payload)
		Bridge->>Main: db-export-backup
		Main->>Dialog: Open Save dialog
		Dialog-->>Main: Return file path
		Main->>Main: Write JSON backup file
		Main-->>UI: Success / failure
		UI-->>User: Close backup dialog on success
	else Import backup
		UI->>Bridge: importBackup()
		Bridge->>Main: db-import-backup
		Main->>Dialog: Open File picker
		Dialog-->>Main: Return file path
		Main->>Main: Read raw JSON backup
		Main-->>UI: Return raw backup JSON string
		UI->>UI: Detect prompts-only, theme-only, or combined backup
		UI->>Modal: Open backup picker with detected sections
		UI->>UI: Merge selected prompts/categories/settings
	end
```

## Persistence Model

- Prompts and categories are persisted in `prompts_db.json` inside Electron `userData`.
- Theme mode and accent color are persisted in `localStorage`.
- Custom AI models are persisted in `localStorage` and synchronized across editor and title bar components.
- Backup files use a version 3 format with separate prompts and theme sections.
- Import no longer includes legacy backup compatibility.

## Project Scripts

- `npm run dev` - start the Vite renderer.
- `npm run electron:dev` - run the renderer and Electron together.
- `npm run build` - type-check and build the renderer.
- `npm run electron:build` - build the app and package it with Electron Builder.
- `npm run lint` - run ESLint.

## Implementation Notes

- `electron/main.cjs` owns window controls, database reads/writes, and backup import/export dialogs.
- `electron/preload.cjs` exposes the `window.api` surface used by the renderer.
- `src/App.tsx` orchestrates filtering, persistence, notifications, imports, exports, and editor state.
- `src/components/PromptEditor.tsx` handles prompt editing, template compilation, revision history, and custom model creation.
- `src/components/Sidebar.tsx` handles category filtering and backup actions.
- `src/components/PromptGrid.tsx` handles quick copy, pin, and favorite actions.
- `src/utils/aiModels.ts` manages preset and custom AI model persistence.

## Development

Install dependencies and start the desktop app with:

```bash
npm install
npm run electron:dev
```
