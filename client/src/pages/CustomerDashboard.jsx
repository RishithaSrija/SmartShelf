import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import flashSaleService from '../services/flashSaleService';
import wasteRescueService from '../services/wasteRescueService';
import Logo from '../components/common/Logo';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import LocationSelectorModal from '../components/common/LocationSelectorModal';
import SmartPreferencesModal from '../components/preferences/SmartPreferencesModal';
import ProductImage from '../components/common/ProductImage';
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
  Flame,
  Check,
  Building2,
  Package,
  TrendingUp,
  Heart,
  Boxes,
  Leaf,
  Info
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
  const { user, logout, loadUser } = useAuth();
  const navigate = useNavigate();
  const {
    latitude,
    longitude,
    radius,
    isLocationSet,
    locationLabel
  } = useLocation();

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);
  const [sales, setSales] = useState([]);
  const [wasteRescueDeals, setWasteRescueDeals] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [activeFilterTab, setActiveFilterTab] = useState('ALL'); // 'ALL' | 'EXPIRING_SOON' | 'FRESH_PICKS' | 'BULK'
  const [searchQuery, setSearchQuery] = useState('');

  const isBusinessMode = user?.customerType === 'business';

  // Fetch deals, waste rescue, and smart recommendations
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [salesRes, rescueRes] = await Promise.allSettled([
        isLocationSet && latitude && longitude
          ? flashSaleService.getNearbyFlashSales(latitude, longitude, radius || 5)
          : flashSaleService.getPublicFlashSales({ limit: 16 }),
        wasteRescueService.getWasteRescueDeals({ limit: 8 })
      ]);

      if (salesRes.status === 'fulfilled' && salesRes.value?.success) {
        const fetchedSales = salesRes.value.data?.flashSales || salesRes.value.data || [];
        setSales(Array.isArray(fetchedSales) ? fetchedSales : []);
      }

      if (rescueRes.status === 'fulfilled' && rescueRes.value?.success) {
        setWasteRescueDeals(rescueRes.value.data?.deals || []);
      }
    } catch (err) {
      console.warn('Could not fetch dashboard data:', err.message);
    } finally {
      setLoading(false);
    }
  }, [isLocationSet, latitude, longitude, radius]);

  // Fetch smart recommendations for user
  const fetchRecommendations = useCallback(async () => {
    try {
      setLoadingRecs(true);
      const res = await wasteRescueService.getSmartRecommendations({ limit: 6 });
      if (res.success && res.data) {
        setRecommendations(res.data.recommendations || []);
      }
    } catch (err) {
      console.warn('Could not fetch recommendations:', err.message);
    } finally {
      setLoadingRecs(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    fetchRecommendations();
  }, [fetchDashboardData, fetchRecommendations]);

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

  // Lifecycle tier helper
  const getLifecycleBadge = (deal) => {
    const p = deal.productId || deal;
    const tier = p.perishabilityTier || (deal.daysRemaining <= 2 ? 'Use Soon' : 'Good for Stocking');
    if (tier === 'Use Soon' || (deal.daysRemaining !== undefined && deal.daysRemaining <= 2)) {
      return {
        text: `⚠️ Use Soon — ${deal.daysRemaining !== undefined ? deal.daysRemaining + 'd left' : 'Immediate Use'}`,
        className: 'bg-amber-50 text-amber-800 border-amber-200'
      };
    }
    if (tier === 'Great for Business Use') {
      return {
        text: '✨ Great for Business Use',
        className: 'bg-purple-50 text-purple-800 border-purple-200'
      };
    }
    return {
      text: '📦 Good for Stocking',
      className: 'bg-blue-50 text-blue-800 border-blue-200'
    };
  };

  // Filter deals
  const filteredDeals = sales.filter((deal) => {
    const productCat = (deal.productId?.category || deal.category || 'OTHER').toUpperCase();
    const matchesCat = selectedCategory === 'ALL' || productCat === selectedCategory;
    const pName = deal.productId?.name || deal.productName || deal.title || '';
    const sName = deal.storeId?.name || deal.storeName || '';
    const matchesSearch =
      pName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sName.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesTab = true;
    if (activeFilterTab === 'EXPIRING_SOON') {
      matchesTab = deal.discountPercentage >= 35 || (deal.daysRemaining !== undefined && deal.daysRemaining <= 1);
    } else if (activeFilterTab === 'FRESH_PICKS') {
      matchesTab = ['DAIRY', 'FRUITS', 'VEGETABLES', 'BAKERY'].includes(productCat);
    } else if (activeFilterTab === 'BULK') {
      matchesTab = (deal.availableQuantity || 0) >= 10;
    }

    return matchesCat && matchesSearch && matchesTab;
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
            <span className="truncate max-w-[180px]">
              {isLocationSet ? locationLabel : 'Set Location (Default 5km)'}
            </span>
          </button>

          {/* Mode Switcher Pill in Top Bar */}
          <button
            onClick={() => setIsPreferencesModalOpen(true)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              isBusinessMode
                ? 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100 shadow-2xs'
                : 'bg-emerald-50 text-[#0A4D2E] border-emerald-200 hover:bg-emerald-100 shadow-2xs'
            }`}
            title="Configure Shopping Mode & Smart Match Preferences"
          >
            {isBusinessMode ? (
              <>
                <Building2 className="w-3.5 h-3.5 text-purple-600" />
                <span className="hidden md:inline">Business Mode:</span>
                <span className="font-black truncate max-w-[120px]">
                  {user?.businessProfile?.businessName || user?.businessProfile?.businessType || 'Store/Kitchen'}
                </span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden md:inline">Shopping Mode:</span>
                <span className="font-black">Personal</span>
              </>
            )}
            <SlidersHorizontal className="w-3 h-3 text-slate-400 ml-0.5" />
          </button>

          {/* Quick Search Input */}
          <div className="hidden lg:flex flex-1 max-w-xs">
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
          <div className="flex items-center gap-2">
            <Link
              to="/customer/make-something"
              className="flex items-center gap-1.5 text-xs font-black text-purple-950 bg-purple-100 border border-purple-200 hover:bg-purple-200 px-3 py-2 rounded-xl transition-all shadow-2xs"
            >
              <span>🍬 Make Something</span>
            </Link>

            <Link
              to="/marketplace"
              className="flex items-center gap-1.5 text-xs font-bold text-[#0A4D2E] bg-[#E8F5E9] border border-emerald-200 hover:bg-emerald-100 px-3 py-2 rounded-xl transition-all"
            >
              <Zap className="w-3.5 h-3.5 text-[#16A34A]" />
              <span className="hidden sm:inline">Marketplace</span>
            </Link>

            <Link
              to="/orders"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white border border-[#E5E7EB] hover:bg-slate-50 px-3 py-2 rounded-xl transition-all"
            >
              <Receipt className="w-3.5 h-3.5 text-[#15803D]" />
              <span className="hidden sm:inline">Orders</span>
            </Link>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 px-2.5 py-2 rounded-xl transition-all"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mode Indicator & Smart Profile Banner */}
      <div className="bg-white border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isBusinessMode ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {isBusinessMode ? <Building2 className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-slate-900">
                  {isBusinessMode
                    ? `${user?.businessProfile?.businessName || 'Business Shopping Mode'} (${user?.businessProfile?.businessType || 'Kitchen / Shop'})`
                    : 'Personal Shopping Mode'}
                </h2>
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  isBusinessMode ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {isBusinessMode ? 'Active Business' : 'Home / Family'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {isBusinessMode
                  ? `Sourcing ingredients & raw materials • Urgency: ${user?.smartPreferences?.shelfLifePreference === 'URGENT' ? 'Very Urgent (1-2 days)' : user?.smartPreferences?.shelfLifePreference === 'SHORT' ? 'Short Shelf Life (2-4 days)' : 'Any Shelf Life'}`
                  : 'Browsing fresh markdown deals for daily household consumption.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => setIsPreferencesModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Configure Smart Preferences</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hero Banner Section */}
      <section className="relative bg-gradient-to-b from-[#E8F5E9]/70 via-[#F0FDF4] to-[#F8FAF8] border-b border-[#E5E7EB] py-10 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#10B981]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-[#15803D]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-emerald-200 text-[#0A4D2E] text-xs font-extrabold uppercase tracking-wider mb-4 shadow-xs">
            <Sparkles className="w-4 h-4 text-[#16A34A]" />
            <span>{isBusinessMode ? 'Commercial Raw Materials & Markdown Inputs' : 'Fresh finds. Smarter savings.'}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#1F2937] tracking-tight mb-3 leading-tight">
            {isBusinessMode ? (
              <>
                Smarter ingredient sourcing, <br />
                <span className="text-[#15803D]">zero preventable food waste.</span>
              </>
            ) : (
              <>
                Discover nearby deals, <br />
                <span className="text-[#15803D]">reserve what you need.</span>
              </>
            )}
          </h1>

          <p className="text-sm sm:text-base text-[#4B5563] max-w-2xl mx-auto mb-6 leading-relaxed font-normal">
            {isBusinessMode
              ? 'Connect directly with local grocers and suppliers to secure high-quality ingredients, bulk quantities, and surplus batches before they expire.'
              : 'SmartShelf connects you with local grocery stores and bakeries offering smart markdown deals before products expire.'}
          </p>

          {/* Value Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-3xl mx-auto text-left">
            <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-2xl border border-emerald-100/80 shadow-xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#E8F5E9] flex items-center justify-center text-[#15803D] shrink-0">
                <TrendingDown className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-[#1F2937]">Dynamic Markdowns</h4>
                <p className="text-[11px] text-[#6B7280]">Steeper discounts as expiry approaches.</p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-2xl border border-emerald-100/80 shadow-xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FEF3C7] flex items-center justify-center text-[#D97706] shrink-0">
                <Clock3 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-[#1F2937]">30-Min Hold Guarantee</h4>
                <p className="text-[11px] text-[#6B7280]">Guaranteed inventory reservation.</p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-2xl border border-emerald-100/80 shadow-xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#ECFDF5] flex items-center justify-center text-[#059669] shrink-0">
                <Leaf className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-[#1F2937]">Rescue Excess Food</h4>
                <p className="text-[11px] text-[#6B7280]">Help local businesses cut food waste.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Dashboard */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-10">

        {/* 1. MAKE SOMETHING — INGREDIENT BASKET ENTRY CARD */}
        {isBusinessMode && (
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2.5 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-purple-200 text-xs font-black uppercase tracking-wider">
                  <span>🍬 Make Something</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Need ingredients for your next batch?
                </h2>
                <p className="text-xs sm:text-sm text-purple-200 leading-relaxed font-medium">
                  Plan production in one cohesive basket. Choose what you're making and SmartShelf finds the required raw materials nearby — prioritizing stock that needs to move soon.
                </p>

                {/* Quick Examples / Pills */}
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-purple-300">Popular recipes:</span>
                  {[
                    { label: 'Laddu', id: 'besan-laddu' },
                    { label: 'Chikki', id: 'chikki' },
                    { label: 'Gulab Jamun', id: 'gulab-jamun' },
                    { label: 'Cake', id: 'sponge-cake' },
                    { label: 'Cookies', id: 'bakery-cookies' }
                  ].map((item) => (
                    <Link
                      key={item.id}
                      to={`/customer/make-something?recipe=${item.id}`}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-xs font-bold text-white transition-all hover:scale-105"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="shrink-0 w-full md:w-auto">
                <Link to="/customer/make-something" className="block w-full">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full bg-white text-purple-950 hover:bg-purple-50 font-black px-6 py-3.5 rounded-2xl shadow-lg text-sm transition-all hover:scale-105"
                  >
                    Build Ingredient Basket <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* 2. SMART MATCHES FOR YOUR BUSINESS (Business Mode Only) */}
        {isBusinessMode && (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                    <Sparkles className="w-5 h-5" />
                  </span>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    Smart Matches for {user?.businessProfile?.businessName || user?.businessProfile?.businessType || 'Your Business'}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Transparent, multi-factor matching based on your business type, ingredient preferences, and shelf-life urgency.
                </p>
              </div>
              <button
                onClick={() => setIsPreferencesModalOpen(true)}
                className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 self-start sm:self-auto"
              >
                <span>Edit Match Filters</span>
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
            </div>

            {loadingRecs ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[1, 2, 3].map((n) => (
                  <Card key={n} padding="p-5" className="space-y-3">
                    <Skeleton className="h-32 w-full rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-8 w-full" />
                  </Card>
                ))}
              </div>
            ) : recommendations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {recommendations.map((deal) => {
                  const product = deal.productId || {};
                  const store = deal.storeId || {};
                  const dealId = deal._id;
                  const productName = product.name || deal.title || 'Ingredient';
                  const storeName = store.name || deal.storeName || 'Local Supplier';
                  const category = product.category || deal.category || 'GROCERY';
                  const originalPrice = deal.originalPrice || product.basePrice || 100;
                  const salePrice = deal.salePrice || 70;
                  const discountPct = deal.discountPercentage || Math.round(((originalPrice - salePrice) / originalPrice) * 100);
                  const availableQty = deal.availableQuantity ?? 1;
                  const lifecycle = getLifecycleBadge(deal);

                  return (
                    <Card
                      key={dealId}
                      hover
                      padding="p-0"
                      className="overflow-hidden flex flex-col justify-between border border-purple-200/80 bg-white shadow-xs hover:shadow-md transition-all group"
                    >
                      {/* Image Card Header */}
                      <div className="relative h-44 w-full bg-slate-100 overflow-hidden border-b border-slate-100">
                        <ProductImage
                          src={product.imageUrl || product.image || deal.image}
                          alt={productName}
                          category={category}
                          aspectRatio="wide"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2.5 inset-x-2.5 flex items-start justify-between gap-2 pointer-events-none">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-900 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-purple-200 shadow-xs">
                            {category}
                          </span>
                          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-purple-600 text-white shadow-xs flex items-center gap-1">
                            <Flame className="w-3 h-3" />
                            {discountPct}% OFF
                          </span>
                        </div>

                        {/* Lifecycle badge pill */}
                        <div className="absolute bottom-2.5 left-2.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border backdrop-blur-xs ${lifecycle.className}`}>
                            {lifecycle.text}
                          </span>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-black text-slate-900 line-clamp-1 group-hover:text-purple-700 transition-colors">
                              {productName}
                            </h3>
                            <span className="text-xs font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md shrink-0">
                              ₹{salePrice}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                            <Store className="w-3 h-3 text-purple-500 shrink-0" />
                            <span className="truncate">{storeName}</span>
                          </div>
                        </div>

                        {/* Why this matches you checklist */}
                        <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-2.5 space-y-1 text-xs">
                          <p className="text-[11px] font-extrabold uppercase tracking-wider text-purple-900 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-purple-600" />
                            <span>Why this matches you:</span>
                          </p>
                          {deal.matchReasons && deal.matchReasons.length > 0 ? (
                            deal.matchReasons.slice(0, 3).map((reason, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-[11px] text-purple-950 font-medium">
                                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span className="truncate">{reason}</span>
                              </div>
                            ))
                          ) : (
                            <div className="flex items-center gap-1.5 text-[11px] text-purple-950 font-medium">
                              <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>High-priority ingredient markdown</span>
                            </div>
                          )}
                        </div>

                        {/* Price & Quantity Available */}
                        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                          <span className="font-semibold text-slate-400 line-through">₹{originalPrice}</span>
                          <span className="font-bold text-slate-800">
                            📦 {availableQty} units available
                          </span>
                        </div>

                        {/* CTA Link */}
                        <Link to={`/marketplace/flash-sales/${dealId}`} className="block w-full">
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl shadow-xs"
                          >
                            Reserve Bulk Deal <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-purple-100 p-6 text-center max-w-xl mx-auto shadow-xs">
                <Boxes className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800">No tailored business matches currently</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Adjust your preferred categories (e.g. Dairy, Baking) or shelf-life urgency in preferences to discover more matching inventory.
                </p>
                <button
                  onClick={() => setIsPreferencesModalOpen(true)}
                  className="mt-3 px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Update Smart Preferences</span>
                </button>
              </div>
            )}
          </section>
        )}

        {/* 2. WASTE RESCUE SECTION (Both Personal and Business Mode) */}
        <section className="bg-gradient-to-br from-[#ECFDF5] via-[#F0FDF4] to-[#F8FAF8] border border-emerald-200 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#16A34A] text-white shadow-2xs">
                  <Leaf className="w-5 h-5" />
                </span>
                <h2 className="text-xl font-black text-[#0A4D2E] tracking-tight">
                  ♻️ Waste Rescue Deals
                </h2>
              </div>
              <p className="text-xs font-bold text-[#15803D] mt-1">
                "Good food shouldn't become waste."
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                Steep markdowns on near-expiry batches and excess inventory verified from local store shelves.
              </p>
            </div>
            <Link
              to="/marketplace"
              className="text-xs font-bold text-[#15803D] hover:text-[#0D6832] bg-white border border-emerald-200 px-3 py-1.5 rounded-xl hover:bg-emerald-50 transition-all flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Explore All Markdown Deals</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {wasteRescueDeals.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {wasteRescueDeals.slice(0, 4).map((deal) => {
                const product = deal.productId || {};
                const store = deal.storeId || {};
                const dealId = deal._id;
                const productName = product.name || deal.title || 'Fresh Product';
                const storeName = store.name || deal.storeName || 'Local Store';
                const originalPrice = deal.originalPrice || product.basePrice || 100;
                const salePrice = deal.salePrice || 60;
                const discountPct = deal.discountPercentage || Math.round(((originalPrice - salePrice) / originalPrice) * 100);
                const daysLeft = deal.daysRemaining;

                return (
                  <div
                    key={dealId}
                    className="bg-white rounded-2xl border border-emerald-200/80 p-3.5 shadow-2xs flex flex-col justify-between hover:border-emerald-400 hover:shadow-xs transition-all group"
                  >
                    <div className="relative h-32 w-full rounded-xl overflow-hidden bg-slate-100 mb-2.5">
                      <ProductImage
                        src={product.imageUrl || product.image || deal.image}
                        alt={productName}
                        category={product.category}
                        aspectRatio="wide"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 right-2 bg-rose-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full shadow-2xs">
                        {discountPct}% OFF
                      </div>
                      <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {daysLeft !== undefined ? `${daysLeft}d left` : 'Use Soon'}
                      </div>
                    </div>

                    <div className="space-y-1.5 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 truncate group-hover:text-[#15803D] transition-colors">
                          {productName}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate">{storeName}</p>
                      </div>

                      <div className="flex items-baseline justify-between pt-1">
                        <div>
                          <span className="text-base font-black text-[#0A4D2E]">₹{salePrice}</span>
                          <span className="text-[11px] font-semibold text-slate-400 line-through ml-1.5">₹{originalPrice}</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          Save ₹{originalPrice - salePrice}
                        </span>
                      </div>

                      <Link to={`/marketplace/flash-sales/${dealId}`} className="block w-full pt-1">
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full bg-[#15803D] hover:bg-[#0D6832] text-white font-bold text-xs py-1.5 rounded-xl shadow-2xs"
                        >
                          Rescue Item <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-slate-500">
              No critical near-expiry items right now — all active items have healthy shelf life!
            </div>
          )}
        </section>

        {/* 3. CATEGORY FILTER & SEARCH BAR */}
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

        {/* 4. ACTIVE FLASH SALES GRID */}
        <div className="space-y-4">
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

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-2 text-xs overflow-x-auto">
            <button
              onClick={() => setActiveFilterTab('ALL')}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeFilterTab === 'ALL'
                  ? 'bg-[#15803D] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              All Live Deals
            </button>
            <button
              onClick={() => setActiveFilterTab('EXPIRING_SOON')}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                activeFilterTab === 'EXPIRING_SOON'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Clock3 className="w-3.5 h-3.5" />
              <span>Expiring Soon (Max Savings)</span>
            </button>
            <button
              onClick={() => setActiveFilterTab('FRESH_PICKS')}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                activeFilterTab === 'FRESH_PICKS'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Fresh Picks (Produce & Bakery)</span>
            </button>
            {isBusinessMode && (
              <button
                onClick={() => setActiveFilterTab('BULK')}
                className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeFilterTab === 'BULK'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Boxes className="w-3.5 h-3.5" />
                <span>Bulk Batches (10+ Units)</span>
              </button>
            )}
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
                const lifecycle = getLifecycleBadge(deal);

                return (
                  <Card
                    key={dealId}
                    hover
                    padding="p-0"
                    className="overflow-hidden flex flex-col justify-between border border-[#E5E7EB] bg-white shadow-xs hover:shadow-md transition-all group"
                  >
                    {/* Top Product Image Card Header with Deal Badge */}
                    <div className="relative h-48 w-full bg-slate-100 overflow-hidden border-b border-[#E5E7EB]/60">
                      <ProductImage
                        src={product.imageUrl || product.image || deal.image}
                        alt={productName}
                        category={category}
                        aspectRatio="wide"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />

                      {/* Floating Badges */}
                      <div className="absolute top-3 inset-x-3 flex items-start justify-between gap-2 pointer-events-none">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0A4D2E] bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-emerald-200/80 shadow-xs">
                          {category}
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-[#D97706] text-white shadow-xs flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          {discountPct}% OFF
                        </span>
                      </div>

                      {/* Lifecycle tag overlay */}
                      <div className="absolute top-11 left-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border backdrop-blur-xs shadow-2xs ${lifecycle.className}`}>
                          {lifecycle.text}
                        </span>
                      </div>

                      {/* Product & Store Name Overlay */}
                      <div className="absolute bottom-2.5 inset-x-2.5 bg-white/95 backdrop-blur-xs p-2.5 rounded-xl border border-white/80 shadow-xs">
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
                      <Link to={`/marketplace/flash-sales/${dealId}`} className="block w-full">
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
        </div>

        {/* 5. DEMAND & VALUE INSIGHTS (Business Mode Sourcing Tips) */}
        {isBusinessMode && (
          <div className="bg-gradient-to-r from-purple-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
            <div className="relative z-10 max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-purple-200 text-xs font-extrabold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Smart Sourcing Tip</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                Save up to 40% on ingredients before scheduled production runs
              </h3>
              <p className="text-xs sm:text-sm text-purple-200 leading-relaxed">
                By purchasing surplus dairy, fruits, or staple markdown batches 24 to 48 hours before immediate sweet making, baking, or cooking, commercial kitchens reduce food costs while helping local retailers achieve zero waste.
              </p>
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={() => setIsPreferencesModalOpen(true)}
                  className="px-4 py-2 bg-white text-purple-950 rounded-xl text-xs font-black hover:bg-purple-50 transition-all cursor-pointer shadow-xs"
                >
                  Refine Ingredient Preferences
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Preferences Modal */}
      <SmartPreferencesModal
        isOpen={isPreferencesModalOpen}
        onClose={() => setIsPreferencesModalOpen(false)}
        onSaved={() => {
          loadUser();
          fetchRecommendations();
        }}
      />

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
          <p>SmartShelf &copy; {new Date().getFullYear()} — Expiry-Aware Dynamic Pricing &amp; Intelligent Waste Reduction</p>
        </div>
      </footer>
    </div>
  );
}

export default CustomerDashboard;
