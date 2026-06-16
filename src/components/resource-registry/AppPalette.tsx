import { useState, useEffect, useRef } from 'react';
import { ScannedResource, AppRole } from '../../types';
import { useResources } from '../../hooks/useResources';
import { Search, Plus, Check } from 'lucide-react';
import { scanResources } from '../../lib/ipc';

interface AppPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppPalette({ isOpen, onClose }: AppPaletteProps) {
  const { resources, register } = useResources();
  const [scannedApps, setScannedApps] = useState<ScannedResource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [roles, setRoles] = useState<Record<string, AppRole>>({});
  const [registering, setRegistering] = useState<Record<string, boolean>>({});
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (scannedApps.length === 0) {
        setIsLoading(true);
        scanResources().then((apps) => {
          setScannedApps(apps);
          
          // Auto-suggest roles
          const initialRoles: Record<string, AppRole> = {};
          apps.forEach(a => {
            let role: AppRole = 'work_tool';
            if (a.category === 'Media') role = 'background';
            if (a.category === 'Browser' || a.category === 'Communication') role = 'on_demand';
            initialRoles[a.exe_path] = role;
          });
          setRoles(initialRoles);
          
          setIsLoading(false);
        }).catch(console.error);
      }
      // Focus input
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Handle Ctrl+K and Esc logic
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const registeredPaths = new Set(resources.map(r => r.resource_value.toLowerCase()));

  const filteredApps = scannedApps.filter(app => {
    if (!query) return true;
    return app.display_name.toLowerCase().includes(query.toLowerCase()) || 
           app.exe_path.toLowerCase().includes(query.toLowerCase());
  });

  const sortedApps = [...filteredApps].sort((a, b) => {
    const aReg = registeredPaths.has(a.exe_path.toLowerCase());
    const bReg = registeredPaths.has(b.exe_path.toLowerCase());
    if (aReg !== bReg) return aReg ? 1 : -1;
    return a.display_name.localeCompare(b.display_name);
  });

  const handleRegister = async (app: ScannedResource) => {
    setRegistering(prev => ({ ...prev, [app.exe_path]: true }));
    try {
      await register({
        resource_value: app.exe_path,
        display_name: app.display_name,
        category: app.category,
        app_role: roles[app.exe_path] || 'work_tool',
        icon_data: app.icon_data || undefined,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setRegistering(prev => ({ ...prev, [app.exe_path]: false }));
    }
  };

  return (
    <div className="palette-overlay" onClick={onClose}>
      <div className="palette-container" onClick={e => e.stopPropagation()}>
        
        {/* Search Header */}
        <div className="palette-header">
          <Search style={{ color: 'var(--text-muted)' }} size={20} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search installed apps..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="palette-input"
          />
          <div className="palette-esc">Esc</div>
        </div>
        
        {/* Results */}
        <div className="palette-body">
          {isLoading ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
              Scanning your system for installed applications...
            </div>
          ) : sortedApps.length === 0 ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
              No apps found matching "{query}"
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {sortedApps.map((app) => {
                const isRegistered = registeredPaths.has(app.exe_path.toLowerCase());
                const isRegging = registering[app.exe_path];
                
                return (
                  <div 
                    key={app.exe_path} 
                    className={`palette-item ${isRegistered ? 'registered' : ''}`}
                  >
                    {app.icon_data ? (
                      <img src={`data:image/png;base64,${app.icon_data}`} alt="" style={{ width: '32px', height: '32px', borderRadius: '4px' }} />
                    ) : (
                      <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: 'var(--bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'var(--text-muted)' }}>EXE</div>
                    )}
                    
                    <div className="palette-item-info">
                      <div className="palette-item-name">{app.display_name}</div>
                      <div className="palette-item-category">{app.category}</div>
                    </div>
                    
                    {isRegistered ? (
                      <div className="palette-added-badge">
                        <Check size={16} /> Added
                      </div>
                    ) : (
                      <div className="palette-item-actions">
                        <button
                          onClick={() => handleRegister(app)}
                          disabled={isRegging}
                          className="palette-add-btn"
                        >
                          {isRegging ? '...' : <><Plus size={16} /> Add</>}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
