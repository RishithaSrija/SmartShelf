import React, { useState } from 'react';
import { Store, ShoppingBag, Coffee, Utensils } from 'lucide-react';

const STORE_TYPE_ICONS = {
  SUPERMARKET: ShoppingBag,
  GROCERY: Store,
  BAKERY: Coffee,
  RESTAURANT: Utensils,
  OTHER: Store
};

/**
 * Optimizes Cloudinary store image URLs
 */
const optimizeImageUrl = (url, width = 800) => {
  if (!url || typeof url !== 'string') return '';
  if (url.includes('res.cloudinary.com') && url.includes('/upload/') && !url.includes('/f_auto')) {
    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_fill/`);
  }
  return url;
};

/**
 * StoreImage component with lazy loading, skeleton state, and branded fallback.
 */
function StoreImage({
  src,
  alt = 'Store Banner',
  businessType = 'GROCERY',
  className = '',
  aspectRatio = 'banner', // 'banner' (16/9), 'wide' (4/3), 'square', 'none'
  width = 800
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const cleanType = (businessType || 'GROCERY').toUpperCase();
  const Icon = STORE_TYPE_ICONS[cleanType] || Store;

  const aspectClass = {
    banner: 'aspect-[16/9]',
    wide: 'aspect-[4/3]',
    square: 'aspect-square',
    none: ''
  }[aspectRatio] || 'aspect-[16/9]';

  const optimizedSrc = optimizeImageUrl(src, width);

  if (!optimizedSrc || hasError) {
    return (
      <div
        className={`relative w-full ${aspectClass} bg-gradient-to-br from-emerald-600 to-teal-800 flex flex-col items-center justify-center p-6 text-white overflow-hidden select-none ${className}`}
        role="img"
        aria-label={alt}
      >
        <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-xs border border-white/20 flex items-center justify-center mb-2 shadow-sm">
          <Icon className="w-7 h-7 text-white" />
        </div>
        <span className="text-sm font-extrabold tracking-wide text-white text-center max-w-[90%] truncate">
          {alt}
        </span>
        <span className="text-[10px] font-semibold text-emerald-200 uppercase tracking-wider mt-0.5">
          {cleanType}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative w-full ${aspectClass} overflow-hidden bg-slate-100 select-none ${className}`}>
      {!imageLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse flex items-center justify-center">
          <Icon className="w-10 h-10 text-slate-300 animate-pulse" />
        </div>
      )}
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

export default StoreImage;
