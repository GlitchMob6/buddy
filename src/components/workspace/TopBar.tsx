import { useState, useEffect } from 'react';
import { Disc, MessageSquare, LogOut } from 'lucide-react';
import { exitWorkspace } from '../../lib/ipc';
import { useSession } from '../../hooks/useSession';

interface TopBarProps {
  onToggleChat: () => void;
  activeTab: number;
  setActiveTab: (index: number) => void;
  onExit?: () => void;
}

export default function TopBar({ onToggleChat, activeTab, setActiveTab, onExit }: TopBarProps) {
  const { activeSession, abandon } = useSession();
  const [time, setTime] = useState(new Date());
  const [workspaces, setWorkspaces] = useState([
    'Workspace 1', 'Workspace 2', 'Workspace 3', 'Workspace 4'
  ]);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAddWorkspace = () => {
    setWorkspaces([...workspaces, `Workspace ${workspaces.length + 1}`]);
  };

  const handleToggleMusic = () => {
    setIsPlaying(!isPlaying);
  };

  const handleExit = async () => {
    if (activeSession) {
      await abandon(activeSession.id);
    }
    await exitWorkspace();
    if (onExit) onExit();
  };

  return (
    <div className="top-bar">
      <div className="top-bar-left">
        {workspaces.map((ws, idx) => (
          <div 
            key={idx} 
            className={`workspace-tab ${activeTab === idx ? 'active' : ''}`}
            onClick={() => setActiveTab(idx)}
          >
            {ws}
          </div>
        ))}
        <div className="workspace-tab add-btn" onClick={handleAddWorkspace} title="Add Workspace">
          +
        </div>
      </div>

      <div className="top-bar-center">
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>

      <div className="top-bar-right">
        <button className="icon-btn exit-btn" onClick={handleExit} title="Exit Workspace" style={{ marginRight: '8px' }}>
          <LogOut size={20} />
        </button>
        <button className="icon-btn" onClick={onToggleChat} title="Toggle Chatbot">
          <MessageSquare size={20} />
        </button>
        <button 
          className={`icon-btn music-disc ${isPlaying ? 'playing' : ''}`} 
          onClick={handleToggleMusic}
          title={isPlaying ? "Pause Music" : "Play Music"}
        >
          <Disc size={24} />
        </button>
      </div>
    </div>
  );
}
