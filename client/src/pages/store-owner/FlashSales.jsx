import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import flashSaleService from '../../services/flashSaleService';
import storeService from '../../services/storeService';

// Layout & UI Components
import Sidebar from '../../components/layout/Sidebar';
import Topbar from '../../components/layout/Topbar';
import PageContainer from '../../components/layout/PageContainer';
import Card, { CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';

// Icons
import {
  Zap,
  Plus,
  Power,
  Trash2,
  Eye,
  Clock,
  Boxes,
  TrendingUp,
  Tag
} from 'lucide-react';

function FlashSales() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [store, setStore] = useState(null);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Delete Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    storeService.getMyStore().then((res) => {
      if (res.success && res.data) setStore(res.data);
    });
  }, []);

  const fetchFlashSales = useCallback(async () => {
    try {
      setLoading(true);
      const res = await flashSaleService.getStoreFlashSales();
      if (res.success && res.data) {
        setSales(res.data.flashSales || []);
      }
    } catch (err) {
      console.error('[FlashSales] Fetch error:', err);
      addToast('Unable to load flash sales.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchFlashSales();
  }, [fetchFlashSales]);

  // Toggle status
  const handleToggleStatus = async (saleId, currentStatus) => {
    try {
      const nextStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      const res = await flashSaleService.updateFlashSaleStatus(saleId, nextStatus);
      if (res.success) {
        addToast(`Flash sale is now ${nextStatus}`, 'success');
        fetchFlashSales();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (!saleToDelete) return;
    try {
      setDeleting(true);
      const res = await flashSaleService.deleteFlashSale(saleToDelete._id);
      if (res.success) {
        addToast('Flash sale deleted successfully', 'success');
        setDeleteModalOpen(false);
        setSaleToDelete(null);
        fetchFlashSales();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Unable to delete flash sale', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Real stats
  const activeCount = sales.filter((s) => s.status === 'ACTIVE').length;
  const totalUnits = sales.reduce((acc, s) => acc + (s.availableQuantity || 0), 0);

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#1F2937] flex font-sans">
      <Sidebar
        activeTab="flash-sales"
        onSelectTab={(tab) => {
          if (tab === 'overview' || tab === 'settings') navigate('/store-owner');
          if (tab === 'products') navigate('/store-owner/products');
          if (tab === 'inventory') navigate('/store-owner/inventory');
          if (tab === 'expiring') navigate('/store-owner/expiring-soon');
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Topbar
          title="Local Flash Sales"
          storeName={store?.name}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <PageContainer>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-[#1F2937] tracking-tight flex items-center gap-2">
                <Zap className="w-6 h-6 text-[#2E7D32]" />
                <span>Flash Sales</span>
              </h2>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Turn expiring inventory into opportunities before it goes to waste.
              </p>
            </div>

            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={() => navigate('/store-owner/flash-sales/new')}
            >
              Create Flash Sale
            </Button>
          </div>

          {/* Real KPI summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card padding="p-5" className="border-l-4 border-l-[#2E7D32]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                  Active Flash Sales
                </span>
                <Zap className="w-4 h-4 text-[#2E7D32]" />
              </div>
              <p className="text-2xl font-extrabold text-[#1F2937]">{activeCount} deals</p>
            </Card>

            <Card padding="p-5" className="border-l-4 border-l-emerald-600">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                  Discounted Units
                </span>
                <Boxes className="w-4 h-4 text-[#2E7D32]" />
              </div>
              <p className="text-2xl font-extrabold text-[#1F2937]">{totalUnits} items</p>
            </Card>

            <Card padding="p-5" className="border-l-4 border-l-blue-600">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                  Marketplace Exposure
                </span>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-extrabold text-[#1F2937]">Live Public</p>
            </Card>
          </div>

          {/* Flash Sales List */}
          {loading ? (
            <Card padding="p-6">
              <div className="space-y-4">
                <Skeleton height="h-10" />
                <Skeleton height="h-10" />
                <Skeleton height="h-10" />
              </div>
            </Card>
          ) : sales.length === 0 ? (
            <EmptyState
              icon={Zap}
              title="No active flash sales"
              description="Create a flash sale from eligible expiring inventory to reach nearby customers."
              actionButton={
                <Button
                  variant="primary"
                  size="md"
                  icon={Plus}
                  onClick={() => navigate('/store-owner/flash-sales/new')}
                >
                  Create Flash Sale
                </Button>
              }
            />
          ) : (
            <Card padding="p-0" className="overflow-hidden">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-[#E5E7EB] text-[#6B7280] font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Product</th>
                      <th className="py-3.5 px-4">Batch #</th>
                      <th className="py-3.5 px-4">Original Price</th>
                      <th className="py-3.5 px-4">Sale Price</th>
                      <th className="py-3.5 px-4">Discount</th>
                      <th className="py-3.5 px-4">Quantity</th>
                      <th className="py-3.5 px-4">Ends At</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] text-[#1F2937]">
                    {sales.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold">
                          <p className="text-sm font-extrabold text-[#1F2937] leading-tight">
                            {item.title || item.productId?.name}
                          </p>
                          <p className="text-[11px] font-normal text-[#6B7280]">
                            {item.productId?.name}
                          </p>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                          {item.inventoryBatchId?.batchNumber || '—'}
                        </td>

                        <td className="py-3.5 px-4 font-bold text-slate-400 line-through">
                          ₹{item.originalPrice}
                        </td>

                        <td className="py-3.5 px-4 font-extrabold text-[#2E7D32]">
                          ₹{item.salePrice}
                        </td>

                        <td className="py-3.5 px-4 font-black text-[#2E7D32]">
                          <span className="bg-[#E8F5E9] px-2 py-0.5 rounded border border-emerald-200">
                            {item.discountPercentage}% OFF
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {item.availableQuantity} units
                        </td>

                        <td className="py-3.5 px-4 font-medium text-slate-600">
                          {new Date(item.endsAt).toLocaleDateString()}
                        </td>

                        <td className="py-3.5 px-4">
                          <Badge variant={item.status}>{item.status}</Badge>
                        </td>

                        <td className="py-3.5 px-4 text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title={item.status === 'ACTIVE' ? 'Pause Sale' : 'Activate Sale'}
                            onClick={() => handleToggleStatus(item._id, item.status)}
                          >
                            <Power className={`w-4 h-4 ${item.status === 'ACTIVE' ? 'text-amber-600' : 'text-[#2E7D32]'}`} />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            title="View Public Deal"
                            onClick={() => navigate(`/marketplace/flash-sales/${item._id}`)}
                          >
                            <Eye className="w-4 h-4 text-slate-600" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            title="Delete Sale"
                            onClick={() => {
                              setSaleToDelete(item);
                              setDeleteModalOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-rose-600" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="md:hidden divide-y divide-[#E5E7EB]">
                {sales.map((item) => (
                  <div key={item._id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-extrabold text-sm text-[#1F2937]">{item.title}</h4>
                        <p className="text-xs font-mono font-bold text-slate-500">Batch #{item.inventoryBatchId?.batchNumber}</p>
                      </div>
                      <Badge variant={item.status}>{item.status}</Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-slate-500 block">Sale Price:</span>
                        <span className="font-extrabold text-[#2E7D32]">
                          ₹{item.salePrice} ({item.discountPercentage}% OFF)
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 block">Quantity:</span>
                        <span className="font-bold text-slate-900">{item.availableQuantity} units</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1 pt-1">
                      <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(item._id, item.status)}>
                        <Power className="w-4 h-4 text-amber-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/marketplace/flash-sales/${item._id}`)}>
                        <Eye className="w-4 h-4 text-slate-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </PageContainer>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSaleToDelete(null);
        }}
        title="Delete Flash Sale?"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Are you sure you want to delete the flash sale deal <span className="font-bold text-slate-900">{saleToDelete?.title}</span>? This will remove it from the customer marketplace.
          </p>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" size="sm" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" loading={deleting} onClick={handleDeleteConfirm}>
              Delete Flash Sale
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default FlashSales;
