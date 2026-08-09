import React, { useState, useEffect } from 'react';
import './GlobalToast.css';

export default function GlobalToast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    let toastIdCounter = 0;
    
    // Override native window.alert
    window.alert = (message) => {
      const id = toastIdCounter++;
      
      setToasts(prev => [...prev, { id, message, exiting: false }]);
      
      // Auto-remove after 4 seconds
      setTimeout(() => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
        
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id));
        }, 300); // Wait for exit animation
      }, 4000);
    };
    
    return () => {
      // Optional cleanup if component unmounts
      delete window.alert;
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="global-toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`custom-toast ${toast.exiting ? 'exiting' : ''}`}>
          <div className="toast-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>
          </div>
          <div className="toast-message">
            {toast.message}
          </div>
        </div>
      ))}
    </div>
  );
}
