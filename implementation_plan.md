# Workspace Layer — Implementation Plan

> All design decisions from discussion are locked in. This is the execution plan.

---

## Decisions Summary

| Decision | Choice |
|----------|--------|
| Architecture | **Approach 2** — Always-on-top overlay, no OS virtual desktops |
| Overlay shape | **Top bar** across top of screen |
| Boss Key | **Exits** the workspace / quits the session (not pause) |
| Multi-workspace | **Mental separation** — same resources, different labels |
| Resource filtering | **Show all registered apps** for MVP (no task-based filtering until Session Engine) |
| Session lifecycle | **Deferred** — workspace works independently of session scheduling |
| Monitoring | Built **after** workspace layer is complete |
| Priority feature | **Boss Key** |

---

## Architecture: Two-Window Model

### Window 1: Main Window (App Launcher Home)

The existing Buddy app window. When workspace mode is active, it becomes the **home screen**:

- Shows the app launcher grid (existing `AppLauncherGrid.tsx`)
- Visible when:
  - Workspace first starts (user picks what to launch)
  - All launched apps are closed (user returns to pick another)
- **Minimizes** when user launches an app → top bar takes over

### Window 2: Overlay Top Bar (Always-on-top)

A new, second Tauri window — thin, borderless, transparent, always-on-top:

- Appears when an app is launched from the home screen
- Stays on top of VS Code, Browser, any app the user is working in
- Contains: workspace tabs, session timer, Boss Key, focus score (placeholder)
- **Hides** when:
  - Boss Key is pressed (exits workspace entirely)
  - All apps are closed (main window restores to show launcher)

### State Machine

```
┌──────────────┐     launch app      ┌───────────────────┐
│              │ ──────────────────→  │                   │
│  HOME STATE  │                     │  WORKING STATE    │
│  (main win)  │ ←──────────────────  │  (overlay bar)   │
│              │   all apps closed   │                   │
└──────┬───────┘                     └────────┬──────────┘
       │                                      │
       │         Boss Key (either state)       │
       └──────────────┬───────────────────────┘
                      ▼
              ┌───────────────┐
              │ EXIT WORKSPACE│
              │ session ends  │
              │ back to Buddy │
              └───────────────┘
```

---

## Proposed Changes

### Phase 1: Overlay Window Infrastructure

#### [NEW] `src-tauri/src/overlay.html` (or route in Vite)
- Separate HTML entry point for the overlay window
- Minimal — just loads the overlay React component
- Transparent background (`html, body { background: transparent; }`)

#### [NEW] `src/overlay/OverlayApp.tsx`
- Root component for the overlay top bar
- Renders the top bar UI: workspace name, timer, Boss Key button
- Communicates with main window via Tauri events

#### [NEW] `src/overlay/overlay.css`
- Top bar styling: thin bar, glassmorphism/semi-transparent background
- Sits at top of screen, full width, ~40-48px tall
- Drag region for repositioning

#### [MODIFY] [tauri.conf.json](file:///d:/buddy/src-tauri/tauri.conf.json)
- Add second window definition: `assistive-overlay`
  - `decorations: false`, `transparent: true`, `alwaysOnTop: true`
  - `skipTaskbar: true`, `visible: false` (hidden until workspace activates)
  - Width: screen width, Height: ~48px, Position: top of screen

#### [MODIFY] [Cargo.toml](file:///d:/buddy/src-tauri/Cargo.toml)
- Add `tauri-plugin-global-shortcut` for Boss Key hotkey

---

### Phase 2: Workspace Lifecycle Commands

#### [MODIFY] [workspace_service.rs](file:///d:/buddy/src-tauri/src/services/workspace_service.rs)
Replace stubs with real implementations:

- `enter_workspace(app_handle)`:
  1. Show the overlay top bar window (set `visible: true`, `always_on_top: true`)
  2. Position at top of screen, full width
  3. Create workspace record in DB if needed
  
- `exit_workspace(app_handle)`:
  1. Hide the overlay window
  2. Restore/show main window
  3. Update workspace/session records

- `launch_resource` — already works, keep it. Add: minimize main window after launch

#### [MODIFY] [workspace_commands.rs](file:///d:/buddy/src-tauri/src/commands/workspace_commands.rs)
- Add `enter_workspace` command (shows overlay, minimizes main)
- Add `exit_workspace` / Boss Key command (hides overlay, restores main)
- Wire `launch_resource` to also trigger overlay show + main minimize

---

### Phase 3: Boss Key

#### [MODIFY] [lib.rs](file:///d:/buddy/src-tauri/src/lib.rs) (or setup)
- Register global shortcut for Boss Key (e.g., `Ctrl+Shift+Escape`)
- On trigger: call `exit_workspace`, log to `boss_key_usage` table
- Count free exits (first 2 free per session, then penalty)

#### [NEW] `src-tauri/src/services/boss_key_service.rs`
- `use_boss_key(session_id, reason)` → logs usage, checks free exit count
- `get_boss_key_usage(session_id)` → returns usage list
- Free exit logic: query `boss_key_usage` count for session, if ≤ 2 → free

#### [NEW] `src-tauri/src/commands/boss_key_commands.rs`
- `use_boss_key` IPC command
- `get_boss_key_usage` IPC command

---

### Phase 4: Top Bar UI (Overlay Frontend)

#### [NEW] `src/overlay/TopBarOverlay.tsx`
The actual top bar component rendered in the overlay window:

```
┌──────────────────────────────────────────────────────────────────┐
│  B  │  Workspace 1 │ Workspace 2 │ + │      17:23      │ 🚪 Exit │
└──────────────────────────────────────────────────────────────────┘
 logo    workspace tabs   add       clock/timer        Boss Key
```

Features:
- **Workspace tabs**: clickable, in-memory labels (same resources, mental separation)
- **Add workspace**: + button to create a new tab
- **Clock / Timer**: current time (session timer placeholder for when Session Engine arrives)
- **Boss Key**: 🚪 button, shows "2 free exits left" tooltip
- **Draggable**: entire bar can be dragged to reposition
- Glassmorphism: `backdrop-filter: blur(12px)`, semi-transparent dark background

#### [MODIFY] [WorkspaceOverlay.tsx](file:///d:/buddy/src/components/workspace/WorkspaceOverlay.tsx)
- This becomes the **home screen** — visible in main window
- Shows app launcher grid (already does this)
- When an app is launched: trigger IPC to show overlay + minimize main
- Add "Exit Workspace" button (alternative to Boss Key hotkey)

#### [MODIFY] [AppLauncherGrid.tsx](file:///d:/buddy/src/components/workspace/AppLauncherGrid.tsx)
- After successful `launchResource()`, call `enter_workspace` IPC to show overlay + minimize main
- The existing grid is fine — icons, names, click to launch

---

### Phase 5: Inter-Window Communication

The two Tauri windows need to talk to each other:

#### Events (Tauri event system)

| Event | From | To | Purpose |
|-------|------|----|---------|
| `app-launched` | Main | Overlay | App launched, show top bar |
| `boss-key-pressed` | Overlay/Global | Main | Exit workspace, restore main |
| `all-apps-closed` | Overlay (detected via monitoring later) | Main | Restore home screen |
| `workspace-switched` | Overlay | Main | Sync active workspace tab |

For MVP, `all-apps-closed` detection is deferred (requires monitoring). User manually returns via Boss Key or Alt+Tab back to Buddy.

---

## File Structure After Changes

```
src/
├── overlay/                          ← NEW: overlay window
│   ├── main.tsx                      ← Overlay entry point
│   ├── OverlayApp.tsx                ← Overlay root component
│   ├── TopBarOverlay.tsx             ← Top bar UI
│   └── overlay.css                   ← Transparent + glassmorphism
├── components/
│   └── workspace/
│       ├── WorkspaceOverlay.tsx       ← MODIFY: home screen behavior
│       ├── AppLauncherGrid.tsx        ← MODIFY: trigger overlay on launch
│       ├── TopBar.tsx                 ← KEEP for home screen (or remove if redundant)
│       ├── ChatbotPanel.tsx           ← KEEP placeholder
│       └── WorkspaceOverlay.css       ← KEEP
src-tauri/
├── src/
│   ├── services/
│   │   ├── workspace_service.rs       ← MODIFY: real enter/exit/launch
│   │   └── boss_key_service.rs        ← NEW
│   ├── commands/
│   │   ├── workspace_commands.rs      ← MODIFY: add enter/exit
│   │   └── boss_key_commands.rs       ← NEW
│   └── lib.rs                         ← MODIFY: register overlay window + global shortcut
├── Cargo.toml                         ← MODIFY: add global-shortcut plugin
└── tauri.conf.json                    ← MODIFY: add overlay window config
```

---

## Execution Order

```
1. Overlay window infrastructure (Tauri config + Rust setup)
   └─ Get a second transparent window showing/hiding on command

2. Boss Key service + commands
   └─ DB logging, free exit counter, IPC

3. Top bar overlay UI
   └─ React component in overlay window
   └─ Workspace tabs, clock, Boss Key button

4. Wire launch → overlay flow
   └─ AppLauncherGrid click → launch app → show overlay → minimize main
   └─ Boss Key → hide overlay → restore main

5. Polish
   └─ Glassmorphism, animations, drag-to-reposition
   └─ Global hotkey registration
```

---

## Verification Plan

### Automated
- `cargo test` — boss_key_service unit tests (free exit counting, DB logging)
- `cargo build` — ensure two-window config compiles

### Manual
- [ ] Launch app from grid → main window minimizes, top bar appears on top
- [ ] Top bar stays above VS Code / Browser
- [ ] Boss Key button in top bar → exits workspace, main window restores
- [ ] Global hotkey → same as Boss Key button
- [ ] Boss Key usage logged in DB with reason
- [ ] 3rd Boss Key press shows penalty indicator
- [ ] Workspace tabs clickable (in-memory label switch)
- [ ] Top bar is draggable
- [ ] Top bar has glassmorphism/premium feel

---

## What This Enables for Monitoring (Module A3, later)

After this workspace layer is complete:

1. Monitoring hooks into the **overlay window** — pushes focus score, violation warnings directly to the top bar
2. The top bar becomes the real-time monitoring dashboard
3. `all-apps-closed` detection becomes possible via the foreground window tracker
4. Escalation tiers render as overlay notifications (the overlay is already always-on-top)

The overlay IS the monitoring surface. Building it now means Module A3 has somewhere to display its data.
