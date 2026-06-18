import { X } from 'lucide-react';

interface ChatbotPanelProps {
  onClose: () => void;
}

export default function ChatbotPanel({ onClose }: ChatbotPanelProps) {
  return (
    <div className="chatbot-panel">
      <div className="chatbot-header">
        <span>Buddy AI</span>
        <button className="icon-btn" onClick={onClose} aria-label="Close Chat">
          <X size={18} />
        </button>
      </div>
      <div className="chatbot-body">
        <div className="chat-msg bot">
          Hey there! I'm here to help you stay focused. Need to break down a task?
        </div>
        <div className="chat-msg user">
          Not right now, just focusing.
        </div>
        <div className="chat-msg bot">
          Sounds good! I'll be here if you need me.
        </div>
      </div>
      <div className="chatbot-footer">
        <input 
          type="text" 
          className="chatbot-input" 
          placeholder="Ask Buddy..." 
          disabled 
        />
      </div>
    </div>
  );
}
