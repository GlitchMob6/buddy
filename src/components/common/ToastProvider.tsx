// src/components/common/ToastProvider.tsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

export type ToastType = 'info' | 'success' | 'error';
export interface Toast { id: number; message: string; type: ToastType; }

interface ToastContextProps {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const useToast = (): ToastContextProps => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = React.useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId.current++;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {createPortal(
        <div className="toast-container" style={toastContainerStyle}>
          {toasts.map(t => (
            <div key={t.id} className={`toast toast-${t.type}`} style={toastStyle}>
              {t.message}
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

const toastContainerStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 'var(--space-6)',
  right: 'var(--space-6)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-2)',
  zIndex: 1000,
};

const toastStyle: React.CSSProperties = {
  padding: 'var(--space-2) var(--space-4)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--bg-elevated)',
  color: 'var(--text-primary)',
  boxShadow: 'var(--shadow-sm)',
  minWidth: '200px',
};
