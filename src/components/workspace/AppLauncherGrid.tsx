import { useResources } from '../../hooks/useResources';
import { launchResource, enterWorkspace } from '../../lib/ipc';

export default function AppLauncherGrid() {
  const { resources, loading } = useResources();

  // For the MVP workspace, we show all registered resources as "allowed".
  const apps = resources.filter(r => r.resource_type === 'APPLICATION');

  const handleLaunch = async (id: string) => {
    try {
      await launchResource(id);
      await enterWorkspace();
    } catch (e) {
      console.error('Failed to launch resource', e);
    }
  };

  if (loading && apps.length === 0) {
    return (
      <div className="launcher-container" style={{ justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading resources...</div>
      </div>
    );
  }

  return (
    <div className="launcher-container">
      <div className="launcher-title">Workspace Applications</div>
      <div className="launcher-grid">
        {apps.map(app => (
          <div 
            key={app.id} 
            className="app-icon-wrapper"
            onClick={() => handleLaunch(app.id)}
            title={`Launch ${app.display_name || app.resource_value}`}
          >
            {app.icon_data ? (
              <img 
                src={`data:image/png;base64,${app.icon_data}`} 
                alt={app.display_name ?? undefined} 
                className="app-icon" 
              />
            ) : (
              <div className="app-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 24, color: 'var(--text-muted)' }}>
                  {app.display_name?.charAt(0).toUpperCase() || '?'}
                </span>
              </div>
            )}
            <span className="app-name">{app.display_name || 'App'}</span>
          </div>
        ))}
        {apps.length === 0 && !loading && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)' }}>
            No applications registered. Add some in the Resources tab.
          </div>
        )}
      </div>
    </div>
  );
}
