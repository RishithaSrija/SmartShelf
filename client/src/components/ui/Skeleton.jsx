import React from 'react';

const Skeleton = ({ className = '', height = 'h-4', width = 'w-full', rounded = 'rounded-md' }) => {
  return (
    <div
      className={`bg-slate-200 animate-pulse ${height} ${width} ${rounded} ${className}`}
    />
  );
};

export const CardSkeleton = () => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
    <Skeleton height="h-6" width="w-1/3" />
    <Skeleton height="h-4" width="w-full" />
    <Skeleton height="h-4" width="w-2/3" />
  </div>
);

export default Skeleton;
