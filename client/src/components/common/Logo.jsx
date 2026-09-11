import React from 'react';
import { Tag, Leaf } from 'lucide-react';

const Logo = ({ showTagline = false, size = 'md', className = '' }) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className={`${iconSizes[size]} rounded-xl bg-[#2E7D32] flex items-center justify-center shadow-sm text-white relative shrink-0`}>
        <Tag className="w-[55%] h-[55%] stroke-[2.5]" />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#E8F5E9] flex items-center justify-center">
          <Leaf className="w-2.5 h-2.5 text-[#2E7D32]" />
        </span>
      </div>
      <div>
        <span className={`${textSizes[size]} font-bold tracking-tight text-[#1F2937] block leading-none`}>
          SmartShelf
        </span>
        {showTagline && (
          <span className="text-[11px] font-semibold text-[#2E7D32] block mt-0.5 tracking-wide">
            Save food. Save money.
          </span>
        )}
      </div>
    </div>
  );
};

export default Logo;
