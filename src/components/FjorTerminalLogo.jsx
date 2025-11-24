import React from 'react';

const FjorTerminalLogo = ({ size = 24, className = "", showText = true }) => {
  return (
    <div className={`flex items-center space-x-2 group cursor-pointer ${className}`}>
      {/* Icon */}
      <div className="relative group" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-lg"
        >
          {/* Circular background with subtle gradient */}
          <defs>
            <linearGradient id="circleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FCD34D" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.7" />
            </linearGradient>
          </defs>
          
          <circle
            cx="12"
            cy="12"
            r="11"
            stroke="url(#circleGradient)"
            strokeWidth="2"
            fill="rgba(252, 211, 77, 0.1)"
          />
          
          {/* Bar chart bars with gradient */}
          <rect x="6" y="14" width="2" height="3" fill="#FCD34D" rx="0.5" />
          <rect x="9" y="12" width="2" height="5" fill="#FCD34D" rx="0.5" />
          <rect x="12" y="10" width="2" height="7" fill="#FCD34D" rx="0.5" />
          
          {/* Enhanced arrow with gradient */}
          <path
            d="M7 15 L11 11 L15 7"
            stroke="#FCD34D"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          
          {/* Arrow head */}
          <path
            d="M13 7 L17 7 L17 11"
            stroke="#FCD34D"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          
          {/* Subtle glow effect */}
          <circle
            cx="12"
            cy="12"
            r="11"
            stroke="#FCD34D"
            strokeWidth="1"
            fill="none"
            opacity="0.3"
          />
        </svg>
      </div>
      
      {/* Text */}
      {showText && (
        <span className="font-semibold text-white text-[13px] md:text-sm tracking-wide transition-colors duration-300 group-hover:text-yellow-400">
          FjorTerminal
        </span>
      )}
    </div>
  );
};

export default FjorTerminalLogo;
