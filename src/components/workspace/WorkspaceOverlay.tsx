import { useState } from 'react';
import './WorkspaceOverlay.css';
import TopBar from './TopBar';
import AppLauncherGrid from './AppLauncherGrid';
import ChatbotPanel from './ChatbotPanel';

interface Props {
  onExit?: () => void;
}

export default function WorkspaceOverlay({ onExit }: Props = {}) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="workspace-overlay">
      <TopBar 
        onToggleChat={() => setIsChatOpen(!isChatOpen)} 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onExit={onExit}
      />
      <AppLauncherGrid />
      {isChatOpen && <ChatbotPanel onClose={() => setIsChatOpen(false)} />}
    </div>
  );
}
