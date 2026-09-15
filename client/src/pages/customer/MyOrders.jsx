import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import orderService from '../../services/orderService';
import { useAuth } from '../../context/AuthContext';

// Layout & Common Components
import Logo from '../../components/common/Logo';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import ProductImage from '../../components/common/ProductImage';
import { useToast } from '../../components/ui/Toast';

// Icons
import {
  ShoppingBag,
  Store,
  Clock,
  MapPin,
  ArrowRight,
  Receipt,
  UserCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  ShieldCheck,
  CreditCard
} from 'lucide-react';

const statusTabs = [
  { id: 'ALL', label: 'All Orders' },
  { id: 'WAITING_FOR_STORE_ACCEPTANCE', label: 'Paid • Under Review' },
  { id: 'ACCEPTED', label: 'Accepted' },
  { id: 'PENDING', label: 'Pending Hold' },
  { id: 'CONFIRMED', label: 'Confirmed' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'CANCELLED', label: 'Cancelled' },
  { id: 'EXPIRED', label: 'Expired' }
];

function MyOrders() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { addToast } = useToast();

  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [page, setPage] = useState(1);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await orderService.getMyOrders({
        page,
        limit: 10,
        status: activeTab !== 'ALL' ? activeTab : undefined
      });

      if (res.success && res.data) {
        setOrders(res.data.orders || []);
        setPagination(res.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('[MyOrders] Fetch orders error:', err);
      addToast('Unable to load order history.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, addToast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'ACCEPTED':
      case 'CONFIRMED':
      case 'COMPLETED':
        return 'AVAILABLE';
      case 'WAITING_FOR_STORE_ACCEPTANCE':
        return 'warning';
      case 'PENDING':
        return 'info';
      case 'REJECTED':
      case 'CANCELLED':
      case 'EXPIRED':
        return 'EXPIRED';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'WAITING_FOR_STORE_ACCEPTANCE':
        return 'Paid • Awaiting Store Review';
      case 'ACCEPTED':
        return 'Order Accepted';
      case 'REJECTED':
        return 'Rejected & Refunded';
      case 'PENDING':
        return 'Hold Active (Pay at Store)';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#1F2937] flex flex-col font-sans selection:bg-[#2E7D32] selection:text-white">
      {/* Header Bar */}
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <Link to="/">
            <Logo showTagline size="md" />
          </Link>

          <div className="flex items-center gap-3">
            <Link to="/marketplace">
              <Button variant="outline" size="sm" icon={ShoppingBag}>
                Explore Deals
              </Button>
            </Link>

            <Link to="/customer">
              <Button variant="ghost" size="sm" icon={UserCheck}>
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Title Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#E5E7EB] pb-4">
          <div>
            <h1 className="text-2xl font-black text-[#1F2937] tracking-tight flex items-center gap-2">
              <Receipt className="w-6 h-6 text-[#2E7D32]" />
              <span>My Reservations &amp; Orders</span>
            </h1>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Track your active flash sale reservations and past store pickups.
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            icon={RotateCcw}
            onClick={fetchOrders}
            className="text-xs"
          >
            Refresh
          </Button>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-[#2E7D32] text-white shadow-2xs'
                  : 'bg-white border border-[#E5E7EB] text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} padding="p-5" className="space-y-3">
                <Skeleton height="h-5" width="w-1/4" />
                <Skeleton height="h-4" width="w-1/2" />
                <Skeleton height="h-8" rounded="rounded-xl" />
              </Card>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No orders found"
            description={
              activeTab === 'ALL'
                ? "You haven't reserved any flash sale deals yet. Browse the marketplace to discover fresh discounts!"
                : `No orders with status "${activeTab}" found.`
            }
            actionButton={
              <Button
                variant="primary"
                size="sm"
                icon={ShoppingBag}
                onClick={() => navigate('/marketplace')}
              >
                Browse Flash Sales
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {orders.map((ord) => (
              <Card
                key={ord._id}
                hover
                padding="p-5 sm:p-6"
                className="border border-[#E5E7EB] transition-all bg-white"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Item Details */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden shrink-0">
                      <ProductImage
                        src={ord.productId?.imageUrl || ord.productId?.image}
                        alt={ord.productName}
                        category={ord.productId?.category}
                        aspectRatio="square"
                        className="w-full h-full"
                      />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-500">
                          {ord.orderNumber}
                        </span>
                        <Badge variant={getStatusBadgeVariant(ord.status)}>
                          {getStatusLabel(ord.status)}
                        </Badge>
                        {ord.paymentMethod === 'ONLINE' ? (
                          ord.paymentStatus === 'CAPTURED' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              {ord.isDemoPayment || ord.paymentProvider === 'DEMO' ? 'Paid (Demo)' : 'Paid (Razorpay)'}
                            </span>
                          ) : ord.paymentStatus === 'REFUNDED' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                              {ord.isDemoPayment || ord.paymentProvider === 'DEMO' ? 'Demo Refunded' : 'Refunded'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              {ord.paymentStatus}
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                            Pay at Store
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-extrabold text-[#1F2937] truncate flex flex-wrap items-center gap-2">
                        <span>{ord.productName}</span>
                        {ord.orderType === 'INGREDIENT_BASKET' && (
                          <span className="text-[10px] font-black uppercase text-purple-800 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-md">
                            🍬 Ingredient Basket: {ord.recipeName || 'Production Batch'}
                          </span>
                        )}
                      </h3>

                      <p className="text-xs text-[#6B7280] flex items-center gap-1.5 truncate">
                        <Store className="w-3.5 h-3.5 text-[#2E7D32] shrink-0" />
                        <span className="truncate">{ord.storeName}</span>
                      </p>

                      {ord.rejectionReason && (
                        <p className="text-[11px] text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
                          <strong>Note:</strong> {ord.rejectionReason} (Amount refunded)
                        </p>
                      )}

                      <p className="text-xs text-slate-500 font-medium pt-0.5">
                        {ord.quantity} × ₹{ord.unitPrice} • Placed {new Date(ord.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {/* Total & Action */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-none border-slate-100 gap-3">
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] text-slate-400 block font-medium">Total Price</span>
                      <span className="text-lg font-black text-[#2E7D32]">₹{ord.totalPrice}</span>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(`/orders/${ord._id}`)}
                      className="text-xs"
                    >
                      View Order <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
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
    </div>
  );
}

export default MyOrders;
