import React from 'react';
import './AnimatedLogo.css';

const AnimatedLogo = ({ size = 150 }) => {
  return (
    <div className="animated-logo-container">
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        className="animated-logo-svg"
      >
        <defs>
          {/* Glow filter for logo */}
          <filter id="logoGlow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* Soft shadow */}
          <filter id="softShadow">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
            <feOffset dx="0" dy="3" result="offsetblur"/>
            <feFlood floodColor="#000000" floodOpacity="0.2"/>
            <feComposite in2="offsetblur" operator="in"/>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* Radial gradient for decorative circles */}
          <radialGradient id="circleGradient1" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#5b21b6" stopOpacity="0.1" />
          </radialGradient>

          <radialGradient id="circleGradient2" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.1" />
          </radialGradient>
        </defs>

        {/* Background decorative circle */}
        <circle
          cx="100"
          cy="100"
          r="90"
          fill="url(#circleGradient1)"
          className="bg-circle-outer"
        />

        {/* Rotating ring */}
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="none"
          stroke="url(#circleGradient2)"
          strokeWidth="2"
          strokeDasharray="8 4"
          className="decorative-ring"
          opacity="0.5"
        />

        {/* Inner decorative circle */}
        <circle
          cx="100"
          cy="100"
          r="70"
          fill="url(#circleGradient1)"
          className="bg-circle-inner"
        />

        {/* Sparkles around the logo */}
        <g className="sparkles-group">
          <circle cx="40" cy="50" r="3" fill="#fbbf24" className="sparkle sparkle-1" opacity="0.8" />
          <circle cx="160" cy="60" r="2.5" fill="#7c3aed" className="sparkle sparkle-2" opacity="0.8" />
          <circle cx="50" cy="150" r="2" fill="#fbbf24" className="sparkle sparkle-3" opacity="0.8" />
          <circle cx="150" cy="140" r="3" fill="#7c3aed" className="sparkle sparkle-4" opacity="0.8" />
          <circle cx="100" cy="30" r="2" fill="#fbbf24" className="sparkle sparkle-5" opacity="0.8" />
          <circle cx="170" cy="100" r="2.5" fill="#7c3aed" className="sparkle sparkle-6" opacity="0.8" />
        </g>

        {/* Logo image centered */}
        <g className="logo-image-group" filter="url(#logoGlow)">
          <image
            href="/assets/img/logo.png"
            x="25"
            y="25"
            width="150"
            height="150"
            className="logo-image"
            preserveAspectRatio="xMidYMid meet"
          />
        </g>

        {/* Subtle pulse circle overlay */}
        <circle
          cx="100"
          cy="100"
          r="75"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          className="pulse-ring"
          opacity="0"
        />
      </svg>
    </div>
  );
};

export default AnimatedLogo;
