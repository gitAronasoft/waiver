import React from 'react';
import AnimatedLogo from './AnimatedLogo';
import './LoadingOverlay.css';

const LoadingOverlay = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className={`loading-overlay ${isVisible ? 'visible' : ''}`}>
      <div className="loading-content">
        <AnimatedLogo size={180} />
        <div className="loading-text">Loading...</div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
