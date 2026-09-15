import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import orderService from '../../services/orderService';
import storeService from '../../services/storeService';
import { useAuth } from '../../context/AuthContext';

// Layout & Common Components
import Sidebar from '../../components/layout/Sidebar';
import Topbar from '../../components/layout/Topbar';
import PageContainer from '../../components/layout/PageContainer';

// UI Components
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import Modal from '../../components/ui/Modal';

// Icons
import {
  ShoppingBag,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  User,
  Phone,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  AlertCircle,
  CreditCard,
  ShieldCheck,
  DollarSign
} from 'lucide-react';

const statusTabs = [
  { id: 'ALL', label: 'All Orders' },
  { id: 'WAITING_FOR_STORE_ACCEPTANCE', label: '⚡ New Paid Orders' },
  { id: 'ACCEPTED', label: 'Accepted' },
  { id: 'PENDING', label: 'Pending Hold (Store Pay)' },
  { id: 'CONFIRMED', label: 'Confirmed' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'REJECTED', label: 'Rejected' },
  { id: 'CANCELLED', label: 'Cancelled' },
  { id: 'EXPIRED', label: 'Expired' }
];

function StoreOwnerOrders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [store, setStore] = useState(null);
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [activeTab, setActiveTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState(null);

  // Reject order modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [orderToReject, setOrderToReject] = useState(null);
  const [rejectReason, setRejectReason] = useState('Out of stock');
  const [rejectCustomReason, setRejectCustomReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Fetch store profile and store orders
  const fetchStoreAndOrders = useCallback(async () => {
    try {
      setLoading(true);
      const [storeRes, ordersRes] = await Promise.all([
        storeService.getMyStore(),
        orderService.getStoreOrders({
          page,
          limit: 10,
          status: activeTab !== 'ALL' ? activeTab : undefined,
          search: searchTerm.trim() || undefined
        })
      ]);

      if (storeRes.success && storeRes.data) {
        setStore(storeRes.data);
      }

      if (ordersRes.success && ordersRes.data) {
        setOrders(ordersRes.data.orders || []);
        setPagination(ordersRes.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('[StoreOwnerOrders] Fetch error:', err);
      addToast('Unable to load store orders.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, searchTerm, addToast]);

  useEffect(() => {
    fetchStoreAndOrders();
  }, [fetchStoreAndOrders]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      setUpdatingId(orderId);
      const res = await orderService.updateStoreOrderStatus(orderId, newStatus);
      if (res.success && res.data) {
        addToast(`Order status updated to ${newStatus}`, 'success');
        fetchStoreAndOrders();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update order status.';
      addToast(msg, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      setUpdatingId(orderId);
      const res = await orderService.acceptOrder(orderId);
      if (res.success && res.data) {
        addToast('Order accepted successfully!', 'success');
        fetchStoreAndOrders();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to accept order.';
      addToast(msg, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOpenRejectModal = (order) => {
    setOrderToReject(order);
    setRejectReason('Out of stock');
    setRejectCustomReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!orderToReject) return;
    try {
      setRejecting(true);
      const finalReason = rejectReason === 'Other'
        ? (rejectCustomReason.trim() || 'Store unable to fulfill')
        : rejectReason;
      const res = await orderService.rejectOrder(orderToReject._id, finalReason);
      if (res.success && res.data) {
        addToast('Order rejected and refund initiated via Razorpay.', 'success');
        setRejectModalOpen(false);
        setOrderToReject(null);
        fetchStoreAndOrders();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reject order.';
      addToast(msg, 'error');
    } finally {
      setRejecting(false);
    }
  };

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

  const renderPaymentBadge = (ord) => {
    if (ord.paymentMethod === 'ONLINE') {
      const isDemo = ord.isDemoPayment || ord.paymentProvider === 'DEMO';
      if (ord.paymentStatus === 'CAPTURED') {
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            {isDemo ? 'Paid (Demo)' : 'Paid (Razorpay)'}
          </span>
        );
      }
      if (ord.paymentStatus === 'REFUNDED') {
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
            {isDemo ? 'Demo Refunded' : 'Refunded'}
          </span>
        );
      }
      if (ord.paymentStatus === 'REFUND_PENDING') {
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            Refund Pending
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
          {ord.paymentStatus || 'Pending'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
        Pay at Store
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#1F2937] flex font-sans">
      <Sidebar
        activeTab="orders"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Topbar
          title="Orders &amp; Reservations"
          storeName={store?.name}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <PageContainer>
          <div className="space-y-6">
            {/* Header Title Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-[#1F2937] tracking-tight flex items-center gap-2">
                  <ShoppingBag className="w-6 h-6 text-[#2E7D32]" />
                  <span>Customer Reservations &amp; Orders</span>
                </h2>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Manage incoming customer reservations, confirm pickups, and fulfill orders.
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                icon={RotateCcw}
                onClick={fetchStoreAndOrders}
              >
                Refresh
              </Button>
            </div>

            {/* Filter Bar & Search */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-2xs">
              {/* Status Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
                {statusTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      activeTab === tab.id
                        ? 'bg-[#2E7D32] text-white shadow-2xs'
                        : 'bg-slate-50 border border-[#E5E7EB] text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search order # or item..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#E5E7EB] bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#2E7D32] focus:bg-white"
                />
              </div>
            </div>

            {/* Orders Content */}
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i} padding="p-4">
                    <Skeleton height="h-6" width="w-1/3" />
                    <Skeleton height="h-4" width="w-1/2" className="mt-2" />
                  </Card>
                ))}
              </div>
            ) : orders.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="No orders found"
                description={
                  activeTab === 'ALL'
                    ? 'No reservations have been placed for your store yet.'
                    : `No orders matching filter "${activeTab}".`
                }
              />
            ) : (
              <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xs overflow-hidden">
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-[#E5E7EB] text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                        <th className="p-4">Order #</th>
                        <th className="p-4">Customer</th>
                        <th className="p-4">Product</th>
                        <th className="p-4">Quantity</th>
                        <th className="p-4">Total</th>
                        <th className="p-4">Payment</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Placed At</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {orders.map((ord) => {
                        const isWaitingAcceptance = ord.status === 'WAITING_FOR_STORE_ACCEPTANCE';
                        return (
                          <tr
                            key={ord._id}
                            className={`transition-colors ${
                              isWaitingAcceptance
                                ? 'bg-amber-50/60 hover:bg-amber-50 border-l-4 border-l-amber-500'
                                : 'hover:bg-slate-50/75'
                            }`}
                          >
                            <td className="p-4 font-mono font-bold text-slate-900">
                              <div>{ord.orderNumber}</div>
                              {isWaitingAcceptance && (
                                <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-wider text-amber-800 bg-amber-200/70 px-1.5 py-0.5 rounded">
                                  Action Required
                                </span>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                <span>{ord.customerId?.name || 'Customer'}</span>
                              </div>
                              {ord.customerId?.phone && (
                                <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span>{ord.customerId.phone}</span>
                                </p>
                              )}
                            </td>
                            <td className="p-4 font-bold text-slate-900 max-w-xs">
                              <div className="truncate">{ord.productName}</div>
                              {ord.orderType === 'INGREDIENT_BASKET' && (
                                <span className="inline-flex items-center gap-1 mt-0.5 text-[9px] font-black uppercase tracking-wider text-purple-800 bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded">
                                  🍬 Ingredient Basket: {ord.recipeName || 'Batch'}
                                </span>
                              )}
                            </td>
                            <td className="p-4 font-semibold">
                              {ord.quantity} units
                            </td>
                            <td className="p-4 font-black text-[#2E7D32]">
                              ₹{ord.totalPrice}
                            </td>
                            <td className="p-4">
                              {renderPaymentBadge(ord)}
                            </td>
                            <td className="p-4">
                              <Badge variant={getStatusBadgeVariant(ord.status)}>
                                {ord.status === 'WAITING_FOR_STORE_ACCEPTANCE' ? 'Paid • Awaiting Review' : ord.status}
                              </Badge>
                            </td>
                            <td className="p-4 text-[11px] text-slate-500">
                              {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Razorpay Waiting for Store Acceptance Actions */}
                                {isWaitingAcceptance && (
                                  <>
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      loading={updatingId === ord._id}
                                      onClick={() => handleAcceptOrder(ord._id)}
                                      className="text-[11px] px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 shadow-2xs font-bold"
                                      title="Accept this online paid order"
                                    >
                                      <Check className="w-3 h-3 mr-1" />
                                      Accept
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenRejectModal(ord)}
                                      className="text-[11px] px-2.5 py-1 text-rose-600 border-rose-200 hover:bg-rose-50 font-bold"
                                      title="Reject order and refund customer via Razorpay"
                                    >
                                      <XCircle className="w-3 h-3 mr-1" />
                                      Reject &amp; Refund
                                    </Button>
                                  </>
                                )}

                                {/* Pay at Store Pending Actions */}
                                {ord.status === 'PENDING' && (
                                  <>
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      loading={updatingId === ord._id}
                                      onClick={() => handleStatusUpdate(ord._id, 'CONFIRMED')}
                                      className="text-[11px] px-2.5 py-1"
                                    >
                                      Confirm
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleStatusUpdate(ord._id, 'CANCELLED')}
                                      className="text-[11px] px-2.5 py-1 text-rose-600 border-rose-200"
                                    >
                                      Cancel
                                    </Button>
                                  </>
                                )}

                                {ord.status === 'ACCEPTED' && (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    loading={updatingId === ord._id}
                                    onClick={() => handleStatusUpdate(ord._id, 'COMPLETED')}
                                    className="text-[11px] px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700"
                                  >
                                    Complete Pickup
                                  </Button>
                                )}

                                {ord.status === 'CONFIRMED' && (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    loading={updatingId === ord._id}
                                    onClick={() => handleStatusUpdate(ord._id, 'COMPLETED')}
                                    className="text-[11px] px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700"
                                  >
                                    Complete Pickup
                                  </Button>
                                )}

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  icon={Eye}
                                  onClick={() => navigate(`/store-owner/orders/${ord._id}`)}
                                  className="p-1.5 text-slate-500 hover:text-slate-900"
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden divide-y divide-slate-100">
                  {orders.map((ord) => {
                    const isWaitingAcceptance = ord.status === 'WAITING_FOR_STORE_ACCEPTANCE';
                    return (
                      <div
                        key={ord._id}
                        className={`p-4 space-y-3 ${
                          isWaitingAcceptance ? 'bg-amber-50/50 border-l-4 border-l-amber-500' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {ord.orderNumber}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {renderPaymentBadge(ord)}
                            <Badge variant={getStatusBadgeVariant(ord.status)}>
                              {ord.status === 'WAITING_FOR_STORE_ACCEPTANCE' ? 'Needs Review' : ord.status}
                            </Badge>
                          </div>
                        </div>

                        {isWaitingAcceptance && (
                          <div className="p-2 rounded-lg bg-amber-100/70 border border-amber-200 text-amber-900 text-[11px] font-bold flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            <span>PAYMENT VERIFIED • WAITING FOR YOUR RESPONSE</span>
                          </div>
                        )}

                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h4 className="font-extrabold text-sm text-slate-900">{ord.productName}</h4>
                            {ord.orderType === 'INGREDIENT_BASKET' && (
                              <span className="text-[9px] font-black uppercase tracking-wider text-purple-800 bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded">
                                🍬 Ingredient Basket: {ord.recipeName || 'Batch'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Customer: <strong>{ord.customerId?.name || 'Customer'}</strong> • {ord.quantity} units (₹{ord.totalPrice})
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <span className="text-[11px] text-slate-400">
                            {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>

                          <div className="flex items-center gap-2">
                            {isWaitingAcceptance && (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  loading={updatingId === ord._id}
                                  onClick={() => handleAcceptOrder(ord._id)}
                                  className="text-xs bg-emerald-600 hover:bg-emerald-700"
                                >
                                  Accept
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenRejectModal(ord)}
                                  className="text-xs text-rose-600 border-rose-200"
                                >
                                  Reject &amp; Refund
                                </Button>
                              </>
                            )}
                            {ord.status === 'PENDING' && (
                              <Button
                                variant="primary"
                                size="sm"
                                loading={updatingId === ord._id}
                                onClick={() => handleStatusUpdate(ord._id, 'CONFIRMED')}
                                className="text-xs"
                              >
                                Confirm
                              </Button>
                            )}
                            {ord.status === 'ACCEPTED' && (
                              <Button
                                variant="primary"
                                size="sm"
                                loading={updatingId === ord._id}
                                onClick={() => handleStatusUpdate(ord._id, 'COMPLETED')}
                                className="text-xs bg-emerald-600 hover:bg-emerald-700"
                              >
                                Complete
                              </Button>
                            )}
                            {ord.status === 'CONFIRMED' && (
                              <Button
                                variant="primary"
                                size="sm"
                                loading={updatingId === ord._id}
                                onClick={() => handleStatusUpdate(ord._id, 'COMPLETED')}
                                className="text-xs bg-emerald-600 hover:bg-emerald-700"
                              >
                                Complete
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/store-owner/orders/${ord._id}`)}
                              className="text-xs"
                            >
                              Details
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-4 border-t border-[#E5E7EB]">
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
          </div>
        </PageContainer>
      </div>

      {/* Reject Order & Refund Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => {
          if (!rejecting) {
            setRejectModalOpen(false);
            setOrderToReject(null);
          }
        }}
        title="Reject Order & Initiate Refund"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">
                {orderToReject?.isDemoPayment || orderToReject?.paymentProvider === 'DEMO'
                  ? 'Simulated Customer Demo Refund'
                  : 'Automated Customer Refund'}
              </p>
              <p className="text-[11px] leading-relaxed">
                Rejecting Order <strong>#{orderToReject?.orderNumber}</strong> will immediately process a full {orderToReject?.isDemoPayment || orderToReject?.paymentProvider === 'DEMO' ? 'demo refund' : 'refund'} of <strong>₹{orderToReject?.totalPrice}</strong> and restore <strong>{orderToReject?.quantity} units</strong> to store inventory.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Reason for Rejection
            </label>
            <select
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
            >
              <option value="Out of stock">Out of stock</option>
              <option value="Store unavailable or closing early">Store unavailable or closing early</option>
              <option value="Product damaged or defective">Product damaged or defective</option>
              <option value="Price or inventory discrepancy">Price or inventory discrepancy</option>
              <option value="Other">Other reason</option>
            </select>
          </div>

          {rejectReason === 'Other' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Please specify reason
              </label>
              <input
                type="text"
                value={rejectCustomReason}
                onChange={(e) => setRejectCustomReason(e.target.value)}
                placeholder="Enter details..."
                className="w-full p-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              disabled={rejecting}
              onClick={() => {
                setRejectModalOpen(false);
                setOrderToReject(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={rejecting}
              onClick={handleConfirmReject}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Confirm Reject &amp; Refund
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default StoreOwnerOrders;
