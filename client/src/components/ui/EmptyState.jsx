import React from 'react';

const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionButton,
  className = ''
}) => {
  return (
    <div className={`text-center py-12 px-6 bg-white rounded-2xl border border-slate-200 shadow-xs ${className}`}>
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center mx-auto mb-4">
          <Icon className="w-7 h-7 stroke-[2]" />
        </div>
      )}
      <h3 className="text-lg font-bold text-[#1F2937] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[#6B7280] max-w-md mx-auto mb-6 leading-relaxed">
          {description}
        </p>
      )}
      {actionButton && <div>{actionButton}</div>}
    </div>
  );
};

export default EmptyState;
