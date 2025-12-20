import React from 'react';

const WindowControls: React.FC = () => {
  const handleMinimize = () => {
    window.electronAPI?.minimizeWindow();
  };

  const handleMaximize = () => {
    window.electronAPI?.maximizeWindow();
  };

  const handleClose = () => {
    window.electronAPI?.closeWindow();
  };

  return (
    <div className="window-controls">
      <button 
        className="window-control-btn"
        onClick={handleMinimize}
        title="Küçült"
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path d="M0,5 L10,5" stroke="currentColor" strokeWidth="1"/>
        </svg>
      </button>
      
      <button 
        className="window-control-btn"
        onClick={handleMaximize}
        title="Büyüt/Küçült"
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path d="M0,0 L10,0 L10,10 L0,10 Z" fill="none" stroke="currentColor" strokeWidth="1"/>
        </svg>
      </button>
      
      <button 
        className="window-control-btn close"
        onClick={handleClose}
        title="Kapat"
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path d="M0,0 L10,10 M0,10 L10,0" stroke="currentColor" strokeWidth="1"/>
        </svg>
      </button>
    </div>
  );
};

export default WindowControls;