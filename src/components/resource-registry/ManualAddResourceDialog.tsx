import { useState } from 'react';
import { useResources, CATEGORY_ORDER } from '../../hooks/useResources';
import { AppRole } from '../../types';
import { open } from '@tauri-apps/plugin-dialog';

interface ManualAddResourceDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ManualAddResourceDialog({ isOpen, onClose }: ManualAddResourceDialogProps) {
  const { register, grouped } = useResources();
  const [displayName, setDisplayName] = useState('');
  const [exePath, setExePath] = useState('');
  const [category, setCategory] = useState('Productivity');
  const [role] = useState<AppRole>('work_tool');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Gather all unique categories (predefined + custom)
  const allCategories = Array.from(new Set([
    ...CATEGORY_ORDER,
    ...Object.keys(grouped)
  ])).sort((a, b) => {
    const aIndex = CATEGORY_ORDER.indexOf(a);
    const bIndex = CATEGORY_ORDER.indexOf(b);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.localeCompare(b);
  });

  const handlePickFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Applications',
          extensions: ['exe', 'lnk', 'bat', 'cmd', 'ps1']
        }]
      });
      if (typeof selected === 'string') {
        setExePath(selected);
        // Extract a basic name if empty
        if (!displayName) {
          const match = selected.match(/([^\\/]+)\.[^.]+$/);
          if (match && match[1]) setDisplayName(match[1]);
        }
      }
    } catch (e) {
      console.error('Failed to open file picker', e);
    }
  };

  const handleRegister = async () => {
    if (!exePath.trim()) {
      setError('Application path is required.');
      return;
    }
    setIsRegistering(true);
    setError(null);
    try {
      await register({
        resource_value: exePath,
        display_name: displayName.trim() || undefined,
        category: category.trim() || 'Other',
        app_role: role,
      });
      
      // Reset form
      setDisplayName('');
      setExePath('');
      setCategory('Productivity');
      
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="scan-overlay" onClick={onClose}>
      <div className="scan-modal" style={{ width: 500 }} onClick={e => e.stopPropagation()}>
        <div className="scan-modal-header">
          <div>
            <div className="scan-modal-title">Add App Manually</div>
            <div className="scan-modal-subtitle">Register a custom application or file shortcut</div>
          </div>
        </div>
        
        <div className="scan-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && <div className="resource-error">{error}</div>}
          
          <div className="form-field">
            <label className="input-label" style={{ marginBottom: '4px' }}>Application Path</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                className="input" 
                placeholder="C:\Path\To\App.exe" 
                value={exePath}
                onChange={e => setExePath(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn btn-secondary" onClick={handlePickFile}>Browse...</button>
            </div>
          </div>

          <div className="form-field">
            <label className="input-label" style={{ marginBottom: '4px' }}>Display Name</label>
            <input 
              type="text" 
              className="input" 
              placeholder="e.g. My Custom App (Optional)" 
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="input-label" style={{ marginBottom: '4px' }}>Category</label>
            <select 
              className="input" 
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={{ width: '100%' }}
            >
              {allCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="scan-modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={isRegistering}>Cancel</button>
          <button className="btn btn-primary" onClick={handleRegister} disabled={isRegistering || !exePath}>
            {isRegistering ? 'Registering...' : 'Register App'}
          </button>
        </div>
      </div>
    </div>
  );
}
