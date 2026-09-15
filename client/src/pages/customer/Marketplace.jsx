import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import flashSaleService from '../../services/flashSaleService';
import geoService from '../../services/geoService';
import wasteRescueService from '../../services/wasteRescueService';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';

// Layout & UI Components
import Logo from '../../components/common/Logo';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import LocationSelectorModal from '../../components/common/LocationSelectorModal';
import ProductImage from '../../components/common/ProductImage';
import { useToast } from '../../components/ui/Toast';

// Icons
import {
  Search,
  MapPin,
  Sparkles,
  Zap,
  Clock,
  Store,
  ArrowRight,
  UserCheck,
  LogOut,
  SlidersHorizontal,
  Navigation,
  RotateCcw,
  Compass,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Leaf,
  Boxes,
  Flame,
  CheckCircle2
} from 'lucide-react';

const categories = [
  { id: 'ALL', label: 'All Deals' },
  { id: 'RESCUE', label: '♻️ Waste Rescue' },
  { id: 'DAIRY', label: 'Dairy & Eggs' },
  { id: 'BAKERY', label: 'Fresh Bakery' },
  { id: 'BEVERAGES', label: 'Beverages' },
  { id: 'FRUITS', label: 'Fresh Fruits' },
  { id: 'VEGETABLES', label: 'Vegetables' },
  { id: 'SNACKS', label: 'Snacks & Sweets' },
  { id: 'FROZEN', label: 'Frozen Foods' },
  { id: 'READY_TO_EAT', label: 'Ready to Eat' }
];

const radiusOptions = [
  { value: 1, label: '1 km' },
  { value: 3, label: '3 km' },
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' }
];

const smartIntents = [
  { id: 'intent-dairy', label: '🥛 Dairy Ingredients', query: 'Milk', category: 'DAIRY' },
  { id: 'intent-sweets', label: '🍬 Sweet Making', query: '', category: 'DAIRY' },
  { id: 'intent-bakery', label: '🧁 For My Bakery', query: '', category: 'BAKERY' },
  { id: 'intent-bulk', label: '📦 Bulk Batches', isBulk: true },
  { id: 'intent-urgent', label: '⚡ Use This Week', sort: 'expiry' },
  { id: 'intent-rescue', label: '♻️ Waste Rescue', category: 'RESCUE' }
];

function Marketplace() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Global Location Context
  const {
    latitude,
    longitude,
    radius,
    isLocating,
    isLocationSet,
    locationLabel,
    setRadius,
    requestCurrentLocation
  } = useLocation();

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [sales, setSales] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'ALL');
  const [sortOption, setSortOption] = useState(searchParams.get('sort') || (isLocationSet ? 'distance' : 'expiry'));
  const [bulkOnly, setBulkOnly] = useState(false);
  const [page, setPage] = useState(parseInt(searchParams.get('page')) || 1);

  // Sync default sort with location state
  useEffect(() => {
    if (isLocationSet && sortOption === 'expiry') {
      setSortOption('distance');
    }
  }, [isLocationSet]);

  const fetchDeals = useCallback(async () => {
    try {
      setLoading(true);

      // Handle dedicated Waste Rescue tab
      if (selectedCategory === 'RESCUE') {
        const rescueRes = await wasteRescueService.getWasteRescueDeals({ limit: 16 });
        if (rescueRes.success && rescueRes.data) {
          let deals = rescueRes.data.deals || [];
          if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            deals = deals.filter(d =>
              (d.productId?.name || d.title || '').toLowerCase().includes(term) ||
              (d.storeId?.name || d.storeName || '').toLowerCase().includes(term)
            );
          }
          if (bulkOnly) {
            deals = deals.filter(d => (d.availableQuantity || 0) >= 10);
          }
          setSales(deals);
          setPagination({ page: 1, limit: 16, total: deals.length, totalPages: 1 });
        }
        setLoading(false);
        return;
      }

      const baseParams = {
        page,
        limit: 12,
        search: searchTerm.trim() || undefined,
        category: selectedCategory !== 'ALL' && selectedCategory !== 'RESCUE' ? selectedCategory : undefined,
        sort: sortOption
      };

      if (isLocationSet) {
        const nearbyRes = await geoService.getNearbyFlashSales({
          ...baseParams,
          latitude,
          longitude,
          radius
        });

        if (nearbyRes.success && nearbyRes.data) {
          let fetched = nearbyRes.data.flashSales || [];
          if (bulkOnly) {
            fetched = fetched.filter(d => (d.availableQuantity || 0) >= 10);
          }
          setSales(fetched);
          setPagination(nearbyRes.data.pagination || { page: 1, limit: 12, total: fetched.length, totalPages: 1 });
        }
      } else {
        const publicRes = await flashSaleService.getPublicFlashSales(baseParams);
        if (publicRes.success && publicRes.data) {
          let fetched = publicRes.data.flashSales || [];
          if (bulkOnly) {
            fetched = fetched.filter(d => (d.availableQuantity || 0) >= 10);
          }
          setSales(fetched);
          setPagination(publicRes.data.pagination || { page: 1, limit: 12, total: fetched.length, totalPages: 1 });
        }
      }
    } catch (err) {
      console.error('[Marketplace] Fetch deals error:', err);
      addToast('Unable to load nearby deals.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, selectedCategory, sortOption, bulkOnly, isLocationSet, latitude, longitude, radius, addToast]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchDeals();
  };

  const handleApplyIntent = (intent) => {
    if (intent.category) setSelectedCategory(intent.category);
    if (intent.query !== undefined) setSearchTerm(intent.query);
    if (intent.isBulk !== undefined) setBulkOnly(intent.isBulk);
    if (intent.sort) setSortOption(intent.sort);
    setPage(1);
  };

  const handleQuickLocate = async () => {
    const res = await requestCurrentLocation();
    if (res.success) {
      addToast('Location updated successfully!', 'success');
      setPage(1);
    } else {
      addToast(res.message || 'Location permission denied.', 'info');
      setIsLocationModalOpen(true);
    }
  };

  const handleIncreaseRadius = () => {
    const currentIndex = radiusOptions.findIndex((r) => r.value === radius);
    if (currentIndex < radiusOptions.length - 1) {
      const nextRadius = radiusOptions[currentIndex + 1].value;
      setRadius(nextRadius);
      addToast(`Radius increased to ${nextRadius} km`, 'info');
    } else {
      setRadius(50);
      addToast('Search radius set to maximum 50 km', 'info');
    }
  };

  // Helper for lifecycle badges
  const getDealLifecycle = (deal) => {
    const p = deal.productId || deal.product || deal;
    const daysLeft = deal.daysRemaining;
    const tier = p.perishabilityTier;

    if (daysLeft !== undefined && daysLeft <= 2) {
      return {
        label: `⚠️ Use Soon — ${daysLeft === 0 ? 'Today' : daysLeft + 'd left'}`,
        className: 'bg-amber-100 text-amber-900 border-amber-300'
      };
    }
    if (tier === 'Great for Business Use' || (p.businessUseCases && p.businessUseCases.length > 0)) {
      return {
        label: '✨ Great for Business Use',
        className: 'bg-purple-100 text-purple-900 border-purple-300'
      };
    }
    return {
      label: '📦 Good for Stocking',
      className: 'bg-blue-100 text-blue-900 border-blue-300'
    };
  };

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'STORE_OWNER') return '/store-owner';
    if (user.role === 'ADMIN') return '/admin';
    return '/customer';
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#1F2937] flex flex-col font-sans selection:bg-[#2E7D32] selection:text-white">
      {/* Header Bar */}
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <Link to="/">
            <Logo showTagline size="md" />
          </Link>

          {/* Search & Location Bar */}
          <div className="hidden lg:flex items-center gap-3 flex-1 max-w-2xl mx-6">
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search fresh products, ingredients, or stores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 rounded-xl border border-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#2E7D32] focus:bg-white transition-all"
              />
            </form>

            {/* Location Pill Selector */}
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all shrink-0 ${
                isLocationSet
                  ? 'bg-emerald-50 text-[#2E7D32] border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-[#2E7D32]" />
              <span className="max-w-[150px] truncate">
                {isLocationSet ? `Near You (${radius} km)` : 'Choose Location'}
              </span>
            </button>
          </div>

          {/* User Profile / Auth Action */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link to={getDashboardPath()}>
                  <Button variant="primary" size="sm" icon={UserCheck}>
                    Dashboard
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" icon={LogOut} onClick={logout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    Get Started <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Banner with Location Callout & Intent Pills */}
      <section className="bg-gradient-to-b from-emerald-950 via-emerald-900 to-[#1F2937] text-white py-9 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-800/80 border border-emerald-600/50 text-emerald-300 text-xs font-bold uppercase tracking-wider shadow-xs">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>Local Flash Sale &amp; Waste Rescue Marketplace</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
            Fresh Markdown Deals Near You
          </h1>

          <p className="text-xs sm:text-sm text-emerald-100 max-w-xl mx-auto font-medium leading-relaxed">
            "Good food shouldn't become waste." Connect with local stores offering smart discounts before products expire.
          </p>

          {/* Smart Search Intent Pills */}
          <div className="pt-2">
            <p className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-2">
              ⚡ Quick Intent Finder:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {smartIntents.map((intent) => (
                <button
                  key={intent.id}
                  onClick={() => handleApplyIntent(intent)}
                  className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-all cursor-pointer backdrop-blur-xs shadow-2xs hover:scale-105 active:scale-95"
                >
                  {intent.label}
                </button>
              ))}
            </div>
          </div>

          {/* Location Action Bar in Hero */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
            {isLocationSet ? (
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-2xl border border-white/20 text-xs font-semibold text-emerald-100">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Showing deals within <strong>{radius} km</strong></span>
                <button
                  onClick={() => setIsLocationModalOpen(true)}
                  className="underline hover:text-white font-bold ml-1 text-emerald-300 cursor-pointer"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="inline-flex flex-col sm:flex-row items-center gap-2 bg-white/10 backdrop-blur-md p-2 px-4 rounded-2xl border border-white/20 text-xs">
                <span className="text-emerald-100">Choose your location to discover nearby deals:</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Navigation}
                    loading={isLocating}
                    onClick={handleQuickLocate}
                    className="bg-[#2E7D32] hover:bg-[#1B5E20] text-white text-xs"
                  >
                    Use My Location
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={MapPin}
                    onClick={() => setIsLocationModalOpen(true)}
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20 text-xs"
                  >
                    Enter Location
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Category Horizontal Scroll Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-[#2E7D32] text-white shadow-md'
                  : 'bg-white border border-[#E5E7EB] text-slate-700 hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Filter / Sort & Radius Control Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-2xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#6B7280] flex items-center gap-1.5 mr-1">
              <MapPin className="w-3.5 h-3.5 text-[#2E7D32]" />
              <span>Radius:</span>
            </span>

            {radiusOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setRadius(opt.value);
                  setPage(1);
                  if (!isLocationSet) {
                    setIsLocationModalOpen(true);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isLocationSet && radius === opt.value
                    ? 'bg-[#2E7D32] text-white shadow-2xs'
                    : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}

            <button
              onClick={() => {
                setBulkOnly(!bulkOnly);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                bulkOnly
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Bulk Batches (10+)</span>
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-xs font-bold text-[#6B7280]">Sort by:</span>
            <select
              value={sortOption}
              onChange={(e) => {
                setSortOption(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-[#E5E7EB] rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2E7D32] cursor-pointer"
            >
              {isLocationSet && <option value="distance">Nearest First (Distance)</option>}
              <option value="expiry">Expiring Soonest</option>
              <option value="discount">Highest Discount</option>
              <option value="price">Lowest Price</option>
            </select>
          </div>
        </div>

        {/* Section Heading with Results Count */}
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#1F2937] tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#2E7D32]" />
              <span>
                {selectedCategory === 'RESCUE'
                  ? '♻️ Waste Rescue Deals (Urgent Food Rescue)'
                  : isLocationSet
                  ? `Deals within ${radius} km`
                  : 'Active Flash Deals'}
              </span>
            </h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              {selectedCategory === 'RESCUE'
                ? 'High markdown deals on near-expiry batches and excess stock.'
                : isLocationSet
                ? `Showing stores near your configured location`
                : 'Choose your location to see precise distances and nearby stores'}
            </p>
          </div>

          <span className="text-xs font-bold text-slate-500">
            {pagination.total} active deals
          </span>
        </div>

        {/* Flash Sale Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} padding="p-4" className="space-y-3">
                <Skeleton height="h-40" rounded="rounded-xl" />
                <Skeleton height="h-4" width="w-3/4" />
                <Skeleton height="h-4" width="w-1/2" />
                <Skeleton height="h-8" rounded="rounded-xl" />
              </Card>
            ))}
          </div>
        ) : sales.length === 0 ? (
          /* Empty States */
          isLocationSet ? (
            <EmptyState
              icon={Compass}
              title="No flash sales nearby"
              description={`We couldn't find any active flash sales within ${radius} km of your location. Try expanding your radius or checking again later.`}
              actionButton={
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleIncreaseRadius}
                  >
                    Increase Radius
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={RotateCcw}
                    onClick={fetchDeals}
                  >
                    Refresh
                  </Button>
                </div>
              }
            />
          ) : (
            <EmptyState
              icon={Zap}
              title="No active flash sales found"
              description="Try selecting a different category or setting your location to discover deals."
              actionButton={
                <Button
                  variant="primary"
                  size="sm"
                  icon={MapPin}
                  onClick={() => setIsLocationModalOpen(true)}
                >
                  Set Location
                </Button>
              }
            />
          )
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {sales.map((deal) => {
              const product = deal.productId || deal.product || {};
              const store = deal.storeId || deal.store || {};
              const productName = product.name || deal.title || 'Fresh Item';
              const storeName = store.name || deal.storeName || 'Local Retailer';
              const distanceText = deal.distanceKm !== undefined && deal.distanceKm !== null
                ? `${deal.distanceKm.toFixed(1)} km`
                : null;
              const lifecycle = getDealLifecycle(deal);
              const dealId = deal._id || deal.id;

              return (
                <Card
                  key={dealId}
                  hover
                  padding="p-0"
                  className="overflow-hidden flex flex-col justify-between group border border-[#E5E7EB] hover:border-emerald-300 bg-white shadow-xs"
                >
                  <div>
                    {/* Card Image & Discount Badge Overlay */}
                    <div className="relative h-48 bg-slate-100 flex items-center justify-center overflow-hidden">
                      <ProductImage
                        src={product.imageUrl || product.image || deal.image}
                        alt={productName}
                        category={product.category || deal.category}
                        aspectRatio="wide"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />

                      <div className="absolute top-3 left-3 bg-[#2E7D32] text-white text-[11px] font-black uppercase px-2.5 py-1 rounded-lg shadow-md border border-emerald-400 z-10 flex items-center gap-1">
                        <Flame className="w-3 h-3" />
                        <span>{deal.discountPercentage}% OFF</span>
                      </div>

                      <div className="absolute top-3 right-3 z-10">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border shadow-2xs backdrop-blur-xs ${lifecycle.className}`}>
                          {lifecycle.label}
                        </span>
                      </div>

                      <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 z-10">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>
                          {deal.daysRemaining === 0 ? 'Expires today' : deal.daysRemaining === 1 ? 'Expires tomorrow' : `${deal.daysRemaining} days left`}
                        </span>
                      </div>
                    </div>

                    {/* Card Content Body */}
                    <div className="p-4 space-y-2">
                      {/* Store & Distance Display */}
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-[#2E7D32] uppercase truncate flex items-center gap-1">
                          <Store className="w-3 h-3 shrink-0" />
                          <span className="truncate">{storeName}</span>
                        </span>

                        {distanceText && (
                          <span className="text-slate-600 flex items-center gap-1 shrink-0 bg-slate-100 px-2 py-0.5 rounded-md text-[10px]">
                            <MapPin className="w-3 h-3 text-[#2E7D32]" />
                            <span>{distanceText}</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-extrabold text-[#1F2937] leading-snug line-clamp-1 group-hover:text-[#2E7D32] transition-colors">
                        {productName}
                      </h3>

                      {/* Business Use Cases or Category Pill */}
                      {product.businessUseCases && product.businessUseCases.length > 0 ? (
                        <p className="text-[11px] text-purple-700 font-semibold truncate bg-purple-50 px-2 py-0.5 rounded-md">
                          Popular with: {product.businessUseCases.slice(0, 2).join(' • ')}
                        </p>
                      ) : (
                        <p className="text-xs text-[#6B7280] line-clamp-1">
                          {deal.title}
                        </p>
                      )}

                      {/* Pricing Display */}
                      <div className="flex items-baseline justify-between pt-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-black text-[#2E7D32]">₹{deal.salePrice}</span>
                          <span className="text-xs text-slate-400 line-through font-bold">₹{deal.originalPrice}</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          Save ₹{deal.originalPrice - deal.salePrice}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 font-medium">
                        Stock: <span className="font-bold text-slate-900">{deal.availableQuantity} available</span>
                      </p>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="p-4 pt-0">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full justify-center text-xs bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold"
                      onClick={() => navigate(`/marketplace/flash-sales/${dealId}`)}
                    >
                      Reserve Deal <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-6 border-t border-[#E5E7EB]">
            <Button
              variant="outline"
              size="sm"
              icon={ChevronLeft}
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>

            <span className="text-xs font-bold text-slate-700">
              Page {page} of {pagination.totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        )}
      </main>

      {/* Location Modal */}
      <LocationSelectorModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />

      {/* Public Footer */}
      <footer className="bg-white border-t border-[#E5E7EB] py-8 text-center text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo showTagline size="sm" />
          <p>SmartShelf &copy; {new Date().getFullYear()} — Save food. Save money.</p>
        </div>
      </footer>
    </div>
  );
}

export default Marketplace;
