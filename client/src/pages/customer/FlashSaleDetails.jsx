import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import flashSaleService from '../../services/flashSaleService';
import orderService from '../../services/orderService';
import paymentService, { loadRazorpayScript } from '../../services/paymentService';
import { useAuth } from '../../context/AuthContext';

// Layout & UI Components
import Logo from '../../components/common/Logo';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import ProductImage from '../../components/common/ProductImage';
import DemoPaymentModal from '../../components/payment/DemoPaymentModal';

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
  AlertCircle,
  CreditCard,
  Lock,
  Banknote
} from 'lucide-react';

function FlashSaleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { addToast } = useToast();


  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);

  // Reservation & Payment Modal State
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false);
  const [reserveQty, setReserveQty] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('ONLINE'); // 'ONLINE' or 'PAY_AT_STORE'
  const [isReserving, setIsReserving] = useState(false);
  const [reserveError, setReserveError] = useState('');
  const [demoPaymentOrder, setDemoPaymentOrder] = useState(null);
  const [isDemoPaymentOpen, setIsDemoPaymentOpen] = useState(false);

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
    setPaymentMethod('ONLINE');
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

      // 1. ONLINE PAYMENT FLOW
      if (paymentMethod === 'ONLINE') {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error('Could not load Razorpay payment gateway. Please check your internet connection or choose Cash on Delivery.');
        }

        const res = await orderService.createOrder({
          flashSaleId: deal._id || deal.id,
          quantity: reserveQty,
          paymentMethod: 'ONLINE'
        });

        if (!res.success || !res.data) {
          throw new Error(res.message || 'Failed to initialize payment');
        }

        const createdOrder = res.data;
        const isDemo = createdOrder.isDemoPayment || createdOrder.demoPayment || !createdOrder.razorpay?.orderId;

        if (isDemo) {
          setIsReserving(false);
          setIsReserveModalOpen(false);
          setDemoPaymentOrder(createdOrder);
          setIsDemoPaymentOpen(true);
          return;
        }

        const razorpayInfo = createdOrder.razorpay || {};
        const razorpayKey = razorpayInfo.keyId || (await paymentService.getRazorpayKey());

        const options = {
          key: razorpayKey,
          amount: razorpayInfo.amount || Math.round(deal.salePrice * reserveQty * 100),
          currency: razorpayInfo.currency || 'INR',
          name: 'SmartShelf',
          description: `${deal.title} (Qty: ${reserveQty})`,
          order_id: razorpayInfo.orderId,
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
              setIsReserving(true);
              const verifyRes = await paymentService.verifyPayment({
                orderId: createdOrder._id || createdOrder.id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              });

              if (verifyRes.success) {
                addToast('Payment verified successfully! Order sent to store.', 'success');
                setIsReserveModalOpen(false);
                navigate(`/orders/${createdOrder._id || createdOrder.id}`);
              }
            } catch (err) {
              console.error('[FlashSaleDetails] Verification error:', err);
              const msg = err.response?.data?.message || 'Payment verification failed.';
              addToast(msg, 'error');
              setIsReserveModalOpen(false);
              navigate(`/orders/${createdOrder._id || createdOrder.id}`);
            } finally {
              setIsReserving(false);
            }
          },
          modal: {
            ondismiss: function () {
              setIsReserving(false);
              addToast('Payment cancelled. You can complete it from your orders dashboard.', 'info');
              setIsReserveModalOpen(false);
              navigate(`/orders/${createdOrder._id || createdOrder.id}`);
            }
          }
        };

        if (window.Razorpay) {
          const rzp = new window.Razorpay(options);
          rzp.on('payment.failed', function (resp) {
            addToast(resp.error?.description || 'Payment failed', 'error');
            setIsReserving(false);
          });
          rzp.open();
        } else {
          throw new Error('Razorpay SDK is not available');
        }
        return;
      }

      // 2. CASH ON DELIVERY / PAY AT STORE FLOW
      const res = await orderService.createOrder({
        flashSaleId: deal._id || deal.id,
        quantity: reserveQty,
        paymentMethod: 'PAY_AT_STORE'
      });

      if (res.success && res.data) {
        addToast('Deal reserved successfully!', 'success');
        setIsReserveModalOpen(false);
        navigate(`/orders/success/${res.data._id || res.data.id}`);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to process order.';
      setReserveError(msg);
      addToast(msg, 'error');
    } finally {
      // For online payment, isReserving stays true while modal is opening
      if (paymentMethod !== 'ONLINE') {
        setIsReserving(false);
      }
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
                <div className="relative h-72 sm:h-96 bg-slate-100 flex items-center justify-center overflow-hidden">
                  <ProductImage
                    src={deal.productId?.imageUrl || deal.productId?.image}
                    alt={deal.productId?.name}
                    category={deal.productId?.category}
                    aspectRatio="wide"
                    className="w-full h-full object-cover"
                  />

                  <div className="absolute top-4 left-4 bg-[#2E7D32] text-white text-xs font-black uppercase px-3 py-1 rounded-xl shadow-lg border border-emerald-400 z-10">
                    {deal.discountPercentage}% OFF
                  </div>

                  <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-xs text-white text-xs font-bold px-3 py-1 rounded-xl flex items-center gap-1.5 z-10">
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

                  {/* Product Lifecycle Badge */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className={`text-xs font-black px-3 py-1 rounded-xl border flex items-center gap-1.5 ${
                      deal.daysRemaining <= 2
                        ? 'bg-amber-50 text-amber-900 border-amber-200'
                        : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                    }`}>
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {deal.daysRemaining <= 2
                          ? `Use Soon — ${deal.daysRemaining === 0 ? 'Expires Today' : deal.daysRemaining + ' days left'}`
                          : 'Good for Stocking & Processing'}
                      </span>
                    </span>

                    {deal.productId?.perishabilityTier && (
                      <span className="text-xs font-bold px-3 py-1 rounded-xl bg-purple-50 text-purple-900 border border-purple-200">
                        {deal.productId.perishabilityTier}
                      </span>
                    )}
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                    <h4 className="font-bold text-slate-900 mb-1">Deal Description</h4>
                    <p>{deal.description || deal.productId?.description || 'Fresh item offered at a special discount prior to expiry.'}</p>
                  </div>

                  {/* Business Applications & Common Uses Card */}
                  {(deal.productId?.businessUseCases?.length > 0 || deal.productId?.commonUses?.length > 0) && (
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50 via-indigo-50/50 to-white border border-purple-200/80 space-y-2.5">
                      <div className="flex items-center gap-2 text-xs font-black uppercase text-purple-900 tracking-wider">
                        <Building className="w-4 h-4 text-purple-700" />
                        <span>Business & Commercial Utilization</span>
                      </div>
                      <p className="text-xs text-slate-600">
                        This item can be processed, cooked, or transformed by local businesses before expiry:
                      </p>

                      {deal.productId?.businessUseCases?.length > 0 && (
                        <div className="pt-1">
                          <span className="text-[11px] font-bold text-slate-500 block mb-1">Ideal for:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {deal.productId.businessUseCases.map((useCase, idx) => (
                              <span key={idx} className="bg-white px-2.5 py-1 rounded-lg border border-purple-200 text-purple-900 text-xs font-bold shadow-2xs">
                                🏪 {useCase}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {deal.productId?.commonUses?.length > 0 && (
                        <div className="pt-1 text-xs text-slate-700">
                          <span className="font-bold text-slate-900">Common uses: </span>
                          <span>{deal.productId.commonUses.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  )}
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
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                  <ProductImage
                    src={deal.productId?.imageUrl || deal.productId?.image}
                    alt={deal.productName}
                    category={deal.productId?.category}
                    aspectRatio="square"
                    className="w-full h-full"
                  />
                </div>
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
                  <span>Subtotal ({reserveQty} items):</span>
                  <span className="line-through text-slate-400">₹{(deal.originalPrice * reserveQty).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#2E7D32] font-semibold">
                  <span>Flash Sale Discount ({deal.discountPercentage}%):</span>
                  <span>-₹{((deal.originalPrice - deal.salePrice) * reserveQty).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-[#2E7D32] pt-1.5 border-t border-emerald-200">
                  <span>Total Due:</span>
                  <span className="text-base font-black">₹{(deal.salePrice * reserveQty).toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Payment Method
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('ONLINE')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      paymentMethod === 'ONLINE'
                        ? 'border-[#2E7D32] bg-[#E8F5E9]/50 text-[#1F2937] ring-1 ring-[#2E7D32]'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center ${
                      paymentMethod === 'ONLINE' ? 'border-[#2E7D32]' : 'border-slate-300'
                    }`}>
                      {paymentMethod === 'ONLINE' && <div className="w-2 h-2 rounded-full bg-[#2E7D32]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 font-bold text-xs">
                        <CreditCard className="w-3.5 h-3.5 text-[#2E7D32]" />
                        <span>Pay Online</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        UPI, Cards, Netbanking via Razorpay
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('PAY_AT_STORE')}
                    className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                      paymentMethod === 'PAY_AT_STORE'
                        ? 'border-[#2E7D32] bg-[#E8F5E9]/50 text-[#1F2937] ring-1 ring-[#2E7D32]'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center ${
                      paymentMethod === 'PAY_AT_STORE' ? 'border-[#2E7D32]' : 'border-slate-300'
                    }`}>
                      {paymentMethod === 'PAY_AT_STORE' && <div className="w-2 h-2 rounded-full bg-[#2E7D32]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 font-bold text-xs">
                        <Banknote className="w-3.5 h-3.5 text-slate-600" />
                        <span>Pay at Store</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                        Cash on Delivery (30-min hold)
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Context Note / Disclaimer */}
              {paymentMethod === 'ONLINE' ? (
                <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px]">
                  <Lock className="w-3.5 h-3.5 text-[#2E7D32]" />
                  <span>Secure payment powered by <strong>Razorpay</strong></span>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Your reservation holds inventory for <strong>30 minutes</strong>. Pay upon pickup at the store.
                  </span>
                </div>
              )}

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
                  className="flex-1 justify-center font-bold"
                >
                  {isReserving
                    ? 'Processing...'
                    : paymentMethod === 'ONLINE'
                    ? `Pay Securely ₹${(deal.salePrice * reserveQty).toFixed(2)}`
                    : 'Confirm 30-Min Hold'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Demo Payment Modal */}
      <DemoPaymentModal
        isOpen={isDemoPaymentOpen}
        onClose={() => {
          setIsDemoPaymentOpen(false);
          if (demoPaymentOrder) {
            navigate(`/orders/${demoPaymentOrder._id || demoPaymentOrder.id}`);
          }
        }}
        order={demoPaymentOrder}
        onSuccess={(updatedOrder) => {
          setIsDemoPaymentOpen(false);
          addToast('Simulated payment captured! Order sent to store.', 'success');
          navigate(`/orders/${updatedOrder._id || updatedOrder.id}`);
        }}
        onFailure={(updatedOrder) => {
          setIsDemoPaymentOpen(false);
          addToast('Payment declined. You can retry from your orders dashboard.', 'info');
          navigate(`/orders/${updatedOrder._id || updatedOrder.id}`);
        }}
      />
    </div>
  );
}

export default FlashSaleDetails;
