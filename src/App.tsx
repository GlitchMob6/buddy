import React, { useState } from 'react';
import './index.css';
import { useSession } from './hooks/useSession';
import type { Session } from './types';
import ResourceRegistry from './components/resource-registry/ResourceRegistry';
import TaskCanvas from './components/task-canvas/TaskCanvas';
import WorkspaceOverlay from './components/workspace/WorkspaceOverlay';

// ── Nav items ──────────────────────────────────────────────────────────────────

type Page =
  | 'canvas'
  | 'sessions'
  | 'resources'
  | 'workspace'
  | 'monitoring'
  | 'dashboard';

interface NavItem {
  id: Page;
  label: string;
  icon: string;
  section: 'work' | 'observe' | 'insight';
}

const NAV_ITEMS: NavItem[] = [
  { id: 'canvas', label: 'Task Canvas', icon: '⬡', section: 'work' },
  { id: 'sessions', label: 'Sessions', icon: '◷', section: 'work' },
  { id: 'resources', label: 'Resources', icon: '⊞', section: 'work' },
  { id: 'dashboard', label: 'Dashboard', icon: '◈', section: 'insight' },
];

const SECTIONS: { id: NavItem['section']; label: string }[] = [
  { id: 'work', label: 'Work' },
  { id: 'insight', label: 'Insight' },
];

// ── Status badge ───────────────────────────────────────────────────────────────

function SessionStatusBadge({ status }: { status: Session['status'] }) {
  const map: Record<string, string> = {
    planned: 'badge-todo',
    active: 'badge-in-progress',
    paused: 'badge-todo',
    completed: 'badge-completed',
    abandoned: 'badge-archived',
  };
  return <span className={`badge ${map[status] ?? 'badge-todo'}`}>{status}</span>;
}

// ── Sessions page (live pseudo session test) ───────────────────────────────────

function SessionsPage({ onStart }: { onStart: () => void }) {
  const { activeSession, sessions, loading, error, create, start, pause, resume, complete, abandon } = useSession();
  const [newName, setNewName] = useState('');

  return (
    <div className="page-body animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Error banner */}
      {error && (
        <div style={{
          background: 'hsl(0 84% 60% / 0.12)',
          border: '1px solid hsl(0 84% 60% / 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          color: 'var(--danger)',
          fontSize: 'var(--text-sm)',
        }}>
          {error}
        </div>
      )}

      {/* Active session card */}
      <div>
        <div className="input-label" style={{ marginBottom: 12 }}>Active Session</div>
        {activeSession ? (
          <div className="card card-elevated animate-scale-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-md)', marginBottom: 4 }}>
                  {activeSession.name ?? 'Unnamed session'}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {activeSession.id}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`status-dot ${activeSession.status}`} />
                <SessionStatusBadge status={activeSession.status} />
              </div>
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              Started: {activeSession.start_time
                ? new Date(activeSession.start_time).toLocaleTimeString()
                : '—'}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {activeSession.status === 'active' && (
                <>
                  <button className="btn btn-secondary btn-sm" disabled={loading}
                    onClick={() => pause(activeSession.id)}>
                    ⏸ Pause
                  </button>
                  <button className="btn btn-primary btn-sm" disabled={loading}
                    onClick={() => complete(activeSession.id)}>
                    ✓ Complete
                  </button>
                  <button className="btn btn-danger btn-sm" disabled={loading}
                    onClick={() => abandon(activeSession.id)}>
                    ✕ Abandon
                  </button>
                </>
              )}
              {activeSession.status === 'paused' && (
                <>
                  <button className="btn btn-primary btn-sm" disabled={loading}
                    onClick={() => resume(activeSession.id)}>
                    ▶ Resume
                  </button>
                  <button className="btn btn-danger btn-sm" disabled={loading}
                    onClick={() => abandon(activeSession.id)}>
                    ✕ Abandon
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="card" style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: 32 }}>
            No active session
          </div>
        )}
      </div>

      {/* Create new session */}
      {!activeSession && (
        <div>
          <div className="input-label" style={{ marginBottom: 12 }}>New Session</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              id="session-name-input"
              className="input"
              placeholder="Session name (optional)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={async e => {
                if (e.key === 'Enter') {
                  const s = await create(newName || undefined);
                  setNewName('');
                  await start(s.id);
                }
              }}
            />
            <button
              id="create-session-btn"
              className="btn btn-primary"
              disabled={loading}
              style={{ whiteSpace: 'nowrap' }}
              onClick={async () => {
                const s = await create(newName || undefined);
                setNewName('');
                await start(s.id);
                onStart();
              }}
            >
              {loading ? '…' : '▶ Start Session'}
            </button>
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 8 }}>
            Creates a pseudo session — full lifecycle enforced via SQLite.
          </div>
        </div>
      )}

      {/* Session history */}
      <div>
        <div className="input-label" style={{ marginBottom: 12 }}>
          Session History ({sessions.length})
        </div>
        {sessions.length === 0 ? (
          <div className="card" style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center', padding: 24 }}>
            No sessions yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sessions.map(s => (
              <div key={s.id} className="card" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px'
              }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 'var(--text-sm)' }}>
                    {s.name ?? 'Unnamed'}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {s.id.slice(0, 8)}…
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {s.status === 'planned' && (
                    <button className="btn btn-secondary btn-sm" disabled={loading}
                      onClick={async () => { await start(s.id); onStart(); }}>
                      ▶ Start
                    </button>
                  )}
                  <SessionStatusBadge status={s.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// ── Placeholder page ────────────────────────────────────────────────────────────

function PlaceholderPage({ page }: { page: Page }) {
  const item = NAV_ITEMS.find(n => n.id === page)!;
  const descriptions: Record<Page, string> = {
    canvas: 'Your infinite task tree — create, connect, and manage work visually.',
    sessions: '',
    resources: 'Manage apps, folders, and URLs tied to your work.',
    dashboard: "Buddy's model of how you work — focus score, patterns, insights.",
    workspace: 'Manage your current workspace.',
    monitoring: 'View system and process monitoring.',
  };
  const ownerTag: Record<Page, string> = {
    canvas: 'Dev A · Module A1',
    sessions: 'Dev B · Module B1',
    resources: 'Dev A · Module A2',
    workspace: 'Dev A · Module A4',
    monitoring: 'Dev A · Module A3',
    dashboard: 'Dev B · Module B3',
  };

  return (
    <div className="page-body animate-fade-in">
      <div className="empty-state" style={{ height: '100%' }}>
        <div className="empty-state-icon">{item.icon}</div>
        <div>
          <div className="empty-state-title">{item.label}</div>
          <div className="empty-state-desc" style={{ marginTop: 8 }}>
            {descriptions[page]}
          </div>
          <div className="badge badge-in-progress mono" style={{ marginTop: 16, fontSize: 11 }}>
            {ownerTag[page]}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Active session bar ─────────────────────────────────────────────────────────

function ActiveSessionBar() {
  const { activeSession } = useSession();
  if (!activeSession || activeSession.status === 'completed' || activeSession.status === 'abandoned') return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-full)',
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      boxShadow: 'var(--shadow-lg)',
      fontSize: 'var(--text-sm)',
      zIndex: 1000,
      animation: 'scaleIn var(--duration-normal) var(--ease-spring)',
    }}>
      <span className={`status-dot ${activeSession.status}`} />
      <span style={{ color: 'var(--text-secondary)' }}>Session</span>
      <span style={{ fontWeight: 600 }}>{activeSession.name ?? 'Active'}</span>
      <SessionStatusBadge status={activeSession.status} />
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────────────────────

export default function App() {
  const [activePage, setActivePage] = useState<Page>('sessions');

  const renderPage = () => {
    if (activePage === 'sessions') return <SessionsPage onStart={() => setActivePage('workspace')} />;
    if (activePage === 'resources') return <ResourceRegistry />;
    if (activePage === 'canvas') return <TaskCanvas />;
    if (activePage === 'workspace') return <WorkspaceOverlay />;
    return <PlaceholderPage page={activePage} />;
  };

  return (
    <div className="app-layout">
      {/* ── Sidebar ── */}
      <nav className="sidebar" aria-label="Main navigation">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">B</div>
          <span className="sidebar-logo-name">Buddy</span>
        </div>

        {SECTIONS.map(section => (
          <React.Fragment key={section.id}>
            <div className="sidebar-section-label">{section.label}</div>
            {NAV_ITEMS.filter(n => n.section === section.id).map(item => (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                className={`nav-item${activePage === item.id ? ' active' : ''}`}
                onClick={() => setActivePage(item.id)}
                aria-current={activePage === item.id ? 'page' : undefined}
              >
                <span className="nav-item-icon" aria-hidden="true">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </React.Fragment>
        ))}
      </nav>

      {/* ── Main content ── */}
      <main className="main-content">
        <div className="page-header">
          <div>
            <div className="page-title">
              {NAV_ITEMS.find(n => n.id === activePage)?.label}
            </div>
            <div className="page-subtitle">
              {activePage === 'sessions' && 'Phase 0 · Pseudo session system — live'}
              {activePage === 'resources' && 'Module A2 · Manage apps, folders, domains, and URLs'}
            </div>
          </div>
        </div>

        {renderPage()}
      </main>

      {/* ── Global active session indicator ── */}
      <ActiveSessionBar />
    </div>
  );
}
