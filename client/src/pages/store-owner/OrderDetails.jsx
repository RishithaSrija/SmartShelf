import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import orderService from '../../services/orderService';
import storeService from '../../services/storeService';

// Layout & Common Components
import Sidebar from '../../components/layout/Sidebar';
import Topbar from '../../components/layout/Topbar';
import PageContainer from '../../components/layout/PageContainer';

// UI Components
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';

// Icons
import {
  ArrowLeft,
  Receipt,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  ShoppingBag,
  Boxes,
  Copy,
  AlertCircle
} from 'lucide-react';

function StoreOwnerOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [store, setStore] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Out of stock or damaged item');

  const fetchStoreAndOrder = useCallback(async () => {
    try {
      setLoading(true);
      const [storeRes, orderRes] = await Promise.all([
        storeService.getMyStore(),
        orderService.getStoreOrderById(id)
      ]);

      if (storeRes.success && storeRes.data) {
        setStore(storeRes.data);
      }

      if (orderRes.success && orderRes.data) {
        setOrder(orderRes.data);
      }
    } catch (err) {
      console.error('[StoreOrderDetail] Fetch error:', err);
      addToast('Unable to load order details.', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    fetchStoreAndOrder();
  }, [fetchStoreAndOrder]);

  const handleStatusChange = async (targetStatus, reason = '') => {
    try {
      setUpdating(true);
      const res = await orderService.updateStoreOrderStatus(order._id, targetStatus, reason);
      if (res.success && res.data) {
        addToast(`Order status updated to ${targetStatus}`, 'success');
        setOrder(res.data);
        setIsCancelModalOpen(false);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update order status.';
      addToast(msg, 'error');
    } finally {
      setUpdating(false);
    }
  };

  const copyOrderNumber = () => {
    if (order?.orderNumber) {
      navigator.clipboard.writeText(order.orderNumber);
      addToast('Order number copied!', 'success');
    }
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'CONFIRMED':
      case 'COMPLETED':
        return 'AVAILABLE';
      case 'PENDING':
        return 'info';
      case 'CANCELLED':
      case 'EXPIRED':
        return 'EXPIRED';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAF8] flex flex-col items-center justify-center p-6 text-slate-700">
        <Skeleton height="h-10" width="w-10" rounded="rounded-xl" className="mb-3" />
        <p className="text-sm font-semibold text-[#6B7280]">Loading order fulfillment console...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#F8FAF8] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold text-slate-900 mb-1">Order Not Found</h2>
        <p className="text-xs text-slate-500 mb-6">Could not load this store order.</p>
        <Button variant="primary" size="sm" onClick={() => navigate('/store-owner/orders')}>
          Back to Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#1F2937] flex font-sans">
      <Sidebar
        activeTab="orders"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Topbar
          title="Order Details"
          storeName={store?.name}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <PageContainer>
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Top Back & Actions Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={ArrowLeft}
                  onClick={() => navigate('/store-owner/orders')}
                  className="text-xs"
                >
                  All Orders
                </Button>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-extrabold text-[#1F2937] tracking-tight">
                      Order {order.orderNumber}
                    </h2>
                    <button
                      onClick={copyOrderNumber}
                      title="Copy Order Number"
                      className="p-1 text-slate-400 hover:text-[#2E7D32]"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    Reserved on {new Date(order.createdAt).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant={getStatusBadgeVariant(order.status)}>
                  {order.status}
                </Badge>
              </div>
            </div>

            {/* Main Order Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Product & Fulfillment Info */}
              <div className="lg:col-span-2 space-y-6">
                <Card padding="p-6" className="space-y-4">
                  <h3 className="text-sm font-extrabold text-[#1F2937] border-b border-[#E5E7EB] pb-3 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-[#2E7D32]" />
                    <span>Reserved Item &amp; Inventory Batch</span>
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

                    <div className="flex-1 min-w-0 space-y-1 text-xs">
                      <h4 className="text-base font-extrabold text-[#1F2937]">
                        {order.productName}
                      </h4>
                      <p className="text-slate-500">
                        Category: <strong className="text-slate-800">{order.productId?.category}</strong> • Brand: <strong className="text-slate-800">{order.productId?.brand || 'Store Brand'}</strong>
                      </p>
                      {order.inventoryBatchId && (
                        <p className="text-slate-500 flex items-center gap-1 font-mono">
                          <Boxes className="w-3.5 h-3.5 text-slate-400" />
                          <span>Batch #{order.inventoryBatchId.batchNumber}</span>
                          {order.inventoryBatchId.expiryDate && (
                            <span>• Exp: {new Date(order.inventoryBatchId.expiryDate).toLocaleDateString('en-IN')}</span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Snapshot Unit Price:</span>
                      <span className="font-semibold">₹{order.unitPrice}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Quantity Reserved:</span>
                      <span className="font-semibold">{order.quantity} units</span>
                    </div>
                    <div className="flex justify-between text-sm font-black text-[#2E7D32] pt-2 border-t border-slate-200">
                      <span>Total Amount to Collect at Store:</span>
                      <span>₹{order.totalPrice}</span>
                    </div>
                  </div>

                  {order.cancellationReason && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
                      <strong>Cancellation Reason:</strong> {order.cancellationReason}
                    </div>
                  )}
                </Card>

                {/* Status Action Controls */}
                <Card padding="p-6" className="space-y-4">
                  <h3 className="text-sm font-extrabold text-[#1F2937] border-b border-[#E5E7EB] pb-3">
                    Order Status Actions
                  </h3>

                  <div className="flex flex-wrap items-center gap-3">
                    {order.status === 'PENDING' && (
                      <>
                        <Button
                          variant="primary"
                          size="md"
                          loading={updating}
                          icon={CheckCircle2}
                          onClick={() => handleStatusChange('CONFIRMED')}
                        >
                          Confirm Reservation
                        </Button>
                        <Button
                          variant="outline"
                          size="md"
                          icon={XCircle}
                          onClick={() => setIsCancelModalOpen(true)}
                          className="text-rose-600 border-rose-200 hover:bg-rose-50"
                        >
                          Cancel Reservation
                        </Button>
                      </>
                    )}

                    {order.status === 'CONFIRMED' && (
                      <>
                        <Button
                          variant="primary"
                          size="md"
                          loading={updating}
                          icon={CheckCircle2}
                          onClick={() => handleStatusChange('COMPLETED')}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          Complete Store Pickup
                        </Button>
                        <Button
                          variant="outline"
                          size="md"
                          icon={XCircle}
                          onClick={() => setIsCancelModalOpen(true)}
                          className="text-rose-600 border-rose-200 hover:bg-rose-50"
                        >
                          Cancel Order
                        </Button>
                      </>
                    )}

                    {(order.status === 'COMPLETED' || order.status === 'CANCELLED' || order.status === 'EXPIRED') && (
                      <p className="text-xs text-[#6B7280] italic">
                        This order is in terminal state ({order.status}). No further action is required.
                      </p>
                    )}
                  </div>
                </Card>
              </div>

              {/* Customer Contact & Reservation Hold Summary */}
              <div className="space-y-6">
                <Card padding="p-6" className="space-y-4">
                  <h3 className="text-sm font-extrabold text-[#1F2937] border-b border-[#E5E7EB] pb-3 flex items-center gap-2">
                    <User className="w-4 h-4 text-[#2E7D32]" />
                    <span>Customer Information</span>
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Customer Name</span>
                      <p className="font-bold text-slate-900 text-sm">{order.customerId?.name || 'Customer'}</p>
                    </div>

                    {order.customerId?.phone && (
                      <div>
                        <span className="text-slate-400 block font-medium">Phone Number</span>
                        <p className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{order.customerId.phone}</span>
                        </p>
                      </div>
                    )}

                    {order.customerId?.email && (
                      <div>
                        <span className="text-slate-400 block font-medium">Email Address</span>
                        <p className="font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{order.customerId.email}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Reservation Expiry Info */}
                <Card padding="p-6" className="space-y-3 bg-slate-50 border border-slate-200">
                  <h4 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#2E7D32]" />
                    <span>Reservation Timeline</span>
                  </h4>
                  <div className="text-xs text-slate-600 space-y-1">
                    <p>Created: <strong>{new Date(order.createdAt).toLocaleTimeString('en-IN')}</strong></p>
                    <p>Auto-Release At: <strong>{new Date(order.reservationExpiresAt).toLocaleTimeString('en-IN')}</strong></p>
                  </div>
                  <p className="text-[11px] text-[#6B7280]">
                    If not picked up before expiration, the automated reservation scheduler restores the reserved quantity to inventory.
                  </p>
                </Card>
              </div>
            </div>
          </div>
        </PageContainer>
      </div>

      {/* Cancellation Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <XCircle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">Cancel Order?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Cancelling will release {order.quantity} units back into your store inventory.
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
                <option value="Out of stock or damaged item">Out of stock or damaged item</option>
                <option value="Customer requested cancellation">Customer requested cancellation</option>
                <option value="Store closing early">Store closing early</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => setIsCancelModalOpen(false)}
                disabled={updating}
                className="flex-1 justify-center"
              >
                Back
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={() => handleStatusChange('CANCELLED', cancelReason)}
                loading={updating}
                className="flex-1 justify-center bg-rose-600 hover:bg-rose-700 text-white"
              >
                Confirm Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StoreOwnerOrderDetail;
