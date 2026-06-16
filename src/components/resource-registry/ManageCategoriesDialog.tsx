import { useState } from 'react';
import { useCustomCategories } from '../../hooks/useCustomCategories';

interface ManageCategoriesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ManageCategoriesDialog({ isOpen, onClose }: ManageCategoriesDialogProps) {
  const { customCategories, addCustomCategory, removeCustomCategory } = useCustomCategories();
  const [newCat, setNewCat] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = () => {
    const trimmed = newCat.trim();
    if (!trimmed) return;

    if (customCategories.includes(trimmed)) {
      setErrorMsg('Category already exists');
      return;
    }

    addCustomCategory(trimmed);
    setNewCat('');
    setErrorMsg(null);
  };

  return (
    <div className="scan-overlay" onClick={onClose}>
      <div className="scan-modal" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
        <div className="scan-modal-header">
          <div>
            <div className="scan-modal-title">Manage Custom Categories</div>
            <div className="scan-modal-subtitle">Create empty categories that persist on your dashboard</div>
          </div>
        </div>
        
        <div className="scan-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <input 
                type="text" 
                className="input" 
                placeholder="New category name..." 
                value={newCat} 
                onChange={e => {
                  setNewCat(e.target.value);
                  setErrorMsg(null);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
                style={{ flex: 1 }}
              />
              <button className="btn btn-secondary" onClick={handleAdd} disabled={!newCat.trim()}>Add</button>
            </div>
            {errorMsg && <div className="form-validation error">{errorMsg}</div>}
          </div>

          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {customCategories.length === 0 ? (
              <div style={{ textAlign: 'center', opacity: 0.6, fontSize: '0.9rem', padding: '16px' }}>
                No custom categories created yet.
              </div>
            ) : (
              customCategories.map(cat => (
                <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: '8px 12px', borderRadius: '6px' }}>
                  <span>{cat}</span>
                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => removeCustomCategory(cat)}
                    style={{ padding: '4px 8px' }}
                    title="Delete category"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="scan-modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
