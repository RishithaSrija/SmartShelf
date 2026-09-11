import React, { useState, useEffect, useCallback } from 'react';
import adminService from '../../services/adminService';
import AdminSidebar from '../../components/layout/AdminSidebar';
import AdminTopbar from '../../components/layout/AdminTopbar';
import PageContainer from '../../components/layout/PageContainer';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import {
  Boxes,
  Search,
  Store,
  Clock3,
  RotateCcw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const statusTabs = [
  { id: 'ALL', label: 'All Batches' },
  { id: 'AVAILABLE', label: 'Available' },
  { id: 'LOW_STOCK', label: 'Low Stock' },
  { id: 'EXPIRING_SOON', label: 'Expiring Soon' },
  { id: 'FLASH_SALE', label: 'Flash Sale' },
  { id: 'SOLD_OUT', label: 'Sold Out' },
  { id: 'EXPIRED', label: 'Expired' }
];

function AdminInventory() {
  const { addToast } = useToast();

  const [batches, setBatches] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [activeTab, setActiveTab] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminService.getInventory({
        page,
        limit: 20,
        status: activeTab !== 'ALL' ? activeTab : undefined,
        search: searchTerm.trim() || undefined
      });

      if (res.success && res.data) {
        setBatches(res.data.batches || []);
        setPagination(res.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('[AdminInventory] Fetch error:', err);
      addToast('Unable to load inventory batches.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, searchTerm, addToast]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#1F2937] flex font-sans">
      <AdminSidebar
        activeTab="inventory"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <AdminTopbar
          title="Inventory Overview"
          subtitle="Monitor stock batches, discount percentages, and expiry lifecycles across all stores."
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <PageContainer>
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#1F2937] tracking-tight flex items-center gap-2">
                  <Boxes className="w-6 h-6 text-[#2E7D32]" />
                  <span>Platform Inventory Batches ({pagination.total})</span>
                </h2>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Track physical batch quantities, dynamic prices, and impending expiry dates.
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                icon={RotateCcw}
                onClick={fetchInventory}
                className="text-xs"
              >
                Refresh
              </Button>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-2xs">
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

              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search batch number..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#E5E7EB] bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#2E7D32] focus:bg-white"
                />
              </div>
            </div>

            {/* Batches Table */}
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} padding="p-4">
                    <Skeleton height="h-6" width="w-1/3" />
                    <Skeleton height="h-4" width="w-1/2" className="mt-2" />
                  </Card>
                ))}
              </div>
            ) : batches.length === 0 ? (
              <EmptyState
                icon={Boxes}
                title="No inventory batches found"
                description="No batches match your filter criteria."
              />
            ) : (
              <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-[#E5E7EB] text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                        <th className="p-4">Batch #</th>
                        <th className="p-4">Product</th>
                        <th className="p-4">Store</th>
                        <th className="p-4">Quantity</th>
                        <th className="p-4">Pricing</th>
                        <th className="p-4">Expiry Date</th>
                        <th className="p-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {batches.map((b) => (
                        <tr key={b._id} className="hover:bg-slate-50/75 transition-colors">
                          <td className="p-4 font-mono font-bold text-slate-900">
                            {b.batchNumber}
                          </td>
                          <td className="p-4 font-bold text-slate-900">
                            {b.productId?.name || 'Product'}
                          </td>
                          <td className="p-4">
                            <span className="font-semibold text-slate-800 flex items-center gap-1">
                              <Store className="w-3.5 h-3.5 text-[#2E7D32]" />
                              <span>{b.storeId?.name || 'Store'}</span>
                            </span>
                          </td>
                          <td className="p-4 font-extrabold text-slate-900 font-mono">
                            {b.quantity} units
                          </td>
                          <td className="p-4">
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-black text-[#2E7D32]">₹{b.currentPrice}</span>
                              {b.discountPercentage > 0 && (
                                <>
                                  <span className="text-[10px] text-slate-400 line-through">₹{b.originalPrice}</span>
                                  <span className="text-[10px] text-emerald-600 font-bold">({b.discountPercentage}% off)</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="flex items-center gap-1 font-medium text-slate-600">
                              <Clock3 className="w-3.5 h-3.5 text-slate-400" />
                              <span>{new Date(b.expiryDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </span>
                          </td>
                          <td className="p-4">
                            <Badge variant={b.status}>
                              {b.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pagination */}
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
    </div>
  );
}

export default AdminInventory;
