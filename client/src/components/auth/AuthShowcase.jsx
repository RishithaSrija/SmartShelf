import React, { useState, useEffect } from 'react';
import { Sparkles, ShoppingBasket, TrendingDown, Clock, ShieldCheck, Zap } from 'lucide-react';
import Logo from '../common/Logo';

const valuePropositions = [
  {
    icon: ShoppingBasket,
    title: 'Find fresh products near you.',
    description: 'Connect with local grocery stores, bakeries, and markets offering quality perishables daily.',
    tag: 'Hyper-Local'
  },
  {
    icon: Zap,
    title: 'Discover local Flash Sales.',
    description: 'Unlock exclusive markdown deals on high-demand groceries before they reach their expiry date.',
    tag: 'Up to 60% OFF'
  },
  {
    icon: Clock,
    title: 'Reserve before stock runs out.',
    description: 'Instant 30-minute reservation holds guarantee your items are ready when you arrive at the store.',
    tag: 'Real-time Hold'
  },
  {
    icon: TrendingDown,
    title: 'Smarter inventory. Better pricing.',
    description: 'Automated dynamic pricing recalculates discounts progressively as expiry dates approach.',
    tag: 'Automated Pricing'
  },
  {
    icon: ShieldCheck,
    title: 'Reduce waste. Save more.',
    description: 'Every reserved deal diverts fresh food from landfills while maximizing recovery savings.',
    tag: 'Zero Waste'
  },
  {
    icon: Sparkles,
    title: 'Track products and expiry intelligently.',
    description: 'Machine learning demand forecasting helps store owners predict inventory turnover accurately.',
    tag: 'ML Forecasting'
  }
];

const AuthShowcase = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % valuePropositions.length);
        setIsTransitioning(false);
      }, 350);
    }, 4500);

    return () => clearInterval(timer);
  }, []);

  const current = valuePropositions[currentIndex];
  const IconComponent = current.icon;

  return (
    <div className="relative h-full w-full bg-gradient-to-br from-[#064E3B] via-[#0A4D2E] to-[#042F2E] text-white p-8 lg:p-12 flex flex-col justify-between overflow-hidden">
      {/* Decorative Glow Orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#10B981]/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#15803D]/25 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* Top Section: Header & Branding */}
      <div className="relative z-10">
        <div className="bg-white/10 backdrop-blur-md inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/20 mb-6 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#34D399] animate-pulse" />
          <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider">
            Expiry-Aware Retail Platform
          </span>
        </div>
        <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
          Smarter grocery savings. <br />
          <span className="text-[#34D399]">Zero unnecessary waste.</span>
        </h2>
      </div>

      {/* Center: Interactive Grocery Card Graphic */}
      <div className="relative z-10 my-8">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl transition-all duration-300">
          <div className="flex items-center justify-between gap-4 mb-4">
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#6EE7B7] bg-white/10 px-3 py-1 rounded-full border border-white/15">
              {current.tag}
            </span>
            <div className="flex items-center gap-1.5">
              {valuePropositions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentIndex ? 'w-6 bg-[#34D399]' : 'w-2 bg-white/30 hover:bg-white/50'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Animated Value Proposition Block */}
          <div
            className={`transition-all duration-300 transform ${
              isTransitioning
                ? 'opacity-0 translate-y-3'
                : 'opacity-100 translate-y-0'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#10B981] to-[#047857] flex items-center justify-center text-white shrink-0 shadow-md">
                <IconComponent className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg lg:text-xl font-extrabold text-white tracking-tight">
                  {current.title}
                </h3>
                <p className="mt-1.5 text-xs lg:text-sm text-emerald-100/85 leading-relaxed">
                  {current.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Verified Badges & Trust Stats */}
      <div className="relative z-10 pt-6 border-t border-white/15">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <span className="block text-xl lg:text-2xl font-black text-white">Up to 60%</span>
            <span className="text-[11px] font-medium text-emerald-200/80">Dynamic Discounts</span>
          </div>
          <div>
            <span className="block text-xl lg:text-2xl font-black text-white">30 Mins</span>
            <span className="text-[11px] font-medium text-emerald-200/80">Hold Guarantee</span>
          </div>
          <div>
            <span className="block text-xl lg:text-2xl font-black text-white">5 km</span>
            <span className="text-[11px] font-medium text-emerald-200/80">Hyper-Local Radius</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthShowcase;
