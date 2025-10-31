import React from 'react';
import './AnimatedLogo.css';

const AnimatedLogo = ({ size = 150 }) => {
  return (
    <div className="animated-logo-container">
      <img
        src="/assets/img/logo.png"
        alt="Skate & Play Logo"
        className="simple-logo"
        style={{ width: size, height: size }}
      />
    </div>
  );
};

export default AnimatedLogo;
