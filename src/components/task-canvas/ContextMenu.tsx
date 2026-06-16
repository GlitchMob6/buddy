import React, { useEffect, useRef } from 'react';
import './TaskCanvas.css';

interface ContextMenuProps {
  x: number;
  y: number;
  isPinned: boolean;
  onEdit: () => void;
  onPin: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function ContextMenu({ x, y, isPinned, onEdit, onPin, onDelete, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    // Slight delay to prevent the click that opened the menu from immediately closing it
    setTimeout(() => {
      window.addEventListener('click', handleClickOutside);
    }, 10);
    
    return () => window.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  // Ensure menu doesn't go off screen
  const style: React.CSSProperties = {
    left: x,
    top: y,
  };

  if (x > window.innerWidth - 150) {
    style.left = undefined;
    style.right = window.innerWidth - x;
  }
  
  if (y > window.innerHeight - 150) {
    style.top = undefined;
    style.bottom = window.innerHeight - y;
  }

  return (
    <div ref={menuRef} className="ctx-menu" style={style}>
      <button className="ctx-item" onClick={() => { onEdit(); onClose(); }}>
        ✏️ Edit Task
      </button>
      <button className="ctx-item" onClick={() => { onPin(); onClose(); }}>
        {isPinned ? '📌 Unpin Node' : '📌 Pin Node'}
      </button>
      <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />
      <button className="ctx-item danger" onClick={() => { onDelete(); onClose(); }}>
        🗑️ Delete Task
      </button>
    </div>
  );
}
