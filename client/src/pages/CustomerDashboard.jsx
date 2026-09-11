import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import flashSaleService from '../services/flashSaleService';
import Logo from '../components/common/Logo';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import LocationSelectorModal from '../components/common/LocationSelectorModal';
import {
  Search,
  MapPin,
  Sparkles,
  Zap,
  Clock3,
  ChevronRight,
  Receipt,
  User,
  LogOut,
  ShoppingBag,
  ArrowRight,
  TrendingDown,
  ShieldCheck,
  Store,
  Tag,
  AlertTriangle,
  SlidersHorizontal,
  Flame
} from 'lucide-react';

const categories = [
  { id: 'ALL', label: 'All Items', icon: ShoppingBag },
  { id: 'DAIRY', label: 'Dairy & Eggs', icon: Sparkles },
  { id: 'BAKERY', label: 'Fresh Bakery', icon: Flame },
  { id: 'FRUITS', label: 'Fresh Fruits', icon: Tag },
  { id: 'VEGETABLES', label: 'Vegetables', icon: Sparkles },
  { id: 'BEVERAGES', label: 'Beverages', icon: Tag },
  { id: 'SNACKS', label: 'Snacks & Quick Bites', icon: Flame }
];

function CustomerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const {
    latitude,
    longitude,
    radius,
    isLocationSet,
    locationLabel
  } = useLocation();

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch real flash sales from backend
  const fetchDeals = useCallback(async () => {
    try {
      setLoading(true);
      let res;
      if (isLocationSet && latitude && longitude) {
        res = await flashSaleService.getNearbyFlashSales(latitude, longitude, radius || 5);
      } else {
        res = await flashSaleService.getPublicFlashSales({ limit: 8 });
      }

      if (res.success && res.data) {
        const fetchedSales = res.data.flashSales || res.data || [];
        setSales(Array.isArray(fetchedSales) ? fetchedSales : []);
      }
    } catch (err) {
      console.warn('Could not fetch flash sales for dashboard:', err.message);
      setSales([]);
    } finally {
      setLoading(false);
    }
  }, [isLocationSet, latitude, longitude, radius]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  // Expiry badge helper
  const getExpiryBadge = (hoursLeft, daysLeft) => {
    if (hoursLeft !== undefined && hoursLeft <= 6) {
      return {
        label: hoursLeft <= 1 ? 'Expires in < 1 hr' : `Expires in ${hoursLeft} hrs`,
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500'
      };
    }
    if (daysLeft !== undefined && daysLeft <= 1) {
      return {
        label: 'Expires Today / Tomorrow',
        bg: 'bg-amber-50 text-amber-800 border-amber-200',
        dot: 'bg-amber-500'
      };
    }
    if (daysLeft !== undefined && daysLeft <= 3) {
      return {
        label: `Expires in ${daysLeft} days`,
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dot: 'bg-emerald-500'
      };
    }
    return {
      label: 'Limited Time Deal',
      bg: 'bg-slate-50 text-slate-700 border-slate-200',
      dot: 'bg-slate-400'
    };
  };

  // Filter deals
  const filteredDeals = sales.filter((deal) => {
    const productCat = deal.productId?.category || deal.category || 'OTHER';
    const matchesCat = selectedCategory === 'ALL' || productCat === selectedCategory;
    const pName = deal.productId?.name || deal.productName || deal.title || '';
    const sName = deal.storeId?.name || deal.storeName || '';
    const matchesSearch =
      pName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#1F2937] flex flex-col justify-between font-sans selection:bg-[#16A34A] selection:text-white">
      {/* Top Header */}
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <Link to="/customer" className="hover:opacity-95 transition-opacity">
            <Logo showTagline size="md" />
          </Link>

          {/* Location Selector Pill */}
          <button
            onClick={() => setIsLocationModalOpen(true)}
            className="hidden sm:flex items-center gap-2 bg-[#F8FAF8] border border-[#E5E7EB] px-3.5 py-2 rounded-xl text-xs text-[#0A4D2E] font-bold hover:bg-[#E8F5E9] hover:border-emerald-300 transition-all cursor-pointer"
            title="Change pickup location"
          >
            <MapPin className="w-4 h-4 text-[#16A34A]" />
            <span className="truncate max-w-[220px]">
              {isLocationSet ? locationLabel : 'Set Location (Default 5km)'}
            </span>
          </button>

          {/* Quick Search Input */}
          <div className="hidden md:flex flex-1 max-w-sm">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products or stores..."
                className="w-full pl-10 pr-4 py-2 text-xs text-[#1F2937] bg-[#F8FAF8] rounded-xl border border-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:bg-white transition-all placeholder-slate-400"
              />
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2.5">
            <Link
              to="/marketplace"
              className="flex items-center gap-1.5 text-xs font-bold text-[#0A4D2E] bg-[#E8F5E9] border border-emerald-200 hover:bg-emerald-100 px-3.5 py-2 rounded-xl transition-all"
            >
              <Zap className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>Explore Marketplace</span>
            </Link>

            <Link
              to="/orders"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white border border-[#E5E7EB] hover:bg-slate-50 px-3 py-2 rounded-xl transition-all"
            >
              <Receipt className="w-3.5 h-3.5 text-[#15803D]" />
              <span className="hidden sm:inline">My Orders</span>
            </Link>

            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-800">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>{user?.name ? user.name.split(' ')[0] : 'Account'}</span>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 px-3 py-2 rounded-xl transition-all"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Banner Section */}
      <section className="relative bg-gradient-to-b from-[#E8F5E9]/70 via-[#F0FDF4] to-[#F8FAF8] border-b border-[#E5E7EB] py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Subtle Decorative Elements */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#10B981]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-[#15803D]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-emerald-200 text-[#0A4D2E] text-xs font-extrabold uppercase tracking-wider mb-5 shadow-xs">
            <Sparkles className="w-4 h-4 text-[#16A34A]" />
            <span>Fresh finds. Smarter savings.</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#1F2937] tracking-tight mb-4 leading-tight">
            Discover nearby deals, <br />
            <span className="text-[#15803D]">reserve what you need.</span>
          </h1>

          <p className="text-sm sm:text-lg text-[#4B5563] max-w-2xl mx-auto mb-8 leading-relaxed font-normal">
            SmartShelf connects you with local grocery stores and bakeries offering smart markdown deals before products expire.
          </p>

          {/* Value Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8 text-left">
            <div className="bg-white/80 backdrop-blur-xs p-4 rounded-2xl border border-emerald-100/80 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#E8F5E9] flex items-center justify-center text-[#15803D] shrink-0">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-[#1F2937]">Dynamic Markdowns</h4>
                <p className="text-[11px] text-[#6B7280]">Discounts increase as expiry approaches.</p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xs p-4 rounded-2xl border border-emerald-100/80 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center text-[#D97706] shrink-0">
                <Clock3 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-[#1F2937]">30-Min Hold Guarantee</h4>
                <p className="text-[11px] text-[#6B7280]">Zero risk of sold-out items on arrival.</p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xs p-4 rounded-2xl border border-emerald-100/80 shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] flex items-center justify-center text-[#059669] shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-[#1F2937]">Zero Food Waste</h4>
                <p className="text-[11px] text-[#6B7280]">Help local retailers rescue fresh food.</p>
              </div>
            </div>
          </div>

          {/* Hero Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/marketplace">
              <Button variant="primary" size="lg" className="shadow-md bg-[#15803D] hover:bg-[#0D6832] font-bold px-6">
                Explore All Flash Sales <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>

            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[#E5E7EB] bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs"
            >
              <MapPin className="w-4 h-4 text-[#16A34A]" />
              <span>Change Pickup Location</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Dashboard */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 flex-1 space-y-10">
        {/* Category Filter Bar */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Browse by Category
            </h3>
            <Link to="/marketplace" className="text-xs font-bold text-[#15803D] hover:underline flex items-center gap-1">
              <span>View full catalog</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#15803D] text-white shadow-sm ring-2 ring-[#15803D]/20'
                      : 'bg-white text-slate-700 border border-[#E5E7EB] hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-[#16A34A]'}`} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Deals Section Heading */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#FEF3C7] text-[#D97706]">
                <Flame className="w-5 h-5" />
              </span>
              <h2 className="text-2xl font-black text-[#1F2937] tracking-tight">
                Active Flash Sales Near You
              </h2>
            </div>
            <p className="text-xs text-[#6B7280] mt-1">
              Live discount markdowns automatically verified against store inventory batches.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-bold text-[#0A4D2E] bg-[#E8F5E9] px-3.5 py-1.5 rounded-full border border-emerald-200">
              {filteredDeals.length} Deals Found
            </span>
            <Link
              to="/marketplace"
              className="text-xs font-bold text-[#15803D] hover:text-[#0D6832] bg-white border border-[#E5E7EB] px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-all flex items-center gap-1"
            >
              <span>Marketplace</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Flash Sale Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <Card key={n} padding="p-0" className="overflow-hidden">
                <Skeleton className="h-44 w-full" />
                <div className="p-5 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-9 w-full rounded-xl" />
                </div>
              </Card>
            ))}
          </div>
        ) : filteredDeals.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredDeals.map((deal) => {
              const product = deal.productId || {};
              const store = deal.storeId || {};
              const dealId = deal._id;
              const productName = product.name || deal.title || 'Fresh Product';
              const storeName = store.name || deal.storeName || 'Local Store';
              const category = product.category || deal.category || 'GROCERY';
              const originalPrice = deal.originalPrice || product.basePrice || 100;
              const salePrice = deal.salePrice || 70;
              const discountPct = deal.discountPercentage || Math.round(((originalPrice - salePrice) / originalPrice) * 100);
              const availableQty = deal.availableQuantity ?? 1;
              const hoursLeft = deal.hoursRemaining;
              const daysLeft = deal.daysRemaining;
              const expiryMeta = getExpiryBadge(hoursLeft, daysLeft);

              return (
                <Card
                  key={dealId}
                  hover
                  padding="p-0"
                  className="overflow-hidden flex flex-col justify-between border border-[#E5E7EB] bg-white shadow-xs hover:shadow-md transition-all group"
                >
                  {/* Top Graphic Card Header with Deal Badge */}
                  <div className="h-44 bg-gradient-to-br from-emerald-50 via-slate-50 to-amber-50/50 p-4 relative flex flex-col justify-between border-b border-[#E5E7EB]/60">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0A4D2E] bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-emerald-200/60 shadow-2xs">
                        {category}
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-[#D97706] text-white shadow-xs flex items-center gap-1">
                        <Flame className="w-3 h-3" />
                        {discountPct}% OFF
                      </span>
                    </div>

                    <div className="bg-white/95 backdrop-blur-xs p-3 rounded-xl border border-white/80 shadow-xs">
                      <p className="text-xs font-black text-[#1F2937] truncate group-hover:text-[#15803D] transition-colors">
                        {productName}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280] mt-0.5">
                        <Store className="w-3 h-3 text-[#16A34A] shrink-0" />
                        <span className="truncate">{storeName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    {/* Price Block */}
                    <div className="bg-[#F8FAF8] p-3.5 rounded-xl border border-[#E5E7EB] flex items-baseline justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-[#0A4D2E]">₹{salePrice}</span>
                        <span className="text-xs font-semibold text-slate-400 line-through">₹{originalPrice}</span>
                      </div>
                      <span className="text-[11px] font-extrabold text-[#15803D] bg-[#E8F5E9] px-2 py-0.5 rounded-md">
                        Save ₹{originalPrice - salePrice}
                      </span>
                    </div>

                    {/* Expiry & Stock Indicator */}
                    <div className="space-y-2">
                      <div className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg border font-bold ${expiryMeta.bg}`}>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${expiryMeta.dot}`} />
                          <span>{expiryMeta.label}</span>
                        </div>
                        <Clock3 className="w-3.5 h-3.5 shrink-0 opacity-75" />
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
                        <span>Stock Available</span>
                        <span className="font-bold text-slate-800">{availableQty} units</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Link to={`/marketplace/${dealId}`} className="block w-full">
                      <Button
                        variant="primary"
                        size="md"
                        className="w-full bg-[#15803D] hover:bg-[#0D6832] text-white font-bold rounded-xl shadow-xs"
                      >
                        Reserve Deal <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          /* Clean Empty State */
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-12 text-center max-w-2xl mx-auto shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-[#E8F5E9] text-[#15803D] flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-[#1F2937] tracking-tight">
              No Flash Sales in this category right now
            </h3>
            <p className="text-xs sm:text-sm text-[#6B7280] mt-1.5 max-w-md mx-auto">
              Local stores update expiring inventory batches frequently. Explore the public marketplace or try widening your search radius.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={() => setSelectedCategory('ALL')}
                className="bg-[#15803D] hover:bg-[#0D6832] text-white font-bold"
              >
                Reset Filter
              </Button>
              <Link to="/marketplace">
                <Button variant="secondary" size="md">
                  View Full Marketplace
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Location Modal */}
      <LocationSelectorModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-[#E5E7EB] py-8 text-center text-xs text-[#6B7280]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo size="sm" showTagline={false} />
            <span className="text-slate-400">|</span>
            <span>Save food. Save money.</span>
          </div>
          <p>SmartShelf &copy; {new Date().getFullYear()} — Expiry-Aware Dynamic Pricing Platform</p>
        </div>
      </footer>
    </div>
  );
}

export default CustomerDashboard;
