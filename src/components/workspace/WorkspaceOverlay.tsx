import { useState } from 'react';
import './WorkspaceOverlay.css';
import TopBar from './TopBar';
import AppLauncherGrid from './AppLauncherGrid';
import ChatbotPanel from './ChatbotPanel';

export default function WorkspaceOverlay() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="workspace-overlay">
      <TopBar 
        onToggleChat={() => setIsChatOpen(!isChatOpen)} 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      <AppLauncherGrid />
      {isChatOpen && <ChatbotPanel onClose={() => setIsChatOpen(false)} />}
    </div>
  );
}
