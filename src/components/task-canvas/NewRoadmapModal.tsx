import React, { useState } from 'react';
import './TaskCanvas.css';

interface NewRoadmapModalProps {
  onClose: () => void;
  onSubmit: (data: { title: string; description: string; deadline: string; direction: 'tb' | 'lr' }) => void;
}

export default function NewRoadmapModal({ onClose, onSubmit }: NewRoadmapModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [direction, setDirection] = useState<'tb' | 'lr'>('tb');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title, description, deadline, direction });
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h2>New Roadmap</h2>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Roadmap Title <span className="req">*</span></label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="e.g. Master Rust in 30 days"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="High level overview..."
            />
          </div>

          <div className="form-group">
            <label>Target Deadline</label>
            <input 
              type="date" 
              value={deadline} 
              onChange={e => setDeadline(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label>Growth Direction</label>
            <div className="dir-toggle">
              <button 
                type="button"
                className={`dir-btn ${direction === 'tb' ? 'active' : ''}`}
                onClick={() => setDirection('tb')}
              >
                Top → Bottom
              </button>
              <button 
                type="button"
                className={`dir-btn ${direction === 'lr' ? 'active' : ''}`}
                onClick={() => setDirection('lr')}
              >
                Left → Right
              </button>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-submit" disabled={!title.trim()}>Create Canvas</button>
          </div>
        </form>
      </div>
    </div>
  );
}
