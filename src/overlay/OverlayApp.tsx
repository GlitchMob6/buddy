import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export default function OverlayApp() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleBossKey = async () => {
    try {
      await invoke('use_boss_key', { reason: 'manual_exit' });
    } catch (e) {
      console.error('Failed to use boss key:', e);
    }
  };

  return (
    <div data-tauri-drag-region className="overlay-top-bar">
      <div className="left-section">
        <span className="logo">B</span>
        <div className="workspace-tabs">
          <div className="tab active">Workspace 1</div>
          <button className="add-tab">+</button>
        </div>
      </div>
      
      <div className="center-section">
        <span className="time">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      <div className="right-section">
        <button className="boss-key" onClick={handleBossKey} title="Exit Workspace">
          ✕ Exit
        </button>
      </div>
    </div>
  );
}
