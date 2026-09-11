import React from 'react';

/**
 * SmartShelf Brand Logo
 * Accurately implements the green leaf + growth bar chart emblem
 * with two-tone "Smart" (dark forest green) and "Shelf" (fresh vibrant green) wordmark.
 */
const Logo = ({
  showTagline = false,
  size = 'md',
  className = '',
  variant = 'full', // 'full' | 'icon' | 'white'
  taglineText = 'Save food. Save money.'
}) => {
  // Dimensions for the icon
  const iconDimensions = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const textSizes = {
    xs: 'text-base',
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl'
  };

  const taglineSizes = {
    xs: 'text-[9px]',
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
    xl: 'text-base'
  };

  return (
    <div className={`inline-flex items-center gap-2.5 sm:gap-3 select-none ${className}`}>
      {/* SVG Leaf + Growth Bar Emblem */}
      <div className={`${iconDimensions[size] || iconDimensions.md} shrink-0 relative flex items-center justify-center`}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-xs"
        >
          {/* Main Leaf Body */}
          <path
            d="M22 68C22 45 42 22 76 18C78 48 64 74 38 74C32 74 26 71 22 68Z"
            fill="#15803D"
            stroke="#0D6832"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* Leaf Inner Veins (White Clean Branching Lines) */}
          <path
            d="M26 64C40 54 56 40 72 23"
            stroke="#FFFFFF"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <path
            d="M42 51C47 43 55 37 63 35"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M34 57C36 49 41 45 47 44"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M51 44C57 52 64 56 71 58"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M41 52C45 58 50 61 57 63"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Curved Stem extending down to base */}
          <path
            d="M26 64C22 72 17 80 14 88"
            stroke="#0D6832"
            strokeWidth="4.5"
            strokeLinecap="round"
          />

          {/* Growth Bar Chart Baseline */}
          <path
            d="M10 88H90"
            stroke="#0D6832"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* Growth Bars under/beside leaf */}
          {/* Bar 1 (Short) */}
          <rect
            x="48"
            y="72"
            width="8"
            height="16"
            rx="4"
            fill="#10B981"
          />
          {/* Bar 2 (Medium) */}
          <rect
            x="60"
            y="62"
            width="8"
            height="26"
            rx="4"
            fill="#059669"
          />
          {/* Bar 3 (Tall) */}
          <rect
            x="72"
            y="52"
            width="8"
            height="36"
            rx="4"
            fill="#047857"
          />
        </svg>
      </div>

      {/* Typography Wordmark */}
      {variant !== 'icon' && (
        <div className="flex flex-col justify-center leading-tight">
          <div className={`${textSizes[size] || textSizes.md} font-black tracking-tight flex items-baseline font-sans`}>
            <span className="text-[#0A4D2E]">Smart</span>
            <span className="text-[#16A34A]">Shelf</span>
          </div>

          {showTagline && (
            <span className={`${taglineSizes[size] || taglineSizes.md} font-bold text-[#0D6832] tracking-wide mt-0.5 opacity-90`}>
              {taglineText}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;
