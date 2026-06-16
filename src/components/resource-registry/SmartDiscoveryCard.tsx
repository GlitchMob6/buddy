import { useState, useEffect } from 'react';
import type { DiscoveredApp } from '../../types';
import { useResources } from '../../hooks/useResources';
import { Sparkles, Plus, Check } from 'lucide-react';

interface SmartDiscoveryCardProps {
  onOpenPalette: () => void;
}

export function SmartDiscoveryCard({ onOpenPalette }: SmartDiscoveryCardProps) {
  const { discoverApps, registerBatch } = useResources();
  const [apps, setApps] = useState<(DiscoveredApp & { selected: boolean })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const discovered = await discoverApps();
      setApps(
        discovered.map((app) => ({
          ...app,
          selected: app.suggested_role !== 'on_demand', // pre-select if not on_demand
        }))
      );
      setIsLoading(false);
    }
    load();
  }, [discoverApps]);

  const toggleSelect = (exePath: string) => {
    setApps((prev) =>
      prev.map((app) => (app.exe_path === exePath ? { ...app, selected: !app.selected } : app))
    );
  };


  const handleRegisterSelected = async () => {
    const selectedApps = apps.filter((a) => a.selected);
    if (selectedApps.length === 0) return;

    setIsRegistering(true);
    try {
      const payloads = selectedApps.map((app) => ({
        resource_value: app.exe_path,
        display_name: app.display_name,
        category: app.category,
        app_role: app.suggested_role,
        icon_data: app.icon_data || undefined,
      }));
      await registerBatch(payloads);
      
      // Update state to remove registered apps from view
      setApps(prev => prev.filter(a => !a.selected));
    } catch (e) {
      console.error(e);
    } finally {
      setIsRegistering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="discovery-loading">
        <Sparkles size={32} />
        <p>Scanning system for common apps...</p>
      </div>
    );
  }

  if (apps.length === 0) {
    return null; // Don't show anything if nothing to discover
  }

  const selectedCount = apps.filter((a) => a.selected).length;

  return (
    <div className="discovery-card">
      <div className="discovery-header">
        <Sparkles size={20} style={{ color: 'var(--accent)' }} />
        <span>Buddy found these on your system</span>
      </div>
      
      <div className="discovery-list">
        {apps.map((app) => (
          <div key={app.exe_path} className="discovery-item">
            <div className="discovery-item-left">
              <button
                onClick={() => toggleSelect(app.exe_path)}
                className={`discovery-checkbox ${app.selected ? 'checked' : ''}`}
              >
                {app.selected && <Check size={14} />}
              </button>
              
              {app.icon_data ? (
                <img src={`data:image/png;base64,${app.icon_data}`} alt="" style={{ width: '32px', height: '32px', borderRadius: '4px' }} />
              ) : (
                <div style={{ width: '32px', height: '32px', borderRadius: '4px', background: 'var(--bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'var(--text-muted)' }}>EXE</div>
              )}
              
              <div className="discovery-item-info">
                <div className="discovery-item-title">
                  {app.display_name}
                  <span className="discovery-item-reason">
                    {app.discovery_reason}
                  </span>
                </div>
                <div className="discovery-item-category">{app.category}</div>
              </div>
            </div>
            
            <div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="discovery-footer">
        <button
          onClick={handleRegisterSelected}
          disabled={selectedCount === 0 || isRegistering}
          className="btn btn-primary"
        >
          {isRegistering ? 'Registering...' : `Register Selected (${selectedCount})`}
        </button>
        
        <button
          onClick={onOpenPalette}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={16} />
          Add More Apps
        </button>
      </div>
    </div>
  );
}
