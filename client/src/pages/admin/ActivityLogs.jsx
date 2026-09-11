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
  ScrollText,
  User,
  Clock,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';

const actionFilters = [
  { id: 'ALL', label: 'All Actions' },
  { id: 'USER_DEACTIVATED', label: 'User Deactivated' },
  { id: 'USER_ACTIVATED', label: 'User Activated' },
  { id: 'USER_ROLE_CHANGED', label: 'Role Changed' },
  { id: 'STORE_DEACTIVATED', label: 'Store Deactivated' },
  { id: 'STORE_ACTIVATED', label: 'Store Activated' },
  { id: 'FLASH_SALE_PAUSED', label: 'Deal Paused' },
  { id: 'FLASH_SALE_CANCELLED', label: 'Deal Cancelled' }
];

function AdminActivityLogs() {
  const { addToast } = useToast();

  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [activeAction, setActiveAction] = useState('ALL');
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminService.getActivityLogs({
        page,
        limit: 20,
        action: activeAction !== 'ALL' ? activeAction : undefined
      });

      if (res.success && res.data) {
        setLogs(res.data.logs || []);
        setPagination(res.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('[AdminActivityLogs] Fetch error:', err);
      addToast('Unable to load activity logs.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, activeAction, addToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatMetadata = (metadata = {}) => {
    if (!metadata || Object.keys(metadata).length === 0) return '—';
    return Object.entries(metadata)
      .map(([key, val]) => `${key}: ${val}`)
      .join(' • ');
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#1F2937] flex font-sans">
      <AdminSidebar
        activeTab="activity-logs"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <AdminTopbar
          title="Activity &amp; Audit Logs"
          subtitle="Chronological audit record of administrative mutations, security role changes, and store activations."
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <PageContainer>
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#1F2937] tracking-tight flex items-center gap-2">
                  <ScrollText className="w-6 h-6 text-[#2E7D32]" />
                  <span>Administrative Audit Trail ({pagination.total})</span>
                </h2>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Immutable audit records tracking platform administrative actions.
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                icon={RotateCcw}
                onClick={fetchLogs}
                className="text-xs"
              >
                Refresh Logs
              </Button>
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none bg-white p-3 rounded-2xl border border-[#E5E7EB] shadow-2xs">
              {actionFilters.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveAction(tab.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    activeAction === tab.id
                      ? 'bg-[#2E7D32] text-white shadow-2xs'
                      : 'bg-slate-50 border border-[#E5E7EB] text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Logs Table */}
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} padding="p-4">
                    <Skeleton height="h-6" width="w-1/3" />
                    <Skeleton height="h-4" width="w-1/2" className="mt-2" />
                  </Card>
                ))}
              </div>
            ) : logs.length === 0 ? (
              <EmptyState
                icon={ScrollText}
                title="No activity logs found"
                description="No administrative activities have been logged matching this filter."
              />
            ) : (
              <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-[#E5E7EB] text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                        <th className="p-4">Timestamp</th>
                        <th className="p-4">Admin User</th>
                        <th className="p-4">Action</th>
                        <th className="p-4">Entity Type</th>
                        <th className="p-4">Action Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {logs.map((l) => (
                        <tr key={l._id} className="hover:bg-slate-50/75 transition-colors">
                          <td className="p-4 font-mono text-slate-500 whitespace-nowrap">
                            {new Date(l.createdAt).toLocaleString('en-IN')}
                          </td>
                          <td className="p-4 font-bold text-slate-900">
                            <span className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span>{l.userId?.name || 'Administrator'}</span>
                            </span>
                            <span className="text-[11px] text-slate-400 font-normal block font-mono">
                              {l.userId?.email}
                            </span>
                          </td>
                          <td className="p-4">
                            <Badge variant="info">{l.action}</Badge>
                          </td>
                          <td className="p-4 font-bold text-slate-700">
                            {l.entityType}
                          </td>
                          <td className="p-4 text-slate-600 text-[11px] font-medium max-w-md truncate">
                            {formatMetadata(l.metadata)}
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

export default AdminActivityLogs;
