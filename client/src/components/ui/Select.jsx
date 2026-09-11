import React, { forwardRef } from 'react';

const Select = forwardRef(
  (
    {
      label,
      options = [],
      error,
      helperText,
      icon: Icon,
      className = '',
      required = false,
      disabled = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-bold uppercase tracking-wider text-[#1F2937] mb-1.5">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
        )}
        <div className="relative rounded-xl shadow-xs">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <select
            ref={ref}
            disabled={disabled}
            className={`block w-full text-sm text-[#1F2937] bg-white rounded-xl border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#2E7D32] focus:border-transparent disabled:bg-slate-50 ${
              Icon ? 'pl-10' : 'pl-3.5'
            } pr-8 py-2.5 ${
              error ? 'border-rose-300 focus:ring-rose-500' : 'border-[#E5E7EB]'
            } ${className}`}
            {...props}
          >
            {options.length > 0
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
        </div>
        {error ? (
          <p className="mt-1.5 text-xs text-rose-600 font-medium">{error}</p>
        ) : helperText ? (
          <p className="mt-1.5 text-xs text-[#6B7280]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
