import React from 'react';

/**
 * Reusable Ocean Blue Shimmer Skeleton Loader
 */
export const Skeleton = ({ className = '', count = 1 }) => {
  if (count === 1) {
    return <div className={`skeleton-ocean ${className}`} aria-hidden="true" />;
  }

  return (
    <div className="space-y-2.5" aria-hidden="true">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className={`skeleton-ocean ${className}`} />
      ))}
    </div>
  );
};

export const CardSkeleton = () => (
  <div className="glass-card p-5 rounded-[20px] space-y-3">
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>
    <Skeleton className="h-7 w-36" />
    <Skeleton className="h-3.5 w-20" />
  </div>
);

export default Skeleton;
