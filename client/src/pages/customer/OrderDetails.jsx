import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import orderService from '../../services/orderService';
import paymentService, { loadRazorpayScript } from '../../services/paymentService';
import DemoPaymentModal from '../../components/payment/DemoPaymentModal';
import { useAuth } from '../../context/AuthContext';
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
  ShoppingBag,
  CreditCard,
  Lock,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';


function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState('');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Changed my mind');
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRetryingPayment, setIsRetryingPayment] = useState(false);
  const [isDemoPaymentOpen, setIsDemoPaymentOpen] = useState(false);

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

  const handleRetryPayment = async () => {
    try {
      const isDemo = order.isDemoPayment || order.paymentProvider === 'DEMO' || !order.razorpayOrderId;
      if (isDemo) {
        setIsDemoPaymentOpen(true);
        return;
      }

      setIsRetryingPayment(true);
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Razorpay SDK could not be loaded. Please check your connection.');
      }

      const res = await paymentService.createPaymentOrder({ orderId: order._id });
      if (!res.success) {
        throw new Error(res.message || 'Unable to initialize Razorpay checkout');
      }

      const rzpData = res.data.razorpay || {};
      const keyId = rzpData.keyId || (await paymentService.getRazorpayKey());

      const options = {
        key: keyId,
        amount: rzpData.amount || Math.round(order.totalPrice * 100),
        currency: rzpData.currency || 'INR',
        name: 'SmartShelf',
        description: `Order #${order.orderNumber}`,
        order_id: rzpData.orderId || order.razorpayOrderId,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || ''
        },
        theme: {
          color: '#2E7D32'
        },
        handler: async function (response) {
          try {
            const verifyRes = await paymentService.verifyPayment({
              orderId: order._id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyRes.success) {
              addToast('Payment verified successfully!', 'success');
              fetchOrder();
            }
          } catch (verErr) {
            console.error('[OrderDetails] Retry payment verify error:', verErr);
            addToast('Payment verification failed.', 'error');
            fetchOrder();
          }
        }
      };

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      addToast(err.message || 'Failed to retry payment', 'error');
    } finally {
      setIsRetryingPayment(false);
    }
  };


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
        {/* Header Badges */}
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

          <div className="flex items-center gap-2">
            {order.paymentMethod === 'ONLINE' && (
              <Badge variant={order.paymentStatus === 'CAPTURED' ? 'AVAILABLE' : order.paymentStatus === 'FAILED' ? 'danger' : 'warning'}>
                {order.paymentStatus === 'CAPTURED' ? '✓ PAID ONLINE' : `PAYMENT ${order.paymentStatus}`}
              </Badge>
            )}

            <Badge
              variant={
                order.status === 'CONFIRMED' || order.status === 'COMPLETED' || order.status === 'ACCEPTED'
                  ? 'AVAILABLE'
                  : order.status === 'REJECTED' || order.status === 'CANCELLED' || order.status === 'EXPIRED'
                  ? 'danger'
                  : 'info'
              }
            >
              {order.status === 'WAITING_FOR_STORE_ACCEPTANCE' ? 'WAITING FOR STORE' : order.status}
            </Badge>
          </div>
        </div>

        {/* Order Lifecycle Timeline */}
        <Card padding="p-5" className="bg-white border border-[#E5E7EB] shadow-2xs">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#2E7D32]" />
            <span>Order &amp; Payment Status Timeline</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* Step 1: Placed */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#2E7D32] flex items-center justify-center font-bold text-xs shrink-0">
                ✓
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Order Placed</p>
                <p className="text-[11px] text-slate-500">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>

            {/* Step 2: Payment */}
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                order.paymentStatus === 'CAPTURED'
                  ? 'bg-emerald-100 text-[#2E7D32]'
                  : order.paymentMethod === 'PAY_AT_STORE'
                  ? 'bg-blue-100 text-blue-700'
                  : order.paymentStatus === 'FAILED'
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {order.paymentStatus === 'CAPTURED' ? '✓' : order.paymentMethod === 'PAY_AT_STORE' ? '✓' : order.paymentStatus === 'FAILED' ? '✕' : '⏳'}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  {order.paymentMethod === 'ONLINE'
                    ? (order.paymentStatus === 'CAPTURED' ? 'Payment Verified' : order.paymentStatus === 'FAILED' ? 'Payment Failed' : 'Payment Pending')
                    : 'Pay at Store (COD)'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {order.paymentMethod === 'ONLINE' ? 'Razorpay Secure' : 'Pay upon collection'}
                </p>
              </div>
            </div>

            {/* Step 3: Store Confirmation */}
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                order.status === 'ACCEPTED' || order.status === 'CONFIRMED' || order.status === 'COMPLETED'
                  ? 'bg-emerald-100 text-[#2E7D32]'
                  : order.status === 'REJECTED'
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {order.status === 'ACCEPTED' || order.status === 'CONFIRMED' || order.status === 'COMPLETED'
                  ? '✓'
                  : order.status === 'REJECTED'
                  ? '✕'
                  : '⏳'}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  {order.status === 'ACCEPTED' || order.status === 'CONFIRMED'
                    ? 'Store Accepted'
                    : order.status === 'REJECTED'
                    ? 'Store Declined'
                    : order.status === 'COMPLETED'
                    ? 'Store Confirmed'
                    : 'Awaiting Store'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {order.status === 'WAITING_FOR_STORE_ACCEPTANCE'
                    ? 'Waiting for response'
                    : order.status === 'REJECTED'
                    ? (order.rejectionReason || 'Declined by store')
                    : 'Confirmed by store'}
                </p>
              </div>
            </div>

            {/* Step 4: Fulfillment / Refund */}
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                order.status === 'COMPLETED'
                  ? 'bg-emerald-100 text-[#2E7D32]'
                  : order.status === 'REJECTED' && order.paymentStatus === 'REFUNDED'
                  ? 'bg-emerald-100 text-[#2E7D32]'
                  : order.status === 'REJECTED'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-400'
              }`}>
                {order.status === 'COMPLETED' || (order.status === 'REJECTED' && order.paymentStatus === 'REFUNDED')
                  ? '✓'
                  : order.status === 'REJECTED'
                  ? '⏳'
                  : '○'}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  {order.status === 'REJECTED'
                    ? (order.paymentStatus === 'REFUNDED' ? 'Refund Completed' : 'Refund Initiated')
                    : order.status === 'COMPLETED'
                    ? 'Fulfilled'
                    : 'Ready for Pickup'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {order.status === 'REJECTED'
                    ? (order.refundId ? `ID: ${order.refundId.slice(0, 14)}...` : 'Original payment method')
                    : 'Counter pickup'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Payment Failure / Retry Banner */}
        {order.paymentMethod === 'ONLINE' && (order.paymentStatus === 'FAILED' || order.paymentStatus === 'PENDING') && order.status === 'PENDING_PAYMENT' && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <h4 className="text-xs font-bold">Online Payment Incomplete</h4>
                <p className="text-[11px] text-amber-800">
                  Complete payment via Razorpay to submit your order to {order.storeName}.
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={CreditCard}
              loading={isRetryingPayment}
              onClick={handleRetryPayment}
              className="text-xs whitespace-nowrap"
            >
              Pay Now (₹{order.totalPrice})
            </Button>
          </div>
        )}

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
                <span>Order Item Details</span>
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-base font-extrabold text-[#1F2937]">
                      {order.productName}
                    </h4>
                    {order.orderType === 'INGREDIENT_BASKET' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300">
                        🍬 Ingredient Basket: {order.recipeName || 'Recipe'}
                      </span>
                    )}
                  </div>
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
                  <span>Total Amount:</span>
                  <span>₹{order.totalPrice}</span>
                </div>
              </div>

              {order.rejectionReason && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
                  <strong>Declined Reason:</strong> {order.rejectionReason}
                </div>
              )}

              {order.cancellationReason && !order.rejectionReason && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
                  <strong>Cancellation Reason:</strong> {order.cancellationReason}
                </div>
              )}
            </Card>

            {/* Visual Order Lifecycle Timeline Card */}
            <Card padding="p-6" className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <h3 className="text-sm font-extrabold text-[#1F2937] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#2E7D32]" />
                  <span>Order Progress Timeline</span>
                </h3>
                {order.isDemoPayment && (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                    Demo Mode Flow
                  </span>
                )}
              </div>

              {/* Step 1: Order Placed */}
              <div className="relative pl-6 pb-5 border-l-2 border-emerald-500">
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
                <div className="text-xs">
                  <p className="font-extrabold text-slate-900">Order Placed &amp; 30-Min Hold Active</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Stock reserved at {order.storeName} ({new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </p>
                </div>
              </div>

              {/* Step 2: Payment Verification */}
              <div className={`relative pl-6 pb-5 border-l-2 ${
                order.paymentStatus === 'CAPTURED' || order.paymentStatus === 'REFUNDED'
                  ? 'border-emerald-500'
                  : order.paymentStatus === 'FAILED'
                  ? 'border-rose-400'
                  : 'border-slate-200'
              }`}>
                <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white ${
                  order.paymentStatus === 'CAPTURED' || order.paymentStatus === 'REFUNDED'
                    ? 'bg-emerald-500 text-white'
                    : order.paymentStatus === 'FAILED'
                    ? 'bg-rose-500 text-white'
                    : 'bg-amber-400 text-white'
                }`}>
                  {order.paymentStatus === 'CAPTURED' || order.paymentStatus === 'REFUNDED' ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : order.paymentStatus === 'FAILED' ? (
                    <XCircle className="w-3 h-3" />
                  ) : (
                    <Clock className="w-2.5 h-2.5" />
                  )}
                </div>
                <div className="text-xs">
                  <p className="font-extrabold text-slate-900">
                    {order.paymentStatus === 'CAPTURED' || order.paymentStatus === 'REFUNDED'
                      ? 'Payment Successful (Demo Captured)'
                      : order.paymentStatus === 'FAILED'
                      ? 'Payment Simulation Failed'
                      : 'Payment Pending Simulation'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {order.paymentStatus === 'CAPTURED' || order.paymentStatus === 'REFUNDED'
                      ? `Simulated payment of ₹${order.totalPrice} captured. No real money charged.`
                      : order.paymentStatus === 'FAILED'
                      ? 'Payment declined or simulated failure. You can retry payment above.'
                      : 'Complete simulated payment to forward order to store.'}
                  </p>
                </div>
              </div>

              {/* Step 3: Waiting for Store Acceptance */}
              <div className={`relative pl-6 pb-5 border-l-2 ${
                order.status === 'ACCEPTED' || order.status === 'COMPLETED'
                  ? 'border-emerald-500'
                  : order.status === 'REJECTED'
                  ? 'border-rose-400'
                  : order.status === 'WAITING_FOR_STORE_ACCEPTANCE'
                  ? 'border-amber-400'
                  : 'border-slate-200'
              }`}>
                <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white ${
                  order.status === 'ACCEPTED' || order.status === 'COMPLETED'
                    ? 'bg-emerald-500 text-white'
                    : order.status === 'REJECTED'
                    ? 'bg-rose-400 text-white'
                    : order.status === 'WAITING_FOR_STORE_ACCEPTANCE'
                    ? 'bg-amber-500 text-white animate-pulse'
                    : 'bg-slate-300 text-white'
                }`}>
                  {order.status === 'ACCEPTED' || order.status === 'COMPLETED' ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : order.status === 'REJECTED' ? (
                    <XCircle className="w-3 h-3" />
                  ) : (
                    <Clock className="w-2.5 h-2.5" />
                  )}
                </div>
                <div className="text-xs">
                  <p className="font-extrabold text-slate-900">Waiting for Store Confirmation</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {order.status === 'WAITING_FOR_STORE_ACCEPTANCE'
                      ? `Store owner alerted. Reviewing inventory for acceptance.`
                      : order.status === 'ACCEPTED' || order.status === 'COMPLETED'
                      ? 'Store owner confirmed availability.'
                      : order.status === 'REJECTED'
                      ? 'Store reviewed and declined the order.'
                      : 'Pending payment verification.'}
                  </p>
                </div>
              </div>

              {/* Step 4: Final Outcome (Accepted vs Rejected & Refunded) */}
              <div className="relative pl-6">
                <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full flex items-center justify-center border-2 border-white ${
                  order.status === 'ACCEPTED' || order.status === 'COMPLETED'
                    ? 'bg-emerald-500 text-white'
                    : order.status === 'REJECTED'
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-200 text-slate-400'
                }`}>
                  {order.status === 'ACCEPTED' || order.status === 'COMPLETED' ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : order.status === 'REJECTED' ? (
                    <XCircle className="w-3 h-3" />
                  ) : (
                    <span className="text-[9px] font-bold">4</span>
                  )}
                </div>
                <div className="text-xs">
                  {order.status === 'ACCEPTED' || order.status === 'COMPLETED' ? (
                    <div>
                      <p className="font-extrabold text-emerald-900">Order Accepted by Store</p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Your item is confirmed and packed. Please show order #{order.orderNumber} during pickup.
                      </p>
                    </div>
                  ) : order.status === 'REJECTED' ? (
                    <div>
                      <p className="font-extrabold text-rose-900">Order Rejected &amp; Demo Refund Processed</p>
                      <p className="text-[11px] text-rose-700 mt-0.5">
                        {order.rejectionReason || 'Store was unable to fulfill order'}.
                      </p>
                      {order.refundId && (
                        <div className="mt-2 p-2.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-900">
                          <p className="text-[11px] font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                            <span>Demo Refund Processed: ₹{order.refundAmount || order.totalPrice}</span>
                          </p>
                          <p className="font-mono text-[10px] text-purple-700 mt-0.5">ID: {order.refundId}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-slate-500">Store Decision Pending</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Store owner will accept or reject shortly.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Action Bar for Pending Orders */}
            {(order.status === 'PENDING' || order.status === 'PENDING_PAYMENT') && (
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  size="md"
                  icon={XCircle}
                  onClick={() => setIsCancelModalOpen(true)}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs"
                >
                  Cancel Order
                </Button>
              </div>
            )}
          </div>

          {/* Right Column: Payment & Store Details */}
          <div className="space-y-6">
            {/* Payment Summary Card */}
            <Card padding="p-6" className="space-y-4">
              <h3 className="text-sm font-extrabold text-[#1F2937] border-b border-[#E5E7EB] pb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#2E7D32]" />
                <span>Payment Summary</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Payment Method</span>
                  <div className="mt-0.5">
                    {order.isDemoPayment || order.paymentProvider === 'DEMO' ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900">Demo Payment</span>
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                          No real money
                        </span>
                      </div>
                    ) : order.paymentMethod === 'ONLINE' ? (
                      <span className="font-bold text-slate-900">Razorpay Online (UPI / Card)</span>
                    ) : (
                      <span className="font-bold text-slate-900">Cash on Delivery / Pay at Store</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Payment Status</span>
                  <div className="mt-1">
                    <Badge variant={order.paymentStatus === 'CAPTURED' || order.paymentStatus === 'REFUNDED' ? 'AVAILABLE' : order.paymentStatus === 'FAILED' ? 'danger' : 'warning'}>
                      {order.paymentStatus === 'CAPTURED' && (order.isDemoPayment || order.paymentProvider === 'DEMO')
                        ? 'CAPTURED (DEMO)'
                        : order.paymentStatus}
                    </Badge>
                  </div>
                </div>

                {order.demoPaymentDetails?.transactionId && (
                  <div>
                    <span className="text-slate-400 block font-medium">Demo Transaction ID</span>
                    <p className="font-mono font-semibold text-slate-700 mt-0.5 text-[11px] truncate">
                      {order.demoPaymentDetails.transactionId}
                    </p>
                  </div>
                )}

                {order.razorpayPaymentId && (
                  <div>
                    <span className="text-slate-400 block font-medium">Razorpay Payment ID</span>
                    <p className="font-mono font-semibold text-slate-700 mt-0.5 text-[11px] truncate">
                      {order.razorpayPaymentId}
                    </p>
                  </div>
                )}

                {order.refundId && (
                  <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900">
                    <span className="block font-bold text-[11px] uppercase tracking-wider">Demo Refund Processed</span>
                    <p className="font-mono text-[11px] mt-0.5 font-bold">ID: {order.refundId}</p>
                    <p className="text-[11px] text-purple-800 mt-1 font-semibold">
                      Refund Amount: ₹{order.refundAmount || order.totalPrice}
                    </p>
                    <p className="text-[10px] text-purple-700 mt-0.5">
                      Simulated refund credited back. No real money was charged.
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Store Details Card */}
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

      {/* Demo Payment Modal for Retrying Payment */}
      <DemoPaymentModal
        isOpen={isDemoPaymentOpen}
        onClose={() => setIsDemoPaymentOpen(false)}
        order={order}
        onSuccess={() => {
          setIsDemoPaymentOpen(false);
          addToast('Simulated payment captured! Order sent to store.', 'success');
          fetchOrder();
        }}
        onFailure={() => {
          setIsDemoPaymentOpen(false);
          addToast('Payment simulation failed.', 'info');
          fetchOrder();
        }}
      />
    </div>
  );
}

export default OrderDetails;
