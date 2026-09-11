import React, { useState, useEffect, useCallback } from 'react';
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
  Clock3,
  TrendingDown,
  ShieldCheck,
  Zap,
  ShoppingBag,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  HeartHandshake,
  CheckCircle2,
  DollarSign
} from 'lucide-react';

function AdminExpiryWaste() {
  const { addToast } = useToast();

  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminService.getExpiryWasteMetrics();
      if (res.success && res.data) {
        setMetrics(res.data);
      }
    } catch (err) {
      console.error('[AdminExpiryWaste] Fetch error:', err);
      addToast('Unable to load waste metrics.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#1F2937] flex font-sans">
      <AdminSidebar
        activeTab="expiry-waste"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <AdminTopbar
          title="Food Waste Prevention Dashboard"
          subtitle="Real-time metrics on discounted inventory, near-expiry products, and recovered retail value."
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <PageContainer>
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-[#1F2937] tracking-tight">
                    Expiry &amp; Food Waste Impact
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold border border-emerald-200">
                    Mission Impact
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  "Save food. Save money." — Monitoring the reduction of edible food waste across retail stores.
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                icon={RotateCcw}
                onClick={fetchMetrics}
                className="text-xs"
              >
                Refresh Metrics
              </Button>
            </div>

            {/* Waste Metrics Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} padding="p-6">
                    <Skeleton height="h-6" width="w-1/2" />
                    <Skeleton height="h-10" width="w-1/3" className="mt-3" />
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 1. Recovered Sales Value */}
                <Card padding="p-6" className="bg-emerald-900 text-white border-none shadow-md">
                  <div className="flex items-center justify-between text-emerald-300">
                    <span className="text-xs font-bold uppercase tracking-wider">Recovered Sales Value</span>
                    <HeartHandshake className="w-5 h-5 text-emerald-300" />
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-white mt-3 font-mono">
                    ₹{metrics?.recoveredSalesValue ?? 0}
                  </div>
                  <p className="text-xs text-emerald-200 mt-2">
                    Value of near-expiry food rescued through completed customer reservations.
                  </p>
                </Card>

                {/* 2. Rescued Food Units */}
                <Card padding="p-6" className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white border-none shadow-md">
                  <div className="flex items-center justify-between text-blue-300">
                    <span className="text-xs font-bold uppercase tracking-wider">Rescued Food Units</span>
                    <ShoppingBag className="w-5 h-5 text-blue-300" />
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-white mt-3 font-mono">
                    {metrics?.rescuedUnits ?? 0} <span className="text-sm font-normal text-blue-200">units</span>
                  </div>
                  <p className="text-xs text-blue-200 mt-2">
                    Total physical units of near-expiry inventory sold before expiry.
                  </p>
                </Card>

                {/* 3. Discounted Inventory Batches */}
                <Card padding="p-6" className="bg-white border border-[#E5E7EB] shadow-2xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="text-xs font-bold uppercase tracking-wider">Dynamic Discounted Batches</span>
                    <Zap className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-slate-900 mt-3 font-mono">
                    {metrics?.discountedBatches ?? 0}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Batches dynamically marked down by expiry pricing rules.
                  </p>
                </Card>

                {/* 4. Expiring Today */}
                <Card padding="p-6" className="bg-white border border-[#E5E7EB] shadow-2xs">
                  <div className="flex items-center justify-between text-orange-600">
                    <span className="text-xs font-bold uppercase tracking-wider">Batches Expiring Today</span>
                    <Clock3 className="w-5 h-5 text-orange-500" />
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-slate-900 mt-3 font-mono">
                    {metrics?.expiringToday ?? 0}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Requires immediate flash sale promotion or clearance.
                  </p>
                </Card>

                {/* 5. Expiring Tomorrow */}
                <Card padding="p-6" className="bg-white border border-[#E5E7EB] shadow-2xs">
                  <div className="flex items-center justify-between text-amber-600">
                    <span className="text-xs font-bold uppercase tracking-wider">Batches Expiring Tomorrow</span>
                    <Clock3 className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-slate-900 mt-3 font-mono">
                    {metrics?.expiringTomorrow ?? 0}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Eligible for dynamic markdown rules within 24-48 hours.
                  </p>
                </Card>

                {/* 6. Expired Batches */}
                <Card padding="p-6" className="bg-white border border-[#E5E7EB] shadow-2xs">
                  <div className="flex items-center justify-between text-rose-600">
                    <span className="text-xs font-bold uppercase tracking-wider">Expired Batches</span>
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-slate-900 mt-3 font-mono">
                    {metrics?.expiredBatches ?? 0}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Unsold batches past their expiry date (auto-archived).
                  </p>
                </Card>
              </div>
            )}

            {/* Explanatory Policy Card */}
            <Card padding="p-6" className="bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#2E7D32]" />
                <span>Food Waste Prevention Methodology</span>
              </h4>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                SmartShelf connects retail store inventory with consumers in real-time. Dynamic pricing algorithms apply progressive discounts to food approaching its expiration date, enabling shoppers to reserve deals online and collect them in-store. This prevents edible food from reaching landfills while preserving revenue for independent merchants.
              </p>
            </Card>
          </div>
        </PageContainer>
      </div>
    </div>
  );
}

export default AdminExpiryWaste;
