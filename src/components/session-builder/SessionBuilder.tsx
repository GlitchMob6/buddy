/**
 * SessionBuilder — premium session creation interface.
 *
 * Two-panel layout:
 *   Left:  Task selector (checkboxes from the task tree)
 *   Right: Time slider + generated blueprint timeline + start button
 *
 * Uses the real Session Engine backend (B1a):
 *   - generateSessionBlueprint → scoring + ordering + break insertion
 *   - createSession → persists session + session_tasks
 *   - startSession → activates the session
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import './SessionBuilder.css';
import type {
  Task,
  BlueprintResponse,
  SessionPlanBlock,
} from '../../types';
import {
  getTaskTree,
  generateSessionBlueprint,
  createSession,
  startSession,
} from '../../lib/ipc';

// ── Helpers ─────────────────────────────────────────────────────────────────

function priorityClass(p: number): string {
  if (p >= 7) return 'p-high';
  if (p >= 4) return 'p-medium';
  return 'p-low';
}

function deadlineLabel(deadline: string | null): { text: string; cls: string } | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  if (diff < 0) return { text: `${Math.abs(diff)}d overdue`, cls: 'overdue' };
  if (diff === 0) return { text: 'Due today', cls: 'overdue' };
  if (diff <= 2) return { text: `Due in ${diff}d`, cls: 'deadline' };
  if (diff <= 7) return { text: `Due in ${diff}d`, cls: 'deadline' };
  return { text: `${diff}d away`, cls: '' };
}

function formatMinutes(m: number): string {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r > 0 ? `${h}h ${r}m` : `${h}h`;
}

// ── Component ───────────────────────────────────────────────────────────────

interface Props {
  onSessionStarted: () => void;
}

export default function SessionBuilder({ onSessionStarted }: Props) {
  // ── State ──
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [totalMinutes, setTotalMinutes] = useState(60);
  const [blueprint, setBlueprint] = useState<BlueprintResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState('');

  // ── Load tasks ──
  useEffect(() => {
    getTaskTree()
      .then((tasks) => {
        // Only show schedulable tasks (not completed/archived)
        const schedulable = tasks.filter(
          (t) => t.status === 'todo' || t.status === 'in_progress',
        );
        setAllTasks(schedulable);
        // Auto-select tasks that were marked as session_queued
        const queued = new Set<string>();
        for (const t of schedulable) {
          if (t.session_queued) queued.add(t.id);
        }
        if (queued.size > 0) setSelectedIds(queued);
      })
      .catch(() => {});
  }, []);

  // ── Toggle task selection ──
  const toggleTask = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Generate blueprint when selection or time changes ──
  const selectedTaskIds = useMemo(
    () => allTasks.filter((t) => selectedIds.has(t.id)).map((t) => t.id),
    [allTasks, selectedIds],
  );

  useEffect(() => {
    if (selectedTaskIds.length === 0) {
      setBlueprint(null);
      return;
    }
    const timeout = setTimeout(() => {
      generateSessionBlueprint(selectedTaskIds, totalMinutes)
        .then(setBlueprint)
        .catch((e) => setError(String(e)));
    }, 200); // small debounce
    return () => clearTimeout(timeout);
  }, [selectedTaskIds, totalMinutes]);

  // ── Start session ──
  const handleStart = useCallback(async () => {
    if (!blueprint || blueprint.blocks.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      // Collect task IDs and their allocated minutes from the blueprint
      const taskBlocks: { id: string; minutes: number }[] = [];
      const seen = new Set<string>();
      for (const block of blueprint.blocks) {
        if (block.kind === 'task' && block.task_id) {
          if (seen.has(block.task_id)) {
            // Split task — add to existing
            const existing = taskBlocks.find((t) => t.id === block.task_id);
            if (existing) existing.minutes += block.duration_minutes;
          } else {
            taskBlocks.push({
              id: block.task_id,
              minutes: block.duration_minutes,
            });
            seen.add(block.task_id);
          }
        }
      }

      const session = await createSession({
        name: sessionName || undefined,
        task_ids: taskBlocks.map((t) => t.id),
        allocated_minutes: taskBlocks.map((t) => t.minutes),
        total_minutes: totalMinutes,
      });

      await startSession(session.id);
      onSessionStarted();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [blueprint, sessionName, totalMinutes, onSessionStarted]);

  // ── Render ──
  return (
    <div className="session-builder animate-fade-in">
      {/* ── Left: Task Selector ── */}
      <div className="sb-task-selector">
        <div className="sb-section-title">Select Tasks</div>

        {/* Session name input */}
        <input
          className="input"
          placeholder="Session name (optional)"
          value={sessionName}
          onChange={(e) => setSessionName(e.target.value)}
          style={{ fontSize: 'var(--text-sm)' }}
        />

        <div className="sb-task-list">
          {allTasks.length === 0 && (
            <div className="sb-empty">
              <div className="sb-empty-icon">⬡</div>
              <div className="sb-empty-text">
                No tasks available. Create tasks on the Task Canvas first.
              </div>
            </div>
          )}
          {allTasks.map((task) => {
            const isSelected = selectedIds.has(task.id);
            const dl = deadlineLabel(task.deadline);
            return (
              <div
                key={task.id}
                className={`sb-task-item${isSelected ? ' selected' : ''}`}
                onClick={() => toggleTask(task.id)}
              >
                <div className="sb-task-check">{isSelected ? '✓' : ''}</div>
                <div className="sb-task-info">
                  <div className="sb-task-title">{task.title}</div>
                  <div className="sb-task-meta">
                    <span className="sb-task-meta-item">
                      <span
                        className={`sb-priority-dot ${priorityClass(task.priority)}`}
                      />
                      P{task.priority}
                    </span>
                    <span className="sb-task-meta-item">
                      {task.estimated_minutes}m
                    </span>
                    {dl && (
                      <span className={`sb-task-meta-item ${dl.cls}`}>
                        {dl.text}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: Blueprint Panel ── */}
      <div className="sb-blueprint-panel">
        {/* Time slider */}
        <div className="sb-time-controls">
          <span className="sb-time-label">Session Duration</span>
          <input
            type="range"
            className="sb-time-slider"
            min={15}
            max={240}
            step={5}
            value={totalMinutes}
            onChange={(e) => setTotalMinutes(Number(e.target.value))}
          />
          <span className="sb-time-value">{formatMinutes(totalMinutes)}</span>
        </div>

        {/* Warnings */}
        {blueprint && blueprint.warnings.length > 0 && (
          <div className="sb-warnings">
            {blueprint.warnings.map((w, i) => (
              <div key={i} className="sb-warning">
                <span className="sb-warning-icon">⚠</span>
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              background: 'hsl(0 84% 60% / 0.12)',
              border: '1px solid hsl(0 84% 60% / 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              color: 'var(--danger)',
              fontSize: 'var(--text-xs)',
            }}
          >
            {error}
          </div>
        )}

        {/* Timeline blocks */}
        {blueprint && blueprint.blocks.length > 0 ? (
          <div className="sb-timeline">
            {blueprint.blocks.map((block, i) => (
              <TimelineBlock key={i} block={block} index={i} />
            ))}
          </div>
        ) : selectedIds.size > 0 ? (
          <div className="sb-empty">
            <div className="sb-empty-icon">◷</div>
            <div className="sb-empty-text">Generating plan…</div>
          </div>
        ) : (
          <div className="sb-empty">
            <div className="sb-empty-icon">◎</div>
            <div className="sb-empty-text">
              Select tasks from the left panel to build your session plan.
            </div>
          </div>
        )}

        {/* Summary + Start */}
        {blueprint && blueprint.blocks.length > 0 && (
          <div className="sb-summary">
            <div className="sb-summary-stat">
              <span className="sb-summary-label">Work</span>
              <span className="sb-summary-value">
                {formatMinutes(blueprint.total_work_minutes)}
              </span>
            </div>
            <div className="sb-summary-stat">
              <span className="sb-summary-label">Breaks</span>
              <span className="sb-summary-value">
                {blueprint.total_break_minutes > 0
                  ? formatMinutes(blueprint.total_break_minutes)
                  : '—'}
              </span>
            </div>
            <div className="sb-summary-stat">
              <span className="sb-summary-label">Tasks</span>
              <span className="sb-summary-value">
                {
                  new Set(
                    blueprint.blocks
                      .filter((b) => b.kind === 'task' && b.task_id)
                      .map((b) => b.task_id),
                  ).size
                }
              </span>
            </div>
            {blueprint.deferred_task_ids.length > 0 && (
              <div className="sb-summary-stat">
                <span className="sb-summary-label">Deferred</span>
                <span className="sb-summary-value" style={{ color: 'var(--warning)' }}>
                  {blueprint.deferred_task_ids.length}
                </span>
              </div>
            )}
            <div className="sb-summary-spacer" />
            <button
              className="sb-start-btn"
              disabled={loading}
              onClick={handleStart}
            >
              {loading ? '…' : '▶ Start Session'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Timeline Block ──────────────────────────────────────────────────────────

function TimelineBlock({
  block,
  index,
}: {
  block: SessionPlanBlock;
  index: number;
}) {
  const isBreak = block.kind === 'break';

  return (
    <div className={`sb-block ${isBreak ? 'break-block' : 'task-block'}`}>
      <span className="sb-block-order">{index + 1}</span>
      <div className="sb-block-icon">{isBreak ? '☕' : '⬡'}</div>
      <div className="sb-block-info">
        <div className="sb-block-title">
          {isBreak ? 'Break' : block.task_title ?? 'Task'}
        </div>
        <div className="sb-block-duration">
          {formatMinutes(block.duration_minutes)}
        </div>
      </div>
    </div>
  );
}
