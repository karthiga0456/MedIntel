import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, Warning, Info } from '@phosphor-icons/react';

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

function ToastItem({ toast, onRemove }) {
  const [exiting, setExiting] = React.useState(false);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => onRemove(toast.id), 220);
  };

  React.useEffect(() => {
    const timer = setTimeout(handleClose, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, []);

  const icons = {
    success: <CheckCircle size={18} weight="fill" />,
    error:   <XCircle    size={18} weight="fill" />,
    warning: <Warning    size={18} weight="fill" />,
    info:    <Info       size={18} weight="fill" />,
  };

  return (
    <div className={'toast toast-' + toast.type + (exiting ? ' exiting' : '')} role="alert">
      <div className="toast-icon">{icons[toast.type] || icons.info}</div>
      <div className="toast-body">
        {toast.title && <div className="toast-title">{toast.title}</div>}
        {toast.message && <div className="toast-message">{toast.message}</div>}
      </div>
      <button className="toast-close" onClick={handleClose} aria-label="Close">&times;</button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, title, message, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (message, title = 'Success') => addToast({ type: 'success', title, message }),
    error:   (message, title = 'Error')   => addToast({ type: 'error',   title, message }),
    warning: (message, title = 'Warning') => addToast({ type: 'warning', title, message }),
    info:    (message, title = 'Info')    => addToast({ type: 'info',    title, message }),
    show:    (opts) => addToast(opts),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
