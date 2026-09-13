import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import flashSaleService from '../../services/flashSaleService';
import geoService from '../../services/geoService';
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
  AlertCircle
} from 'lucide-react';

const categories = [
  { id: 'ALL', label: 'All Deals' },
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

      const baseParams = {
        page,
        limit: 12,
        search: searchTerm.trim() || undefined,
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        sort: sortOption
      };

      if (isLocationSet) {
        // Geospatial nearby query
        const nearbyRes = await geoService.getNearbyFlashSales({
          ...baseParams,
          latitude,
          longitude,
          radius
        });

        if (nearbyRes.success && nearbyRes.data) {
          setSales(nearbyRes.data.flashSales || []);
          setPagination(nearbyRes.data.pagination || { page: 1, limit: 12, total: 0, totalPages: 1 });
        }
      } else {
        // Standard public query without fake distances
        const publicRes = await flashSaleService.getPublicFlashSales(baseParams);
        if (publicRes.success && publicRes.data) {
          setSales(publicRes.data.flashSales || []);
          setPagination(publicRes.data.pagination || { page: 1, limit: 12, total: 0, totalPages: 1 });
        }
      }
    } catch (err) {
      console.error('[Marketplace] Fetch deals error:', err);
      addToast('Unable to load nearby deals.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, selectedCategory, sortOption, isLocationSet, latitude, longitude, radius, addToast]);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchDeals();
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
                placeholder="Search fresh products, bakeries, or store deals..."
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

      {/* Hero Banner with Location Callout */}
      <section className="bg-gradient-to-b from-emerald-950 via-emerald-900 to-[#1F2937] text-white py-10 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-800/80 border border-emerald-600/50 text-emerald-300 text-xs font-bold uppercase tracking-wider shadow-xs">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>Local Flash Sale Marketplace</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
            Flash Sales Near You
          </h1>

          <p className="text-sm sm:text-base text-emerald-100 max-w-xl mx-auto font-medium leading-relaxed">
            Save money while helping local stores reduce food waste.
          </p>

          {/* Location Action Bar in Hero */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-2.5">
            {isLocationSet ? (
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 text-xs font-semibold text-emerald-100">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>Showing deals within <strong>{radius} km</strong></span>
                <button
                  onClick={() => setIsLocationModalOpen(true)}
                  className="underline hover:text-white font-bold ml-1 text-emerald-300"
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

          {/* Mobile Search Bar */}
          <form onSubmit={handleSearchSubmit} className="lg:hidden flex items-center gap-2 max-w-md mx-auto pt-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search deals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs text-slate-900 bg-white rounded-xl focus:outline-none"
              />
            </div>
            <Button type="submit" variant="primary" size="sm">
              Search
            </Button>
          </form>
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
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isLocationSet && radius === opt.value
                    ? 'bg-[#2E7D32] text-white shadow-2xs'
                    : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-xs font-bold text-[#6B7280]">Sort by:</span>
            <select
              value={sortOption}
              onChange={(e) => {
                setSortOption(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-[#E5E7EB] rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
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
                {isLocationSet ? `Deals within ${radius} km` : 'Active Flash Deals'}
              </span>
            </h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              {isLocationSet
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
              const productName = deal.product?.name || deal.title;
              const storeName = deal.store?.name || 'Local Retailer';
              const distanceText = deal.distanceKm !== undefined && deal.distanceKm !== null
                ? `${deal.distanceKm.toFixed(1)} km`
                : null;

              return (
                <Card
                  key={deal._id || deal.id}
                  hover
                  padding="p-0"
                  className="overflow-hidden flex flex-col justify-between group border border-[#E5E7EB] hover:border-emerald-300 bg-white"
                >
                  <div>
                    {/* Card Image & Discount Badge Overlay */}
                    <div className="relative h-48 bg-slate-100 flex items-center justify-center overflow-hidden">
                      <ProductImage
                        src={deal.product?.imageUrl || deal.product?.image}
                        alt={productName}
                        category={deal.product?.category}
                        aspectRatio="wide"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />

                      <div className="absolute top-3 left-3 bg-[#2E7D32] text-white text-[11px] font-black uppercase px-2.5 py-1 rounded-lg shadow-md border border-emerald-400 z-10">
                        {deal.discountPercentage}% OFF
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

                      <p className="text-xs text-[#6B7280] line-clamp-1">
                        {deal.title}
                      </p>

                      {/* Pricing Display */}
                      <div className="flex items-baseline gap-2 pt-1">
                        <span className="text-lg font-black text-[#2E7D32]">₹{deal.salePrice}</span>
                        <span className="text-xs text-slate-400 line-through font-bold">₹{deal.originalPrice}</span>
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
                      className="w-full justify-center text-xs"
                      onClick={() => navigate(`/marketplace/flash-sales/${deal._id || deal.id}`)}
                    >
                      View Deal <ArrowRight className="w-3.5 h-3.5 ml-1" />
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
