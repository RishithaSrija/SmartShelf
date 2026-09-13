import React, { useState } from 'react';
import {
  Sparkles,
  Flame,
  Tag,
  ShoppingBag,
  Milk,
  Apple,
  Carrot,
  Coffee,
  Package
} from 'lucide-react';

// Category color palettes and icons for elegant SVG fallback placeholders
const CATEGORY_FALLBACKS = {
  DAIRY: {
    bg: 'from-sky-50 via-cyan-50 to-blue-100',
    iconColor: 'text-sky-600',
    badgeBg: 'bg-sky-100/90 text-sky-800 border-sky-200',
    icon: Milk,
    label: 'Dairy & Eggs'
  },
  BAKERY: {
    bg: 'from-amber-50 via-orange-50 to-amber-100',
    iconColor: 'text-amber-600',
    badgeBg: 'bg-amber-100/90 text-amber-800 border-amber-200',
    icon: Flame,
    label: 'Bakery'
  },
  FRUITS: {
    bg: 'from-rose-50 via-orange-50 to-rose-100',
    iconColor: 'text-rose-600',
    badgeBg: 'bg-rose-100/90 text-rose-800 border-rose-200',
    icon: Apple,
    label: 'Fresh Fruits'
  },
  VEGETABLES: {
    bg: 'from-emerald-50 via-green-50 to-emerald-100',
    iconColor: 'text-emerald-600',
    badgeBg: 'bg-emerald-100/90 text-emerald-800 border-emerald-200',
    icon: Carrot,
    label: 'Vegetables'
  },
  BEVERAGES: {
    bg: 'from-teal-50 via-cyan-50 to-teal-100',
    iconColor: 'text-teal-600',
    badgeBg: 'bg-teal-100/90 text-teal-800 border-teal-200',
    icon: Coffee,
    label: 'Beverages'
  },
  SNACKS: {
    bg: 'from-purple-50 via-pink-50 to-purple-100',
    iconColor: 'text-purple-600',
    badgeBg: 'bg-purple-100/90 text-purple-800 border-purple-200',
    icon: Sparkles,
    label: 'Snacks'
  },
  FROZEN: {
    bg: 'from-indigo-50 via-blue-50 to-indigo-100',
    iconColor: 'text-indigo-600',
    badgeBg: 'bg-indigo-100/90 text-indigo-800 border-indigo-200',
    icon: Package,
    label: 'Frozen'
  },
  READY_TO_EAT: {
    bg: 'from-amber-50 via-yellow-50 to-orange-100',
    iconColor: 'text-amber-700',
    badgeBg: 'bg-amber-100/90 text-amber-800 border-amber-200',
    icon: Tag,
    label: 'Ready to Eat'
  },
  OTHER: {
    bg: 'from-emerald-50 via-slate-50 to-emerald-100',
    iconColor: 'text-[#15803D]',
    badgeBg: 'bg-emerald-100/90 text-[#0A4D2E] border-emerald-200',
    icon: ShoppingBag,
    label: 'Grocery'
  }
};

/**
 * Optimizes Cloudinary image URLs with automatic format and quality flags
 */
const optimizeImageUrl = (url, width = 500) => {
  if (!url || typeof url !== 'string') return '';
  if (url.includes('res.cloudinary.com') && url.includes('/upload/') && !url.includes('/f_auto')) {
    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_fill/`);
  }
  return url;
};

/**
 * ProductImage component with lazy loading, skeleton state, Cloudinary optimization,
 * and robust SmartShelf category-themed fallback handling.
 */
function ProductImage({
  src,
  alt = 'Product Image',
  category = 'OTHER',
  className = '',
  aspectRatio = 'square', // 'square', 'video', 'wide', 'banner', 'none'
  showCategoryBadge = false,
  width = 500
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const cleanCategory = (category || 'OTHER').toUpperCase();
  const theme = CATEGORY_FALLBACKS[cleanCategory] || CATEGORY_FALLBACKS.OTHER;
  const FallbackIcon = theme.icon;

  const aspectClass = {
    square: 'aspect-square',
    video: 'aspect-video',
    wide: 'aspect-[4/3]',
    banner: 'aspect-[16/9]',
    none: ''
  }[aspectRatio] || 'aspect-square';

  const optimizedSrc = optimizeImageUrl(src, width);

  // If no source or error occurred, show the professional category-themed placeholder
  if (!optimizedSrc || hasError) {
    return (
      <div
        className={`relative w-full ${aspectClass} bg-gradient-to-br ${theme.bg} flex flex-col items-center justify-center p-4 overflow-hidden select-none ${className}`}
        role="img"
        aria-label={alt}
      >
        <div className="w-12 h-12 rounded-2xl bg-white/85 shadow-xs border border-white/60 flex items-center justify-center mb-1.5 transition-transform hover:scale-105">
          <FallbackIcon className={`w-6 h-6 ${theme.iconColor}`} />
        </div>
        <span className="text-[11px] font-bold text-slate-600 text-center max-w-[90%] truncate">
          {alt || theme.label}
        </span>
        {showCategoryBadge && (
          <span className={`mt-1 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border shadow-2xs ${theme.badgeBg}`}>
            {theme.label}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`relative w-full ${aspectClass} overflow-hidden bg-slate-100 select-none ${className}`}>
      {/* Loading Skeleton */}
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse flex items-center justify-center">
          <FallbackIcon className="w-8 h-8 text-slate-300 animate-pulse" />
        </div>
      )}

      {/* Main Image */}
      <img
        src={optimizedSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setImageLoaded(true)}
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover transition-all duration-300 ${
          imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      />
    </div>
  );
}

export default ProductImage;
