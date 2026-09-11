import React, { forwardRef } from 'react';

const Input = forwardRef(
  (
    {
      label,
      error,
      helperText,
      icon: Icon,
      prefix,
      rightElement,
      type = 'text',
      className = '',
      required = false,
      disabled = false,
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
        <div className="relative rounded-xl shadow-xs flex items-stretch">
          {prefix ? (
            <div className="flex items-center gap-1.5 px-3 bg-slate-50 border border-r-0 border-[#E5E7EB] rounded-l-xl text-xs font-bold text-[#0A4D2E] select-none shrink-0">
              {Icon && <Icon className="w-4 h-4 text-[#16A34A]" />}
              <span>{prefix}</span>
            </div>
          ) : Icon ? (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Icon className="w-4 h-4" />
            </div>
          ) : null}

          <input
            ref={ref}
            type={type}
            disabled={disabled}
            className={`block w-full text-sm text-[#1F2937] bg-white border transition-all duration-150 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400 ${
              prefix
                ? 'rounded-r-xl rounded-l-none pl-3'
                : Icon
                ? 'rounded-xl pl-10'
                : 'rounded-xl pl-3.5'
            } ${rightElement ? 'pr-10' : 'pr-3.5'} ${
              error ? 'border-rose-300 ring-1 ring-rose-300 focus:ring-rose-500' : 'border-[#E5E7EB]'
            } py-2.5 ${className}`}
            {...props}
          />

          {rightElement && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {rightElement}
            </div>
          )}
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

Input.displayName = 'Input';

export default Input;
