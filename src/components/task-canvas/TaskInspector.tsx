import { useState, useEffect } from 'react';
import type { Task, UpdateTaskPayload } from '../../types';
import './TaskCanvas.css';

interface TaskInspectorProps {
  task: Task | null;
  onUpdate: (payload: UpdateTaskPayload) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
  onAddSubtask: (parentId: string) => void;
}

export default function TaskInspector({ task, onUpdate, onDelete, onClose, onAddSubtask }: TaskInspectorProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(5);
  const [status, setStatus] = useState<Task['status']>('todo');
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [deadline, setDeadline] = useState('');

  // Sync state when selected task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setStatus(task.status);
      setEstimatedMinutes(task.estimated_minutes || 30);
      setDeadline(task.deadline ? task.deadline.split('T')[0] : '');
    }
  }, [task]);

  if (!task) return null;

  const handleBlur = () => {
    if (
      title !== task.title ||
      description !== (task.description || '') ||
      priority !== task.priority ||
      status !== task.status ||
      estimatedMinutes !== task.estimated_minutes ||
      deadline !== (task.deadline ? task.deadline.split('T')[0] : '')
    ) {
      onUpdate({
        id: task.id,
        title,
        description,
        priority,
        status,
        estimated_minutes: estimatedMinutes,
        deadline: deadline || undefined,
      });
    }
  };

  return (
    <div className="task-inspector card card-elevated animate-fade-in" style={{
      position: 'absolute',
      right: 24,
      top: 24,
      bottom: 24,
      width: 340,
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 'var(--text-md)' }}>Inspector</h3>
        <button className="btn btn-secondary btn-sm" onClick={onClose}>✕</button>
      </div>

      <div className="input-group">
        <label className="input-label">Title</label>
        <input 
          className="input" 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
          onBlur={handleBlur}
          placeholder="Task title"
        />
      </div>

      <div className="input-group">
        <label className="input-label">Status</label>
        <select 
          className="input" 
          value={status} 
          onChange={e => {
            setStatus(e.target.value as Task['status']);
            onUpdate({ id: task.id, status: e.target.value as Task['status'] });
          }}
        >
          <option value="todo">Todo</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="input-group">
        <label className="input-label">Priority (1-10): {priority}</label>
        <input 
          type="range" 
          min="1" 
          max="10" 
          value={priority}
          onChange={e => setPriority(parseInt(e.target.value, 10))}
          onMouseUp={handleBlur}
          style={{ width: '100%' }}
        />
      </div>

      <div className="input-group">
        <label className="input-label">Estimated Minutes</label>
        <input 
          type="number"
          className="input" 
          value={estimatedMinutes} 
          onChange={e => setEstimatedMinutes(parseInt(e.target.value, 10) || 0)} 
          onBlur={handleBlur}
        />
      </div>

      <div className="input-group">
        <label className="input-label">Deadline</label>
        <input 
          type="date"
          className="input" 
          value={deadline} 
          onChange={e => setDeadline(e.target.value)} 
          onBlur={handleBlur}
        />
      </div>

      <div className="input-group" style={{ flexGrow: 1 }}>
        <label className="input-label">Description</label>
        <textarea 
          className="input" 
          value={description} 
          onChange={e => setDescription(e.target.value)} 
          onBlur={handleBlur}
          placeholder="Task description..."
          style={{ minHeight: 100, resize: 'vertical' }}
        />
      </div>

      {/* Module A2 Integration placeholder for future phase */}
      <div className="input-group" style={{ opacity: 0.5 }}>
        <label className="input-label">Resources</label>
        <div style={{ fontSize: 'var(--text-xs)' }}>Resource linking coming in Phase 4.</div>
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
        <button 
          className="btn btn-primary" 
          onClick={() => onAddSubtask(task.id)}
        >
          + Add Subtask
        </button>
        <button 
          className="btn btn-danger" 
          onClick={() => {
            if (window.confirm('Delete this task and all its subtasks?')) {
              onDelete(task.id);
            }
          }}
        >
          Delete Task
        </button>
      </div>
    </div>
  );
}
