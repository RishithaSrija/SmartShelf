import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import inventoryService from '../../services/inventoryService';
import storeService from '../../services/storeService';

// Layout & UI Components
import Sidebar from '../../components/layout/Sidebar';
import Topbar from '../../components/layout/Topbar';
import PageContainer from '../../components/layout/PageContainer';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';

// Icons
import {
  Clock3,
  Eye,
  Edit3,
  Calendar,
  AlertTriangle,
  Boxes,
  Zap,
  CheckCircle2
} from 'lucide-react';

const dayFilterOptions = [
  { value: '1', label: 'Expires Today & Tomorrow' },
  { value: '3', label: 'Expires Within 3 Days' },
  { value: '7', label: 'Expires Within 7 Days' },
  { value: '14', label: 'Expires Within 14 Days' },
  { value: '30', label: 'Expires Within 30 Days' }
];

function ExpiringSoon() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [store, setStore] = useState(null);
  const [batches, setBatches] = useState([]);
  const [daysFilter, setDaysFilter] = useState('7');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    storeService.getMyStore().then((res) => {
      if (res.success && res.data) setStore(res.data);
    });
  }, []);

  const fetchExpiringBatches = useCallback(async () => {
    try {
      setLoading(true);
      const res = await inventoryService.getExpiringBatches({ days: daysFilter });
      if (res.success && res.data) {
        setBatches(res.data);
      }
    } catch (err) {
      console.error('[ExpiringSoon] Fetch error:', err);
      addToast('Unable to load expiring inventory.', 'error');
    } finally {
      setLoading(false);
    }
  }, [daysFilter, addToast]);

  useEffect(() => {
    fetchExpiringBatches();
  }, [fetchExpiringBatches]);

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#1F2937] flex font-sans font-normal">
      <Sidebar
        activeTab="expiring"
        onSelectTab={(tab) => {
          if (tab === 'overview' || tab === 'settings') navigate('/store-owner');
          if (tab === 'products') navigate('/store-owner/products');
          if (tab === 'inventory') navigate('/store-owner/inventory');
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Topbar
          title="Expiring Soon Watchlist"
          storeName={store?.name}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <PageContainer>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-[#1F2937] tracking-tight flex items-center gap-2">
                <Clock3 className="w-6 h-6 text-[#2E7D32]" />
                <span>Expiring Soon</span>
              </h2>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Monitor products approaching their expiry date.
              </p>
            </div>

            <div className="w-full sm:w-60">
              <Select
                value={daysFilter}
                onChange={(e) => setDaysFilter(e.target.value)}
                options={dayFilterOptions}
              />
            </div>
          </div>

          {/* Expiring Batches List */}
          {loading ? (
            <Card padding="p-6">
              <div className="space-y-4">
                <Skeleton height="h-10" />
                <Skeleton height="h-10" />
                <Skeleton height="h-10" />
              </div>
            </Card>
          ) : batches.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No batches expiring in this window"
              description={`None of your inventory batches are expiring within the next ${daysFilter} days. Outstanding inventory management!`}
              actionButton={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setDaysFilter('30')}
                >
                  Expand Expiry Window
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
                      <th className="py-3.5 px-4">Quantity</th>
                      <th className="py-3.5 px-4">Original Price</th>
                      <th className="py-3.5 px-4">Current Price</th>
                      <th className="py-3.5 px-4">Expiry Date</th>
                      <th className="py-3.5 px-4">Days Left</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] text-[#1F2937]">
                    {batches.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold">
                          <p className="text-sm font-extrabold text-[#1F2937] leading-tight">
                            {item.productId?.name || 'Unknown Product'}
                          </p>
                          <p className="text-[11px] font-normal text-[#6B7280]">
                            {item.productId?.category} • {item.productId?.unit}
                          </p>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                          {item.batchNumber}
                        </td>

                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {item.quantity} units
                        </td>

                        <td className="py-3.5 px-4 font-bold text-slate-700">
                          {item.discountPercentage > 0 ? (
                            <span className="line-through text-slate-400">₹{item.originalPrice}</span>
                          ) : (
                            <span>₹{item.originalPrice}</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-extrabold text-[#2E7D32]">
                          <div className="flex items-center gap-1.5">
                            <span>₹{item.currentPrice}</span>
                            {item.discountPercentage > 0 && (
                              <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-[#E8F5E9] text-[#2E7D32] border border-emerald-200">
                                {item.discountPercentage}% OFF
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          {new Date(item.expiryDate).toLocaleDateString()}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`font-black ${item.daysRemaining <= 1 ? 'text-rose-700' : 'text-amber-700'}`}>
                            {item.daysRemaining === 0 ? 'Expires Today' : item.daysRemaining === 1 ? 'Expires Tomorrow' : `${item.daysRemaining} days`}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <Badge variant={item.status}>{item.status}</Badge>
                        </td>

                        <td className="py-3.5 px-4 text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="View Batch Details"
                            onClick={() => navigate(`/store-owner/inventory/${item._id}`)}
                          >
                            <Eye className="w-4 h-4 text-slate-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Edit Batch"
                            onClick={() => navigate(`/store-owner/inventory/${item._id}/edit`)}
                          >
                            <Edit3 className="w-4 h-4 text-blue-600" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="md:hidden divide-y divide-[#E5E7EB]">
                {batches.map((item) => (
                  <div key={item._id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-extrabold text-sm text-[#1F2937]">{item.productId?.name}</h4>
                        <p className="text-xs font-mono font-bold text-slate-500">Batch #{item.batchNumber}</p>
                      </div>
                      <Badge variant={item.status}>{item.status}</Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-slate-500 block">Current Price:</span>
                        <span className="font-extrabold text-[#2E7D32]">
                          ₹{item.currentPrice} {item.discountPercentage > 0 && `(${item.discountPercentage}% OFF)`}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-slate-500 block">Days Left:</span>
                        <span className="font-extrabold text-amber-700">{item.daysRemaining} days</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1 pt-1">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/store-owner/inventory/${item._id}`)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/store-owner/inventory/${item._id}/edit`)}>
                        <Edit3 className="w-4 h-4 text-blue-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </PageContainer>
      </div>
    </div>
  );
}

export default ExpiringSoon;
