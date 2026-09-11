import React from 'react';

const badgeVariants = {
  AVAILABLE: 'bg-[#E8F5E9] text-[#2E7D32] border border-emerald-200',
  LOW_STOCK: 'bg-amber-100 text-amber-800 border border-amber-200',
  EXPIRING_SOON: 'bg-orange-100 text-orange-800 border border-orange-200',
  FLASH_SALE: 'bg-[#2E7D32] text-white font-bold shadow-xs',
  EXPIRED: 'bg-rose-100 text-rose-800 border border-rose-200',
  SOLD_OUT: 'bg-slate-100 text-slate-600 border border-slate-200',
  info: 'bg-blue-50 text-blue-700 border border-blue-200',
  neutral: 'bg-slate-100 text-slate-700 border border-slate-200'
};

const Badge = ({ variant = 'AVAILABLE', children, size = 'sm', className = '' }) => {
  const sizeStyles = {
    xs: 'text-[10px] px-2 py-0.5 font-bold tracking-wider',
    sm: 'text-xs px-2.5 py-1 font-semibold',
    md: 'text-sm px-3 py-1.5 font-semibold'
  };

  const style = badgeVariants[variant] || badgeVariants.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full uppercase leading-none ${sizeStyles[size]} ${style} ${className}`}
    >
      {children || variant.replace('_', ' ')}
    </span>
  );
};

export default Badge;
