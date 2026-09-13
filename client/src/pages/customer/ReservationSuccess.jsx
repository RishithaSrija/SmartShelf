import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import orderService from '../../services/orderService';
import Logo from '../../components/common/Logo';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import ProductImage from '../../components/common/ProductImage';
import { useToast } from '../../components/ui/Toast';
import {
  CheckCircle2,
  Clock,
  MapPin,
  Store,
  ArrowRight,
  ShoppingBag,
  Receipt,
  AlertCircle,
  Copy,
  ExternalLink
} from 'lucide-react';

function ReservationSuccess() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      const res = await orderService.getOrderById(id);
      if (res.success && res.data) {
        setOrder(res.data);
      }
    } catch (err) {
      console.error('[ReservationSuccess] Fetch order error:', err);
      addToast('Unable to load reservation details.', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Live countdown timer calculation
  useEffect(() => {
    if (!order || !order.reservationExpiresAt || order.status !== 'PENDING') {
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(order.reservationExpiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('00:00 (Expired)');
        setIsExpired(true);
      } else {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [order]);

  const copyOrderNumber = () => {
    if (order?.orderNumber) {
      navigator.clipboard.writeText(order.orderNumber);
      addToast('Order number copied to clipboard!', 'success');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAF8] flex flex-col items-center justify-center p-6 text-slate-700">
        <Skeleton height="h-10" width="w-10" rounded="rounded-xl" className="mb-3" />
        <p className="text-sm font-semibold text-[#6B7280]">Loading reservation confirmation...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#F8FAF8] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold text-slate-900 mb-1">Reservation Not Found</h2>
        <p className="text-xs text-slate-500 mb-6">Could not retrieve order details.</p>
        <Button variant="primary" size="sm" onClick={() => navigate('/marketplace')}>
          Return to Marketplace
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#1F2937] flex flex-col font-sans selection:bg-[#2E7D32] selection:text-white">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-30 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <Link to="/">
            <Logo showTagline size="md" />
          </Link>
          <Link to="/orders">
            <Button variant="ghost" size="sm" icon={ShoppingBag}>
              My Orders
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Confirmation Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-10 space-y-6">
        {/* Success Header Banner */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center mx-auto mb-3 shadow-md border-2 border-emerald-300">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1F2937] tracking-tight">
            Deal Reserved Successfully!
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] max-w-md mx-auto">
            Your inventory has been secured at the store. Please arrive before the reservation expires.
          </p>
        </div>

        {/* Live Reservation Countdown Timer Card */}
        <Card padding="p-5" className="bg-emerald-900 text-white text-center border-none shadow-lg">
          <div className="flex items-center justify-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-1">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Reservation Hold Time</span>
          </div>
          <div className="text-3xl sm:text-4xl font-black tracking-widest font-mono text-white">
            {order.status === 'PENDING' ? timeLeft || '30:00' : order.status}
          </div>
          <p className="text-[11px] text-emerald-200 mt-1 font-medium">
            {order.status === 'PENDING' && !isExpired
              ? 'Item is held exclusively for you. Present order number at pickup.'
              : `Order status: ${order.status}`}
          </p>
        </Card>

        {/* Order Details Summary Card */}
        <Card padding="p-6 sm:p-8" className="space-y-5 border border-[#E5E7EB]">
          {/* Order Number Row */}
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
            <div>
              <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider block">
                Order Number
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-base font-extrabold text-[#1F2937]">
                  {order.orderNumber}
                </span>
                <button
                  onClick={copyOrderNumber}
                  title="Copy Order Number"
                  className="p-1 text-slate-400 hover:text-[#2E7D32] rounded transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <Badge
              variant={
                order.status === 'CONFIRMED' || order.status === 'COMPLETED'
                  ? 'AVAILABLE'
                  : order.status === 'PENDING'
                  ? 'info'
                  : 'EXPIRED'
              }
            >
              {order.status}
            </Badge>
          </div>

          {/* Reserved Item Summary */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden shrink-0">
              <ProductImage
                src={order.productId?.imageUrl || order.productId?.image}
                alt={order.productName}
                category={order.productId?.category}
                aspectRatio="square"
                className="w-full h-full"
              />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-sm text-[#1F2937] truncate">
                {order.productName}
              </h3>
              <p className="text-xs text-[#6B7280] flex items-center gap-1 mt-0.5">
                <Store className="w-3 h-3 text-[#2E7D32]" />
                <span className="truncate">{order.storeName}</span>
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Qty: <span className="font-bold text-slate-900">{order.quantity} units</span> × ₹{order.unitPrice}
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-xs text-slate-500 font-medium block">Total Due</span>
              <span className="text-lg font-black text-[#2E7D32]">₹{order.totalPrice}</span>
            </div>
          </div>

          {/* Store Pickup Notice */}
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1">
            <h4 className="font-bold flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-amber-700" />
              <span>Store Pickup &amp; Payment</span>
            </h4>
            <p className="text-[11px] leading-relaxed text-amber-800">
              Online payment is not required now. Pay <strong>₹{order.totalPrice}</strong> directly at <strong>{order.storeName}</strong> upon collecting your item.
            </p>
            {order.storeId?.address && (
              <p className="text-[11px] font-semibold text-slate-700 pt-1 flex items-start gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <span>{order.storeId.address}</span>
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Button
              variant="primary"
              size="md"
              icon={Receipt}
              onClick={() => navigate(`/orders/${order._id}`)}
              className="w-full sm:flex-1 justify-center"
            >
              View Order Details
            </Button>
            <Button
              variant="outline"
              size="md"
              icon={ShoppingBag}
              onClick={() => navigate('/marketplace')}
              className="w-full sm:flex-1 justify-center"
            >
              Back to Marketplace
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
}

export default ReservationSuccess;
