import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import adminService from '../../services/adminService';
import AdminSidebar from '../../components/layout/AdminSidebar';
import AdminTopbar from '../../components/layout/AdminTopbar';
import PageContainer from '../../components/layout/PageContainer';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import {
  Users,
  Store,
  Boxes,
  Zap,
  ShoppingBag,
  Clock3,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Activity,
  ArrowRight,
  ShieldCheck,
  ScrollText,
  RotateCcw,
  Sparkles
} from 'lucide-react';

function AdminDashboard() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, healthRes, logsRes] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getSystemHealth(),
        adminService.getActivityLogs({ limit: 5 })
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (healthRes.success && healthRes.data) {
        setHealth(healthRes.data);
      }
      if (logsRes.success && logsRes.data) {
        setRecentLogs(logsRes.data.logs || []);
      }
    } catch (err) {
      console.error('[AdminDashboard] Fetch error:', err);
      addToast('Unable to load platform data.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#1F2937] flex font-sans">
      <AdminSidebar
        activeTab="dashboard"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <AdminTopbar
          title="Platform Overview"
          subtitle="Monitor SmartShelf activity, inventory health, and food waste reduction."
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <PageContainer>
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-[#1F2937] tracking-tight">
                    SmartShelf Platform Dashboard
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold border border-emerald-200">
                    Live System
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Real-time database counts, active stores, live deals, and automated cron monitoring.
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                icon={RotateCcw}
                onClick={fetchDashboardData}
                className="text-xs"
              >
                Refresh Data
              </Button>
            </div>

            {/* System Health Quick Status Banner */}
            {health && (
              <div className="p-4 rounded-2xl bg-white border border-[#E5E7EB] shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#2E7D32] flex items-center justify-center font-bold border border-emerald-200">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <span>System Status</span>
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" /> All Services Operational
                      </span>
                    </h4>
                    <p className="text-[11px] text-[#6B7280]">
                      Database: <strong>{health.database?.status}</strong> • Expiry Job: <strong>{health.jobs?.expiryJob?.lastStatus}</strong> • Reservation Cleanup: <strong>{health.jobs?.reservationJob?.lastStatus}</strong>
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/admin/system-health')}
                  className="text-xs shrink-0"
                >
                  Inspect Health <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            )}

            {/* Platform Metrics Cards Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Card key={i} padding="p-5">
                    <Skeleton height="h-4" width="w-1/2" className="mb-2" />
                    <Skeleton height="h-8" width="w-1/3" />
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Users */}
                <Card hover padding="p-5" className="border-l-4 border-l-blue-500">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Users</span>
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
                    {stats?.users ?? 0}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Platform registered accounts</p>
                </Card>

                {/* 2. Total Stores */}
                <Card hover padding="p-5" className="border-l-4 border-l-emerald-500">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Stores</span>
                    <Store className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
                    {stats?.stores ?? 0}
                  </div>
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                    {stats?.activeStores ?? 0} currently active
                  </p>
                </Card>

                {/* 3. Active Flash Sales */}
                <Card hover padding="p-5" className="border-l-4 border-l-amber-500">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Flash Sales</span>
                    <Zap className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
                    {stats?.activeFlashSales ?? 0}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Live customer discounts</p>
                </Card>

                {/* 4. Pending Reservations */}
                <Card hover padding="p-5" className="border-l-4 border-l-purple-500">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Orders</span>
                    <ShoppingBag className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
                    {stats?.pendingOrders ?? 0}
                  </div>
                  <p className="text-[11px] text-purple-700 font-semibold mt-1">30-min active holds</p>
                </Card>

                {/* 5. Inventory Batches */}
                <Card hover padding="p-5" className="border-l-4 border-l-indigo-500">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inventory Batches</span>
                    <Boxes className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
                    {stats?.inventoryBatches ?? 0}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Across all active stores</p>
                </Card>

                {/* 6. Products Catalog */}
                <Card hover padding="p-5" className="border-l-4 border-l-cyan-500">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Products</span>
                    <Boxes className="w-5 h-5 text-cyan-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
                    {stats?.products ?? 0}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Master catalog records</p>
                </Card>

                {/* 7. Expiring Today */}
                <Card hover padding="p-5" className="border-l-4 border-l-orange-500">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expiring Today</span>
                    <Clock3 className="w-5 h-5 text-orange-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
                    {stats?.expiringToday ?? 0}
                  </div>
                  <p className="text-[11px] text-orange-600 font-semibold mt-1">Requires immediate sale</p>
                </Card>

                {/* 8. Expired Batches */}
                <Card hover padding="p-5" className="border-l-4 border-l-rose-500">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Expired Batches</span>
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
                    {stats?.expiredBatches ?? 0}
                  </div>
                  <p className="text-[11px] text-rose-600 font-semibold mt-1">Marked expired / archived</p>
                </Card>
              </div>
            )}

            {/* Quick Action Navigation Grid */}
            <div className="space-y-3">
              <h3 className="text-sm font-extrabold text-[#1F2937] uppercase tracking-wider">
                Platform Navigation &amp; Controls
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  icon={Users}
                  onClick={() => navigate('/admin/users')}
                  className="justify-center text-xs py-2.5 bg-white"
                >
                  Users
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={Store}
                  onClick={() => navigate('/admin/stores')}
                  className="justify-center text-xs py-2.5 bg-white"
                >
                  Stores
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={Zap}
                  onClick={() => navigate('/admin/flash-sales')}
                  className="justify-center text-xs py-2.5 bg-white"
                >
                  Flash Sales
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={ShoppingBag}
                  onClick={() => navigate('/admin/orders')}
                  className="justify-center text-xs py-2.5 bg-white"
                >
                  Orders
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={Clock3}
                  onClick={() => navigate('/admin/expiry-waste')}
                  className="justify-center text-xs py-2.5 bg-white"
                >
                  Food Waste
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={ScrollText}
                  onClick={() => navigate('/admin/activity-logs')}
                  className="justify-center text-xs py-2.5 bg-white"
                >
                  Audit Logs
                </Button>
              </div>
            </div>

            {/* Recent Activity Audit Feed Preview */}
            <Card padding="p-6" className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
                <div className="flex items-center gap-2">
                  <ScrollText className="w-4 h-4 text-[#2E7D32]" />
                  <h3 className="text-sm font-extrabold text-[#1F2937]">Recent Administrative Activity</h3>
                </div>
                <Link to="/admin/activity-logs" className="text-xs font-bold text-[#2E7D32] hover:underline flex items-center gap-1">
                  View Full Audit Log <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {recentLogs.length === 0 ? (
                <p className="text-xs text-[#6B7280] py-4 text-center">No recent administrative actions recorded.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentLogs.map((log) => (
                    <div key={log._id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge variant="info">{log.action}</Badge>
                        <span className="font-semibold text-slate-800 truncate">
                          {log.userId?.name || 'Admin'} performed {log.action} on {log.entityType}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0 font-mono">
                        {new Date(log.createdAt).toLocaleTimeString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </PageContainer>
      </div>
    </div>
  );
}

export default AdminDashboard;
