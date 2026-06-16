import { memo, useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Task } from '../../types';
import './TaskCanvas.css';

interface TaskNodeProps {
  data: {
    task: Task;
    hasChildren: boolean;
    isExpanded: boolean;
    isPinned: boolean;
    direction: 'tb' | 'lr';
    childCount: number;
    // Callbacks
    onToggleDone?: (taskId: string) => void;
    onToggleSession?: (taskId: string) => void;
    onAddChild?: (taskId: string) => void;
    onToggleExpand?: (taskId: string) => void;
  };
  selected?: boolean;
}

const TaskNode = ({ data, selected }: TaskNodeProps) => {
  const { task, hasChildren, isExpanded, isPinned, direction, childCount, onToggleDone, onToggleSession, onAddChild, onToggleExpand } = data;
  const [showTooltip, setShowTooltip] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<number | null>(null);

  const isCompleted = task.status === 'completed' || task.status === 'archived';
  const isHorizontal = direction === 'lr';

  useEffect(() => {
    return () => {
      if (hoverTimeout) clearTimeout(hoverTimeout);
    };
  }, [hoverTimeout]);

  const handleMouseEnter = () => {
    if (task.description || task.deadline) {
      setHoverTimeout(window.setTimeout(() => setShowTooltip(true), 600));
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    setShowTooltip(false);
  };

  return (
    <div 
      className={`task-node ${selected ? 'selected' : ''} ${isPinned ? 'pinned' : ''} ${isCompleted ? 'done' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Handle 
        type="target" 
        position={isHorizontal ? Position.Left : Position.Top} 
        style={{ background: 'var(--text-muted)', visibility: task.parent_id ? 'visible' : 'hidden' }} 
      />
      
      <div className="node-header">
        {/* Done Ring */}
        <button 
          className={`done-ring ${isCompleted ? 'checked' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleDone?.(task.id);
          }}
          title={isCompleted ? "Mark incomplete" : "Mark completed"}
        >
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="2.5 7 5.5 10 11.5 3"></polyline>
          </svg>
        </button>

        {/* Title */}
        <div className={`node-title ${isCompleted ? 'strikethrough' : ''}`}>
          {task.title || 'Untitled Task'}
        </div>

        {/* Session Square */}
        <button 
          className={`session-square ${task.session_queued ? 'queued' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSession?.(task.id);
          }}
          title={task.session_queued ? "Remove from session queue" : "Add to session queue"}
        >
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="2.5 7 5.5 10 11.5 3"></polyline>
          </svg>
        </button>
      </div>

      {/* Expand Indicator (Chevron) */}
      <div 
        className={`expand-chevron ${isExpanded ? 'expanded' : ''}`}
        style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
        onClick={(e) => {
          if (!hasChildren) return;
          e.stopPropagation();
          onToggleExpand?.(task.id);
        }}
        title={`${childCount} subtasks`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
        <span className="child-count">{hasChildren ? childCount : ''}</span>
      </div>

      {/* Add Child Button (appears on hover via CSS) */}
      <button 
        className={`add-child-btn ${isHorizontal ? 'right-side' : 'bottom'}`}
        onClick={(e) => {
          e.stopPropagation();
          onAddChild?.(task.id);
        }}
        title="Add subtask"
      >
        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>

      {/* Tooltip */}
      {showTooltip && (task.description || task.deadline) && (
        <div className="info-tooltip">
          {task.description && <div className="tooltip-desc">{task.description}</div>}
          {task.deadline && <div className="tooltip-date">Due: {new Date(task.deadline).toLocaleDateString()}</div>}
        </div>
      )}

      <Handle 
        type="source" 
        position={isHorizontal ? Position.Right : Position.Bottom} 
        style={{ background: 'var(--text-muted)' }} 
      />
    </div>
  );
};

export default memo(TaskNode);
