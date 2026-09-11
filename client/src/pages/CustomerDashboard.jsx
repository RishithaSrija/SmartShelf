import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/common/Logo';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import {
  Search,
  MapPin,
  ShoppingBag,
  Bell,
  User,
  LogOut,
  Sparkles,
  Zap,
  Clock3,
  ChevronRight,
  Filter,
  CheckCircle2,
  Receipt
} from 'lucide-react';

const sampleDeals = [
  {
    id: 1,
    name: 'Whole Wheat Bread (400g)',
    store: 'FreshMart Organics',
    distance: '1.2 km',
    originalPrice: 45,
    salePrice: 25,
    discount: '44% OFF',
    expiry: 'Expires tomorrow',
    expiryVariant: 'EXPIRING_SOON',
    quantity: 12,
    category: 'BAKERY',
    imageBg: 'bg-amber-100/70 text-amber-800'
  },
  {
    id: 2,
    name: 'Organic Tomatoes (1kg)',
    store: 'Green Grocers',
    distance: '0.8 km',
    originalPrice: 80,
    salePrice: 40,
    discount: '50% OFF',
    expiry: 'Expires today',
    expiryVariant: 'EXPIRED',
    quantity: 8,
    category: 'VEGETABLES',
    imageBg: 'bg-rose-100/70 text-rose-800'
  },
  {
    id: 3,
    name: 'Butter Croissants 4-Pack',
    store: 'Artisan Bakery',
    distance: '1.5 km',
    originalPrice: 200,
    salePrice: 80,
    discount: '60% OFF',
    expiry: 'Expires today',
    expiryVariant: 'EXPIRED',
    quantity: 5,
    category: 'BAKERY',
    imageBg: 'bg-orange-100/70 text-orange-800'
  },
  {
    id: 4,
    name: 'Fresh Organic Whole Milk (1L)',
    store: 'Daily Fresh Supermarket',
    distance: '2.1 km',
    originalPrice: 70,
    salePrice: 49,
    discount: '30% OFF',
    expiry: 'Expires in 2 days',
    expiryVariant: 'LOW_STOCK',
    quantity: 15,
    category: 'DAIRY',
    imageBg: 'bg-[#E8F5E9] text-[#2E7D32]'
  }
];

const categories = [
  { id: 'ALL', label: 'All Deals' },
  { id: 'DAIRY', label: 'Dairy & Eggs' },
  { id: 'BAKERY', label: 'Bakery' },
  { id: 'VEGETABLES', label: 'Produce' },
  { id: 'BEVERAGES', label: 'Beverages' },
  { id: 'SNACKS', label: 'Snacks' }
];

function CustomerDashboard() {
  const { user, logout } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState('Jubilee Hills, Hyderabad (Near me)');

  const filteredDeals = sampleDeals.filter((deal) => {
    const matchesCat = selectedCategory === 'ALL' || deal.category === selectedCategory;
    const matchesSearch = deal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          deal.store.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#1F2937] flex flex-col justify-between font-sans selection:bg-[#2E7D32] selection:text-white">
      {/* Customer Header */}
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <Logo showTagline size="md" />

          {/* Location Selector */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-[#E5E7EB] px-3.5 py-2 rounded-xl text-xs text-[#1F2937] font-semibold cursor-pointer hover:bg-slate-100 transition-colors">
            <MapPin className="w-4 h-4 text-[#2E7D32]" />
            <span className="truncate max-w-[200px]">{userLocation}</span>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-sm">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products or local flash sales..."
                className="w-full pl-10 pr-4 py-2 text-xs text-[#1F2937] bg-slate-50 rounded-xl border border-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#2E7D32] focus:bg-white transition-all placeholder-slate-400"
              />
            </div>
          </div>

          {/* User Controls */}
          <div className="flex items-center gap-3">
            <Link to="/orders" className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 px-3 py-2 rounded-xl transition-all">
              <Receipt className="w-4 h-4 text-[#2E7D32]" />
              <span className="hidden sm:inline">My Orders</span>
            </Link>

            <div className="flex items-center gap-2 bg-[#E8F5E9] border border-emerald-200 px-3 py-1.5 rounded-xl text-xs text-[#2E7D32] font-bold">
              <User className="w-4 h-4" />
              <span>{user?.name?.split(' ')[0]}</span>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 px-3 py-2 rounded-xl transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Banner Section */}
      <section className="bg-gradient-to-b from-[#E8F5E9]/60 to-[#F8FAF8] border-b border-[#E5E7EB] py-12 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-emerald-200 text-[#2E7D32] text-xs font-bold uppercase tracking-wider mb-4 shadow-2xs">
            <Sparkles className="w-4 h-4 text-[#2E7D32]" />
            <span>Local Flash Sale Marketplace</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-[#1F2937] tracking-tight mb-3">
            Save food. Save money.
          </h1>

          <p className="text-base sm:text-lg text-[#6B7280] max-w-2xl mx-auto mb-8 leading-relaxed">
            Discover fresh deals from local stores near you before products reach their expiry date.
          </p>

          {/* Mobile Search Input */}
          <div className="md:hidden max-w-md mx-auto relative mb-4">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search local flash sales..."
              className="w-full pl-10 pr-4 py-2.5 text-xs text-[#1F2937] bg-white rounded-xl border border-[#E5E7EB] focus:ring-2 focus:ring-[#2E7D32]"
            />
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-8">
        {/* Category Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-[#2E7D32] text-white shadow-sm'
                  : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:border-slate-300 hover:text-[#1F2937]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Section Heading */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-[#1F2937] flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#2E7D32]" />
              <span>Active Flash Sales Near You</span>
            </h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Hyper-local discounts updated automatically based on batch expiry.
            </p>
          </div>

          <span className="text-xs font-semibold text-[#2E7D32] bg-[#E8F5E9] px-3 py-1 rounded-full border border-emerald-200">
            {filteredDeals.length} Deals Available
          </span>
        </div>

        {/* Flash Sale Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredDeals.map((deal) => (
            <Card key={deal.id} hover padding="p-0" className="overflow-hidden flex flex-col justify-between">
              {/* Product Header Graphic / Image */}
              <div className={`h-44 ${deal.imageBg} relative p-4 flex flex-col justify-between`}>
                <span className="self-end px-2.5 py-1 rounded-full text-xs font-extrabold bg-[#2E7D32] text-white shadow-sm">
                  {deal.discount}
                </span>

                <div className="bg-white/90 backdrop-blur-xs p-2.5 rounded-xl border border-white/40">
                  <span className="text-[10px] font-extrabold uppercase text-[#2E7D32] tracking-wider block">
                    {deal.category}
                  </span>
                  <p className="text-xs font-bold text-[#1F2937] truncate">{deal.name}</p>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="font-extrabold text-base text-[#1F2937] leading-snug line-clamp-1">
                    {deal.name}
                  </h3>
                  <p className="text-xs font-semibold text-[#6B7280] flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-[#2E7D32] shrink-0" />
                    <span>{deal.store}</span>
                    <span className="text-slate-300">•</span>
                    <span>{deal.distance}</span>
                  </p>
                </div>

                {/* Price Block */}
                <div className="flex items-baseline gap-2 bg-[#F8FAF8] p-3 rounded-xl border border-[#E5E7EB]">
                  <span className="text-2xl font-black text-[#2E7D32]">₹{deal.salePrice}</span>
                  <span className="text-sm font-semibold text-[#6B7280] line-through">₹{deal.originalPrice}</span>
                  <span className="text-[11px] font-bold text-emerald-700 ml-auto bg-[#E8F5E9] px-2 py-0.5 rounded">
                    Save ₹{deal.originalPrice - deal.salePrice}
                  </span>
                </div>

                {/* Meta details */}
                <div className="flex items-center justify-between text-xs text-[#6B7280] pt-1">
                  <span className="flex items-center gap-1 font-semibold text-amber-700">
                    <Clock3 className="w-3.5 h-3.5" />
                    {deal.expiry}
                  </span>
                  <span className="font-bold text-slate-700">{deal.quantity} left</span>
                </div>

                {/* Action CTA */}
                <Button variant="primary" size="sm" className="w-full">
                  View Deal <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#E5E7EB] py-6 text-center text-xs text-[#6B7280]">
        SmartShelf &copy; {new Date().getFullYear()} — Save food. Save money. (Customer Marketplace UI Active)
      </footer>
    </div>
  );
}

export default CustomerDashboard;
