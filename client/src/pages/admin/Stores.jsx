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
  Store,
  Search,
  CheckCircle2,
  XCircle,
  MapPin,
  Package,
  Zap,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  User
} from 'lucide-react';

const statusFilters = [
  { id: 'ALL', label: 'All Stores' },
  { id: 'ACTIVE', label: 'Active Stores' },
  { id: 'INACTIVE', label: 'Inactive Stores' }
];

function AdminStores() {
  const { addToast } = useToast();

  const [stores, setStores] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [activeStatus, setActiveStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchStores = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminService.getStores({
        page,
        limit: 20,
        status: activeStatus !== 'ALL' ? activeStatus : undefined,
        search: searchTerm.trim() || undefined
      });

      if (res.success && res.data) {
        setStores(res.data.stores || []);
        setPagination(res.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('[AdminStores] Fetch error:', err);
      addToast('Unable to load stores list.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, activeStatus, searchTerm, addToast]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const handleToggleStore = async (store) => {
    try {
      setUpdatingId(store._id);
      const targetState = store.isActive === false ? true : false;
      const res = await adminService.updateStoreStatus(store._id, targetState);
      if (res.success && res.data) {
        addToast(`Store "${store.name}" is now ${targetState ? 'ACTIVE' : 'DEACTIVATED'}`, 'success');
        fetchStores();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update store status.';
      addToast(msg, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#1F2937] flex font-sans">
      <AdminSidebar
        activeTab="stores"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <AdminTopbar
          title="Store Management"
          subtitle="Monitor registered retailer stores, product counts, and active flash sales."
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <PageContainer>
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#1F2937] tracking-tight flex items-center gap-2">
                  <Store className="w-6 h-6 text-[#2E7D32]" />
                  <span>Platform Stores ({pagination.total})</span>
                </h2>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Manage retail store locations and public marketplace visibility.
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                icon={RotateCcw}
                onClick={fetchStores}
                className="text-xs"
              >
                Refresh
              </Button>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-2xs">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
                {statusFilters.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveStatus(tab.id);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      activeStatus === tab.id
                        ? 'bg-[#2E7D32] text-white shadow-2xs'
                        : 'bg-slate-50 border border-[#E5E7EB] text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search store name, address..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#E5E7EB] bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#2E7D32] focus:bg-white"
                />
              </div>
            </div>

            {/* Stores Table */}
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i} padding="p-4">
                    <Skeleton height="h-6" width="w-1/3" />
                    <Skeleton height="h-4" width="w-1/2" className="mt-2" />
                  </Card>
                ))}
              </div>
            ) : stores.length === 0 ? (
              <EmptyState
                icon={Store}
                title="No stores found"
                description="No registered stores match your filter criteria."
              />
            ) : (
              <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-[#E5E7EB] text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                        <th className="p-4">Store Name</th>
                        <th className="p-4">Owner</th>
                        <th className="p-4">Business Type</th>
                        <th className="p-4">Location</th>
                        <th className="p-4">Products</th>
                        <th className="p-4">Active Deals</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {stores.map((st) => (
                        <tr key={st._id} className="hover:bg-slate-50/75 transition-colors">
                          <td className="p-4">
                            <p className="font-extrabold text-slate-900">{st.name}</p>
                            <p className="text-[11px] text-slate-500">{st.phone || 'No phone'}</p>
                          </td>
                          <td className="p-4">
                            <p className="font-bold text-slate-900 flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              <span>{st.ownerId?.name || 'Owner'}</span>
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono">{st.ownerId?.email}</p>
                          </td>
                          <td className="p-4">
                            <Badge variant="info">{st.businessType}</Badge>
                          </td>
                          <td className="p-4 max-w-xs truncate text-slate-600">
                            <span className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 text-[#2E7D32] shrink-0" />
                              <span className="truncate">{st.address || '—'}</span>
                            </span>
                          </td>
                          <td className="p-4 font-bold text-slate-900">
                            {st.productCount || 0}
                          </td>
                          <td className="p-4 font-bold text-emerald-700">
                            {st.flashSalesCount || 0}
                          </td>
                          <td className="p-4">
                            <Badge variant={st.isActive !== false ? 'AVAILABLE' : 'EXPIRED'}>
                              {st.isActive !== false ? 'ACTIVE' : 'DEACTIVATED'}
                            </Badge>
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              variant={st.isActive !== false ? 'outline' : 'primary'}
                              size="sm"
                              loading={updatingId === st._id}
                              onClick={() => handleToggleStore(st)}
                              className={`text-[11px] px-2.5 py-1 ${
                                st.isActive !== false
                                  ? 'text-rose-600 border-rose-200 hover:bg-rose-50'
                                  : 'bg-emerald-600 hover:bg-emerald-700'
                              }`}
                            >
                              {st.isActive !== false ? 'Deactivate' : 'Activate'}
                            </Button>
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

export default AdminStores;
