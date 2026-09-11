import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import orderService from '../../services/orderService';
import Logo from '../../components/common/Logo';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import {
  ArrowLeft,
  Receipt,
  Store,
  MapPin,
  Phone,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Copy,
  XCircle,
  Info,
  ShieldCheck,
  ShoppingBag
} from 'lucide-react';

function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState('');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Changed my mind');
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      const res = await orderService.getOrderById(id);
      if (res.success && res.data) {
        setOrder(res.data);
      }
    } catch (err) {
      console.error('[OrderDetails] Fetch error:', err);
      addToast('Order not found or access denied.', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Live timer for PENDING orders
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

  const handleCancelOrder = async () => {
    try {
      setIsCancelling(true);
      const res = await orderService.cancelOrder(order._id, cancelReason);
      if (res.success && res.data) {
        addToast('Reservation cancelled successfully.', 'success');
        setOrder(res.data);
        setIsCancelModalOpen(false);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to cancel reservation.';
      addToast(msg, 'error');
    } finally {
      setIsCancelling(false);
    }
  };

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
        <p className="text-sm font-semibold text-[#6B7280]">Loading order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#F8FAF8] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold text-slate-900 mb-1">Order Not Found</h2>
        <p className="text-xs text-slate-500 mb-6">Could not load this order.</p>
        <Button variant="primary" size="sm" onClick={() => navigate('/orders')}>
          Back to Orders
        </Button>
      </div>
    );
  }

  const isPending = order.status === 'PENDING';

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#1F2937] flex flex-col font-sans selection:bg-[#2E7D32] selection:text-white">
      {/* Top Header */}
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-30 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <Link to="/">
            <Logo showTagline size="md" />
          </Link>
          <Button
            variant="ghost"
            size="sm"
            icon={ArrowLeft}
            onClick={() => navigate('/orders')}
          >
            Back to My Orders
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 space-y-6">
        {/* Page Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-[#1F2937] tracking-tight">
                Order {order.orderNumber}
              </h1>
              <button
                onClick={copyOrderNumber}
                title="Copy Order Number"
                className="p-1 text-slate-400 hover:text-[#2E7D32] transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Placed on {new Date(order.createdAt).toLocaleString('en-IN')}
            </p>
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

        {/* Live Timer Banner for PENDING holds */}
        {isPending && (
          <div className="p-4 rounded-2xl bg-emerald-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-800 text-emerald-300 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-white">Active Reservation Hold</h4>
                <p className="text-xs text-emerald-200">
                  Item is reserved for you. Please complete store pickup before time runs out.
                </p>
              </div>
            </div>

            <div className="text-xl sm:text-2xl font-black font-mono text-amber-300 bg-emerald-950/80 px-4 py-1.5 rounded-xl border border-emerald-700">
              {timeLeft || '30:00'}
            </div>
          </div>
        )}

        {/* Order Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Reserved Product & Pricing Breakdown */}
          <div className="lg:col-span-2 space-y-6">
            <Card padding="p-6" className="space-y-4">
              <h3 className="text-sm font-extrabold text-[#1F2937] border-b border-[#E5E7EB] pb-3 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#2E7D32]" />
                <span>Reserved Item Details</span>
              </h3>

              <div className="flex items-start gap-4">
                {order.productId?.image ? (
                  <img
                    src={order.productId.image}
                    alt={order.productName}
                    className="w-20 h-20 rounded-xl object-cover border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-emerald-50 text-[#2E7D32] flex items-center justify-center font-bold shrink-0 border border-emerald-200">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                )}

                <div className="flex-1 min-w-0 space-y-1">
                  <h4 className="text-base font-extrabold text-[#1F2937]">
                    {order.productName}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Category: <span className="font-semibold text-slate-700">{order.productId?.category || 'General'}</span>
                    {order.productId?.unit && ` • Unit: ${order.productId.unit}`}
                  </p>
                  <p className="text-xs text-slate-500">
                    Unit Price: <span className="font-bold text-slate-900">₹{order.unitPrice}</span>
                  </p>
                </div>
              </div>

              {/* Price Calculation Box */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Unit Price:</span>
                  <span className="font-semibold">₹{order.unitPrice}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Reserved Quantity:</span>
                  <span className="font-semibold">{order.quantity} units</span>
                </div>
                <div className="flex justify-between text-sm font-black text-[#2E7D32] pt-2 border-t border-slate-200">
                  <span>Total Amount (Pay at Store):</span>
                  <span>₹{order.totalPrice}</span>
                </div>
              </div>

              {order.cancellationReason && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
                  <strong>Reason:</strong> {order.cancellationReason}
                </div>
              )}
            </Card>

            {/* Action Bar for Pending Orders */}
            {isPending && (
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  size="md"
                  icon={XCircle}
                  onClick={() => setIsCancelModalOpen(true)}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  Cancel Reservation
                </Button>
              </div>
            )}
          </div>

          {/* Right Column: Store Details & Pickup Instructions */}
          <div className="space-y-6">
            <Card padding="p-6" className="space-y-4">
              <h3 className="text-sm font-extrabold text-[#1F2937] border-b border-[#E5E7EB] pb-3 flex items-center gap-2">
                <Store className="w-4 h-4 text-[#2E7D32]" />
                <span>Pickup Store</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Store Name</span>
                  <p className="font-bold text-slate-900 text-sm">{order.storeName}</p>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Store Address</span>
                  <p className="font-semibold text-slate-700 flex items-start gap-1.5 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{order.storeId?.address || 'Local Retail Store'}</span>
                  </p>
                </div>

                {order.storeId?.phone && (
                  <div>
                    <span className="text-slate-400 block font-medium">Phone Number</span>
                    <p className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{order.storeId.phone}</span>
                    </p>
                  </div>
                )}

                {order.storeId?.openingHours && (
                  <div>
                    <span className="text-slate-400 block font-medium">Opening Hours</span>
                    <p className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{order.storeId.openingHours}</span>
                    </p>
                  </div>
                )}
              </div>
            </Card>

            <Card padding="p-5" className="bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1.5">
              <h4 className="font-bold flex items-center gap-1.5 text-amber-800">
                <Info className="w-4 h-4 text-amber-700" />
                <span>Payment &amp; Collection</span>
              </h4>
              <p className="text-[11px] leading-relaxed text-amber-800">
                Payment is not collected online. Please present this order number (<strong>{order.orderNumber}</strong>) at the store counter to complete payment and receive your item.
              </p>
            </Card>
          </div>
        </div>
      </main>

      {/* Cancellation Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">Cancel Reservation?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Cancelling will release your reserved stock ({order.quantity} units) back to the store inventory.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Reason for cancellation
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="Changed my mind">Changed my mind</option>
                <option value="Cannot visit store before expiry">Cannot visit store before expiry</option>
                <option value="Ordered wrong item or quantity">Ordered wrong item or quantity</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => setIsCancelModalOpen(false)}
                disabled={isCancelling}
                className="flex-1 justify-center"
              >
                Keep Reservation
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={handleCancelOrder}
                loading={isCancelling}
                className="flex-1 justify-center bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderDetails;
