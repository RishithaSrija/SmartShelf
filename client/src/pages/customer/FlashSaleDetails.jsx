import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import flashSaleService from '../../services/flashSaleService';
import orderService from '../../services/orderService';
import { useAuth } from '../../context/AuthContext';

// Layout & UI Components
import Logo from '../../components/common/Logo';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';

// Icons
import {
  Zap,
  ArrowLeft,
  Store,
  MapPin,
  Clock,
  Phone,
  Building,
  CheckCircle2,
  ShieldCheck,
  ShoppingBag,
  Info,
  X,
  Minus,
  Plus,
  AlertCircle
} from 'lucide-react';

function FlashSaleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);

  // Reservation Modal State
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [reserveQty, setReserveQty] = useState(1);
  const [isReserving, setIsReserving] = useState(false);
  const [reserveError, setReserveError] = useState('');

  const fetchDeal = useCallback(async () => {
    try {
      setLoading(true);
      const res = await flashSaleService.getFlashSaleById(id);
      if (res.success && res.data) {
        setDeal(res.data);
      }
    } catch (err) {
      console.error('[FlashSaleDetails] Fetch error:', err);
      addToast('Flash sale deal not found or has expired.', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    fetchDeal();
  }, [fetchDeal]);

  const handleOpenReserveModal = () => {
    if (!isAuthenticated) {
      addToast('Please sign in as a customer to reserve deals.', 'info');
      navigate('/login');
      return;
    }
    setReserveQty(1);
    setReserveError('');
    setIsReserveModalOpen(true);
  };

  const handleQtyChange = (delta) => {
    setReserveQty((prev) => {
      const next = prev + delta;
      if (next < 1) return 1;
      if (deal && next > deal.availableQuantity) return deal.availableQuantity;
      return next;
    });
  };

  const handleConfirmReservation = async (e) => {
    e.preventDefault();
    setReserveError('');

    if (!deal) return;

    if (reserveQty < 1) {
      setReserveError('Quantity must be at least 1 unit.');
      return;
    }

    if (reserveQty > deal.availableQuantity) {
      setReserveError(`Only ${deal.availableQuantity} units are available.`);
      return;
    }

    try {
      setIsReserving(true);
      const res = await orderService.createOrder({
        flashSaleId: deal._id || deal.id,
        quantity: reserveQty
      });

      if (res.success && res.data) {
        addToast('Deal reserved successfully!', 'success');
        setIsReserveModalOpen(false);
        navigate(`/orders/success/${res.data._id || res.data.id}`);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to reserve deal.';
      setReserveError(msg);
      addToast(msg, 'error');
    } finally {
      setIsReserving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#1F2937] flex flex-col font-sans selection:bg-[#2E7D32] selection:text-white">
      {/* Header Bar */}
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <Link to="/marketplace">
            <Logo showTagline size="md" />
          </Link>

          <Button
            variant="ghost"
            size="sm"
            icon={ArrowLeft}
            onClick={() => navigate('/marketplace')}
          >
            Back to Marketplace
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <Card padding="p-8">
            <Skeleton height="h-64" rounded="rounded-2xl" />
            <Skeleton height="h-8" width="w-1/2" className="mt-6" />
            <Skeleton height="h-4" width="w-1/3" className="mt-2" />
          </Card>
        ) : !deal ? (
          <div className="text-center py-16">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Deal Not Found</h2>
            <p className="text-xs text-slate-500 mb-6">This flash sale may have expired or sold out.</p>
            <Button variant="primary" size="sm" onClick={() => navigate('/marketplace')}>
              Browse All Deals
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Col: Image & Deal Overview */}
            <div className="lg:col-span-2 space-y-6">
              <Card padding="p-0" className="overflow-hidden">
                <div className="relative h-72 sm:h-96 bg-slate-100 flex items-center justify-center">
                  {deal.productId?.image ? (
                    <img
                      src={deal.productId.image}
                      alt={deal.productId?.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Zap className="w-20 h-20 text-emerald-600/30" />
                  )}

                  <div className="absolute top-4 left-4 bg-[#2E7D32] text-white text-xs font-black uppercase px-3 py-1 rounded-xl shadow-lg border border-emerald-400">
                    {deal.discountPercentage}% OFF
                  </div>

                  <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-xs text-white text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>{deal.daysRemaining === 0 ? 'Expires Today' : `${deal.daysRemaining} days remaining`}</span>
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-[#2E7D32] uppercase">
                    <Store className="w-4 h-4" />
                    <span>{deal.storeId?.name}</span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-black text-[#1F2937] leading-tight">
                    {deal.title}
                  </h1>

                  <p className="text-xs text-slate-500">
                    Category: <span className="font-bold text-slate-800">{deal.productId?.category}</span> • Unit: <span className="font-bold text-slate-800">{deal.productId?.unit}</span>
                  </p>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                    <h4 className="font-bold text-slate-900 mb-1">Deal Description</h4>
                    <p>{deal.description || deal.productId?.description || 'Fresh item offered at a special discount prior to expiry.'}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Col: Pricing & Store Info Sidebar */}
            <div className="space-y-6">
              <Card padding="p-6 sm:p-8" className="border-t-4 border-t-[#2E7D32]">
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Flash Sale Price</span>
                    <div className="flex items-baseline gap-3 mt-1">
                      <span className="text-3xl font-black text-[#2E7D32]">₹{deal.salePrice}</span>
                      <span className="text-base text-slate-400 line-through font-bold">₹{deal.originalPrice}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#E8F5E9] text-[#2E7D32] text-xs font-bold border border-emerald-200">
                    You save ₹{(deal.originalPrice - deal.salePrice).toFixed(2)} ({deal.discountPercentage}% OFF)
                  </div>

                  <div className="flex items-center justify-between text-xs py-2 border-t border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Available Quantity</span>
                    <span className="font-extrabold text-slate-900">{deal.availableQuantity} units</span>
                  </div>

                  <Button
                    variant="primary"
                    size="md"
                    className="w-full justify-center text-sm py-3 shadow-md"
                    disabled={deal.availableQuantity <= 0 || deal.status !== 'ACTIVE'}
                    onClick={handleOpenReserveModal}
                  >
                    {deal.availableQuantity <= 0 ? 'Sold Out' : 'Reserve Deal'}
                  </Button>

                  <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                    Reserve online and pick up at the store. Payment collected at pickup.
                  </p>
                </div>
              </Card>

              {/* Store Details Card */}
              <Card padding="p-6" className="space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <Store className="w-4 h-4 text-[#2E7D32]" />
                  <span>Store Information</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Store Name</span>
                    <p className="font-bold text-slate-900">{deal.storeId?.name}</p>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Business Type</span>
                    <Badge variant="info">{deal.storeId?.businessType}</Badge>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Address</span>
                    <p className="font-semibold text-slate-700 flex items-start gap-1.5 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{deal.storeId?.address || 'Local address'}</span>
                    </p>
                  </div>

                  {deal.storeId?.phone && (
                    <div>
                      <span className="text-slate-400 block font-medium">Phone</span>
                      <p className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{deal.storeId.phone}</span>
                      </p>
                    </div>
                  )}

                  {deal.storeId?.openingHours && (
                    <div>
                      <span className="text-slate-400 block font-medium">Opening Hours</span>
                      <p className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{deal.storeId.openingHours}</span>
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* Reservation Confirmation Modal */}
      {isReserveModalOpen && deal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#E5E7EB] flex items-center justify-between bg-slate-50/75">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center border border-emerald-200">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F2937]">Reserve Flash Sale Deal</h3>
                  <p className="text-[11px] text-[#6B7280]">30-minute guaranteed hold</p>
                </div>
              </div>
              <button
                onClick={() => setIsReserveModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleConfirmReservation} className="p-5 space-y-4">
              {reserveError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-800 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{reserveError}</span>
                </div>
              )}

              {/* Product Brief */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                {deal.productId?.image ? (
                  <img
                    src={deal.productId.image}
                    alt={deal.productName}
                    className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-emerald-100 text-[#2E7D32] flex items-center justify-center shrink-0">
                    <Zap className="w-6 h-6" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-[#1F2937] truncate">{deal.title}</h4>
                  <p className="text-[11px] text-[#6B7280] truncate">{deal.storeId?.name}</p>
                  <p className="text-xs font-extrabold text-[#2E7D32]">₹{deal.salePrice} each</p>
                </div>
              </div>

              {/* Quantity Picker */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-[#1F2937]">Select Quantity</span>
                  <span className="text-[#6B7280]">
                    Available: <strong className="text-slate-900">{deal.availableQuantity}</strong>
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl border border-[#E5E7EB] bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => handleQtyChange(-1)}
                    disabled={reserveQty <= 1}
                    className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <span className="text-base font-black text-slate-900 font-mono">
                    {reserveQty}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleQtyChange(1)}
                    disabled={reserveQty >= deal.availableQuantity}
                    className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Price Calculation Box */}
              <div className="p-3.5 rounded-xl bg-emerald-50/75 border border-emerald-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Unit Price:</span>
                  <span className="font-semibold">₹{deal.salePrice}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Quantity:</span>
                  <span className="font-semibold">{reserveQty}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-[#2E7D32] pt-1.5 border-t border-emerald-200">
                  <span>Total Due at Store:</span>
                  <span>₹{(deal.salePrice * reserveQty).toFixed(2)}</span>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Your reservation will hold this inventory for <strong>30 minutes</strong>. Please collect and pay at the store before expiry.
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsReserveModalOpen(false)}
                  disabled={isReserving}
                  className="flex-1 justify-center"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={isReserving}
                  className="flex-1 justify-center"
                >
                  {isReserving ? 'Reserving...' : 'Confirm Reservation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default FlashSaleDetails;
