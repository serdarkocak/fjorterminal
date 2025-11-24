import React from 'react';

/**
 * Reusable Skeleton Loader Component
 * Shows animated placeholders while content is loading
 */

// Base skeleton element with shimmer effect
const SkeletonBase = ({ className = '', width, height, rounded = 'rounded' }) => (
  <div
    className={`bg-gray-800/50 animate-pulse ${rounded} ${className}`}
    style={{
      width: width || '100%',
      height: height || '1rem',
      background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 100%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s ease-in-out infinite'
    }}
  />
);

// Ticker Card Skeleton
export const TickerCardSkeleton = () => (
  <div className="bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-800/50 rounded-xl p-4 space-y-3">
    <div className="flex items-center justify-between">
      <SkeletonBase width="60px" height="16px" />
      <SkeletonBase width="50px" height="14px" rounded="rounded-full" />
    </div>
    <SkeletonBase width="80%" height="24px" />
    <div className="flex items-center justify-between">
      <SkeletonBase width="40px" height="12px" />
      <SkeletonBase width="60px" height="12px" />
    </div>
  </div>
);

// News Card Skeleton
export const NewsCardSkeleton = () => (
  <div className="bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-800/50 rounded-lg p-4 space-y-3">
    <div className="flex items-start gap-3">
      <SkeletonBase width="48px" height="48px" rounded="rounded-lg" />
      <div className="flex-1 space-y-2">
        <SkeletonBase width="100%" height="16px" />
        <SkeletonBase width="80%" height="16px" />
        <SkeletonBase width="60%" height="12px" />
      </div>
    </div>
    <div className="space-y-2">
      <SkeletonBase width="100%" height="12px" />
      <SkeletonBase width="90%" height="12px" />
      <SkeletonBase width="70%" height="12px" />
    </div>
    <div className="flex items-center justify-between">
      <SkeletonBase width="80px" height="12px" />
      <SkeletonBase width="60px" height="12px" />
    </div>
  </div>
);

// Table Row Skeleton (for Positions Table)
export const TableRowSkeleton = () => (
  <tr className="border-b border-gray-800/50">
    <td className="px-4 py-3"><SkeletonBase width="80px" height="14px" /></td>
    <td className="px-4 py-3"><SkeletonBase width="60px" height="14px" /></td>
    <td className="px-4 py-3"><SkeletonBase width="70px" height="14px" /></td>
    <td className="px-4 py-3"><SkeletonBase width="80px" height="14px" /></td>
    <td className="px-4 py-3"><SkeletonBase width="60px" height="14px" /></td>
    <td className="px-4 py-3"><SkeletonBase width="70px" height="14px" /></td>
    <td className="px-4 py-3"><SkeletonBase width="50px" height="24px" rounded="rounded-md" /></td>
  </tr>
);

// Balance Card Skeleton
export const BalanceCardSkeleton = () => (
  <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-gray-800/50 rounded-xl p-6 space-y-4">
    <div className="flex items-center justify-between">
      <SkeletonBase width="120px" height="18px" />
      <SkeletonBase width="70px" height="32px" rounded="rounded-lg" />
    </div>
    <div className="space-y-2">
      <SkeletonBase width="100px" height="12px" />
      <SkeletonBase width="60%" height="32px" />
    </div>
    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-800/50">
      <div className="space-y-2">
        <SkeletonBase width="80px" height="12px" />
        <SkeletonBase width="90%" height="20px" />
      </div>
      <div className="space-y-2">
        <SkeletonBase width="80px" height="12px" />
        <SkeletonBase width="90%" height="20px" />
      </div>
    </div>
  </div>
);

// Chart Skeleton
export const ChartSkeleton = () => (
  <div className="bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-800/50 rounded-xl p-6 space-y-4">
    <div className="flex items-center justify-between mb-4">
      <SkeletonBase width="150px" height="20px" />
      <SkeletonBase width="100px" height="32px" rounded="rounded-lg" />
    </div>
    <div className="relative h-[300px] flex items-end justify-between gap-2">
      {[...Array(12)].map((_, i) => (
        <SkeletonBase 
          key={i}
          width="100%"
          height={`${Math.random() * 80 + 20}%`}
          rounded="rounded-t"
        />
      ))}
    </div>
  </div>
);

// Generic Card Skeleton
export const CardSkeleton = ({ rows = 3 }) => (
  <div className="bg-[#1a1a1a]/90 backdrop-blur-md border border-gray-800/50 rounded-xl p-6 space-y-4">
    {[...Array(rows)].map((_, i) => (
      <SkeletonBase key={i} width={`${100 - (i * 15)}%`} height="16px" />
    ))}
  </div>
);

// Pulse Loading Indicator (for inline loading)
export const PulseLoader = ({ size = 'md', color = 'blue' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500'
  };

  return (
    <div className="flex items-center justify-center space-x-1">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-pulse`}
          style={{
            animationDelay: `${i * 150}ms`
          }}
        />
      ))}
    </div>
  );
};

// Spinner Loader
export const Spinner = ({ size = 'md', color = 'blue' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4'
  };

  const colorClasses = {
    blue: 'border-blue-500',
    green: 'border-green-500',
    red: 'border-red-500',
    yellow: 'border-yellow-500'
  };

  return (
    <div
      className={`${sizeClasses[size]} ${colorClasses[color]} border-t-transparent rounded-full animate-spin`}
    />
  );
};

// Full Page Loader
export const PageLoader = ({ message = 'Yükleniyor...' }) => (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="text-center space-y-4">
      <Spinner size="lg" color="blue" />
      <p className="text-white text-lg font-medium">{message}</p>
    </div>
  </div>
);

// Add shimmer animation to global CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `;
  document.head.appendChild(style);
}

export default {
  TickerCardSkeleton,
  NewsCardSkeleton,
  TableRowSkeleton,
  BalanceCardSkeleton,
  ChartSkeleton,
  CardSkeleton,
  PulseLoader,
  Spinner,
  PageLoader
};

