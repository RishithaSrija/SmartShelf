import React from 'react';
import logoImage from '../../assets/smartshelf_logo.png';

/**
 * SmartShelf Brand Logo
 * Accurately displays the SmartShelf leaf + bar-chart emblem and two-tone wordmark
 * exactly matching the official brand reference.
 */
const Logo = ({
  showTagline = false,
  size = 'md',
  className = '',
  taglineText = 'Save food. Save money.'
}) => {
  // Height presets for the horizontal logo
  const sizeClasses = {
    xs: 'h-6',
    sm: 'h-8',
    md: 'h-10 sm:h-11',
    lg: 'h-13 sm:h-14',
    xl: 'h-16 sm:h-18'
  };

  const taglineSizes = {
    xs: 'text-[9px]',
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
    xl: 'text-base'
  };

  return (
    <div className={`inline-flex flex-col select-none ${className}`}>
      <div className="flex items-center">
        <img
          src={logoImage}
          alt="SmartShelf Logo"
          className={`${sizeClasses[size] || sizeClasses.md} w-auto object-contain shrink-0`}
          loading="eager"
        />
      </div>

      {showTagline && (
        <span className={`${taglineSizes[size] || taglineSizes.md} font-bold text-[#146B38] tracking-wide mt-0.5 opacity-90`}>
          {taglineText}
        </span>
      )}
    </div>
  );
};

export default Logo;
