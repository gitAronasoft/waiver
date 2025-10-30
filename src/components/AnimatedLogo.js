import React from 'react';
import './AnimatedLogo.css';

const AnimatedLogo = ({ size = 200 }) => {
  return (
    <div className="simple-logo-container">
      <img 
        src="/assets/img/logo.png" 
        alt="Skate & Play" 
        className="simple-logo"
        style={{ width: size, height: 'auto' }}
      />
    </div>
  );
};

export default AnimatedLogo;
