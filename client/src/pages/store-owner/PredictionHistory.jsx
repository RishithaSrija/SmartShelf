import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import mlService from '../../services/mlService';
import Sidebar from '../../components/layout/Sidebar';
import Topbar from '../../components/layout/Topbar';
import PageContainer from '../../components/layout/PageContainer';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import {
  History,
  TrendingUp,
  Package,
  Calendar,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';

function PredictionHistory() {
  const { addToast } = useToast();

  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [page, setPage] = useState(1);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await mlService.getPredictionHistory({ page, limit: 20 });
      if (res.success && res.data) {
        setLogs(res.data.logs || []);
        setPagination(res.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('[PredictionHistory] Fetch error:', err);
      addToast('Unable to load prediction history.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, addToast]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#1F2937] flex font-sans">
      <Sidebar
        activeTab="demand-prediction"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Topbar
          title="Prediction History"
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <PageContainer>
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-[#1F2937] tracking-tight flex items-center gap-2">
                    <History className="w-6 h-6 text-[#2E7D32]" />
                    <span>Demand Prediction Logs ({pagination.total})</span>
                  </h2>
                </div>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Audit log of past demand forecasts and inventory snapshots.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link to="/store-owner/demand-prediction">
                  <Button variant="outline" size="sm" icon={ArrowLeft} className="text-xs">
                    Back to Predictor
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={RotateCcw}
                  onClick={fetchHistory}
                  className="text-xs"
                >
                  Refresh
                </Button>
              </div>
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
                icon={TrendingUp}
                title="No prediction logs yet"
                description="Run demand predictions on your products to record forecast history."
                action={
                  <Link to="/store-owner/demand-prediction">
                    <Button variant="primary" size="sm">
                      Run First Prediction
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-[#E5E7EB] text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                        <th className="p-4">Product</th>
                        <th className="p-4">Target Date</th>
                        <th className="p-4">Predicted Demand</th>
                        <th className="p-4">Inventory at Request</th>
                        <th className="p-4">Model Version</th>
                        <th className="p-4">Requested At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {logs.map((log) => (
                        <tr key={log._id} className="hover:bg-slate-50/75 transition-colors">
                          <td className="p-4">
                            <p className="font-extrabold text-slate-900">
                              {log.productName || log.productId?.name || 'Product'}
                            </p>
                            {log.productId?.category && (
                              <span className="text-[10px] text-slate-400 font-bold uppercase">
                                {log.productId.category}
                              </span>
                            )}
                          </td>
                          <td className="p-4 font-mono font-bold text-slate-800">
                            {new Date(log.predictionDate).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="p-4">
                            <span className="font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              {log.predictedDemand} units
                            </span>
                          </td>
                          <td className="p-4 text-slate-700">
                            {log.currentInventory ?? '—'} units
                          </td>
                          <td className="p-4 font-mono text-[11px] text-slate-500">
                            {log.modelVersion || '1.0'}
                          </td>
                          <td className="p-4 text-[11px] text-slate-400">
                            {new Date(log.createdAt).toLocaleString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
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

export default PredictionHistory;
