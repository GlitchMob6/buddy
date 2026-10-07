# Buddy

**A desktop productivity workspace for turning work into focused, trackable sessions.**

Buddy is a cross-platform desktop application built with **Tauri 2, React 19, TypeScript, Rust, and SQLite**. It combines a modern React interface with a native Rust backend and local SQLite persistence.

## What it does

Buddy is organized around the idea of a focused work session rather than a conventional task list.

The current interface includes:

- **Task Canvas** for work-focused activity
- **Sessions** with start, pause, resume, complete, and abandon states
- **Resources** for supporting work material
- **Workspace** and **Monitoring** views
- **Dashboard** for higher-level insight
- Local persistence through SQLite

## Tech stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri 2 |
| Frontend | React 19 + TypeScript |
| Build tooling | Vite |
| Native backend | Rust |
| Database | SQLite via `rusqlite` |
| Serialization | Serde / JSON |

## Architecture

Buddy uses Tauri to connect the React frontend with a native Rust backend.

```text
React + TypeScript UI
        │
        │ Tauri API
        ▼
   Rust backend
        │
        ▼
     SQLite
```

The Rust side handles persistent application state and database operations, while the React side provides the desktop interface and session workflow.

## Session lifecycle

Sessions currently support:

```text
planned → active → paused → active
                    ↓
               completed
                    or
               abandoned
```

This makes the session model explicit instead of treating productivity activity as a collection of unstructured timers.

## Development

### Requirements

- Node.js
- Rust toolchain
- Tauri 2 prerequisites for your operating system

### Install dependencies

```bash
npm install
```

### Run in development

```bash
npm run tauri dev
```

### Build

```bash
npm run build
```

## Project structure

```text
buddy/
├── src/             # React frontend
├── src-tauri/       # Rust/Tauri backend
├── package.json
└── vite.config.*    # Vite configuration
```

## Status

🚧 **Active development**

Buddy is still evolving, so some parts of the interface and feature set may change as the application develops.

## License

No project license has been declared yet.
