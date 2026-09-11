import React, { useState, useEffect, useCallback } from 'react';
import adminService from '../../services/adminService';
import AdminSidebar from '../../components/layout/AdminSidebar';
import AdminTopbar from '../../components/layout/AdminTopbar';
import PageContainer from '../../components/layout/PageContainer';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import {
  BarChart3,
  Calendar,
  Zap,
  ShoppingBag,
  TrendingUp,
  RotateCcw,
  Clock3
} from 'lucide-react';

const timeRanges = [
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
  { id: '90d', label: 'Last 90 Days' }
];

function AdminAnalytics() {
  const { addToast } = useToast();

  const [analytics, setAnalytics] = useState(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminService.getAnalytics(timeRange);
      if (res.success && res.data) {
        setAnalytics(res.data);
      }
    } catch (err) {
      console.error('[AdminAnalytics] Fetch error:', err);
      addToast('Unable to load analytics data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [timeRange, addToast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const totalReservations = analytics?.reservations?.reduce((acc, curr) => acc + (curr.count || 0), 0) || 0;
  const totalRevenue = analytics?.reservations?.reduce((acc, curr) => acc + (curr.revenue || 0), 0) || 0;
  const totalFlashSales = analytics?.flashSales?.reduce((acc, curr) => acc + (curr.count || 0), 0) || 0;
  const totalExpired = analytics?.expiredBatches?.reduce((acc, curr) => acc + (curr.count || 0), 0) || 0;

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#1F2937] flex font-sans">
      <AdminSidebar
        activeTab="analytics"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <AdminTopbar
          title="Platform Analytics"
          subtitle="Aggregated time-series trend analysis for deals, reservations, and inventory."
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <PageContainer>
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-4">
              <div>
                <h2 className="text-2xl font-black text-[#1F2937] tracking-tight flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-[#2E7D32]" />
                  <span>Platform Trends &amp; Analytics</span>
                </h2>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Backend-aggregated performance trends over selectable time ranges.
                </p>
              </div>

              {/* Time Range Selector */}
              <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-[#E5E7EB] shadow-2xs">
                {timeRanges.map((tr) => (
                  <button
                    key={tr.id}
                    onClick={() => setTimeRange(tr.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      timeRange === tr.id
                        ? 'bg-[#2E7D32] text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {tr.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Top Summaries */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} padding="p-5">
                    <Skeleton height="h-4" width="w-1/2" />
                    <Skeleton height="h-8" width="w-1/3" className="mt-2" />
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card hover padding="p-5">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reservations Created</span>
                  <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{totalReservations}</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">In the past {timeRange}</p>
                </Card>

                <Card hover padding="p-5">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Sales Volume</span>
                  <div className="text-2xl font-black text-[#2E7D32] mt-1 font-mono">₹{totalRevenue.toFixed(2)}</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">In the past {timeRange}</p>
                </Card>

                <Card hover padding="p-5">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Flash Sales Launched</span>
                  <div className="text-2xl font-black text-amber-600 mt-1 font-mono">{totalFlashSales}</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">In the past {timeRange}</p>
                </Card>

                <Card hover padding="p-5">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expired Batches</span>
                  <div className="text-2xl font-black text-rose-600 mt-1 font-mono">{totalExpired}</div>
                  <p className="text-[11px] text-slate-400 mt-0.5">In the past {timeRange}</p>
                </Card>
              </div>
            )}

            {/* Time-Series Charts Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Flash Sales & Reservations Timeline */}
              <Card padding="p-6" className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-[#2E7D32]" />
                    <span>Customer Reservations Timeline</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-medium font-mono">{timeRange}</span>
                </div>

                {analytics?.reservations?.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No reservations recorded in this time period.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {analytics?.reservations?.map((item) => (
                      <div key={item.date} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50">
                        <span className="font-mono text-slate-500">{item.date}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-900">{item.count} orders</span>
                          <span className="font-black text-[#2E7D32]">₹{item.revenue?.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Flash Sales Created Timeline */}
              <Card padding="p-6" className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Flash Sales Created Timeline</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-medium font-mono">{timeRange}</span>
                </div>

                {analytics?.flashSales?.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No flash sales created in this time period.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {analytics?.flashSales?.map((item) => (
                      <div key={item.date} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-50">
                        <span className="font-mono text-slate-500">{item.date}</span>
                        <span className="font-bold text-amber-700">{item.count} deals created</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </PageContainer>
      </div>
    </div>
  );
}

export default AdminAnalytics;
