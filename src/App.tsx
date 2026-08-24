import React, { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import './index.css';
import { useSession } from './hooks/useSession';
import type { Session } from './types';
import ResourceRegistry from './components/resource-registry/ResourceRegistry';
import TaskCanvas from './components/task-canvas/TaskCanvas';
import WorkspaceOverlay from './components/workspace/WorkspaceOverlay';
import SessionBuilder from './components/session-builder/SessionBuilder';

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

  useEffect(() => {
    const unlisten = listen('session-abandoned', () => {
      setActivePage('sessions');
    });
    return () => {
      unlisten.then(f => f());
    };
  }, []);

  const renderPage = () => {
    if (activePage === 'sessions') return <SessionBuilder onSessionStarted={() => setActivePage('workspace')} />;
    if (activePage === 'resources') return <ResourceRegistry />;
    if (activePage === 'canvas') return <TaskCanvas />;
    if (activePage === 'workspace') return <WorkspaceOverlay onExit={() => setActivePage('sessions')} />;
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
              {activePage === 'sessions' && 'Session Engine · Build your work session'}
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
