import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import flashSaleService from '../../services/flashSaleService';
import storeService from '../../services/storeService';

// Layout & UI Components
import Sidebar from '../../components/layout/Sidebar';
import Topbar from '../../components/layout/Topbar';
import PageContainer from '../../components/layout/PageContainer';
import Card, { CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';

// Icons
import {
  Zap,
  ArrowLeft,
  AlertTriangle,
  Boxes,
  Clock,
  Tag,
  CheckCircle2
} from 'lucide-react';

function CreateFlashSale() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [store, setStore] = useState(null);
  const [eligibleBatches, setEligibleBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedBatch, setSelectedBatch] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    endsAt: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    storeService.getMyStore().then((res) => {
      if (res.success && res.data) setStore(res.data);
    });

    flashSaleService
      .getEligibleBatches()
      .then((res) => {
        if (res.success && res.data) {
          setEligibleBatches(res.data);
          if (res.data.length > 0) {
            const first = res.data[0];
            setSelectedBatchId(first._id);
            setSelectedBatch(first);
            setFormData({
              title: `${first.productId?.name || 'Item'} — ${first.discountPercentage}% OFF`,
              description: `Special flash sale deal on ${first.productId?.name || 'fresh item'} expiring soon.`,
              endsAt: first.expiryDate ? new Date(first.expiryDate).toISOString().split('T')[0] : ''
            });
          }
        }
      })
      .catch((err) => {
        console.error('[CreateFlashSale] Error fetching eligible batches:', err);
        addToast('Unable to load eligible inventory batches.', 'error');
      })
      .finally(() => setLoading(false));
  }, [addToast]);

  const handleBatchSelect = (batchId) => {
    setSelectedBatchId(batchId);
    const found = eligibleBatches.find((b) => b._id === batchId);
    if (found) {
      setSelectedBatch(found);
      setFormData({
        title: `${found.productId?.name || 'Item'} — ${found.discountPercentage}% OFF`,
        description: `Special flash sale deal on ${found.productId?.name || 'fresh item'} expiring soon.`,
        endsAt: found.expiryDate ? new Date(found.expiryDate).toISOString().split('T')[0] : ''
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!selectedBatchId) {
      setFormError('Please select an eligible inventory batch.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await flashSaleService.createFlashSale({
        inventoryBatchId: selectedBatchId,
        title: formData.title,
        description: formData.description,
        endsAt: formData.endsAt
      });

      if (res.success && res.data) {
        addToast('Flash sale deal published to customer marketplace!', 'success');
        navigate('/store-owner/flash-sales');
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to publish flash sale.');
    } finally {
      setSubmitting(false);
    }
  };

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
          title="Create Flash Sale"
          storeName={store?.name}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <PageContainer>
          <div className="mb-4">
            <Button
              variant="ghost"
              size="sm"
              icon={ArrowLeft}
              onClick={() => navigate('/store-owner/flash-sales')}
            >
              Back to Flash Sales
            </Button>
          </div>

          <div className="max-w-3xl mx-auto">
            {loading ? (
              <Card padding="p-8">
                <Skeleton height="h-10" />
                <Skeleton height="h-10" className="mt-4" />
              </Card>
            ) : eligibleBatches.length === 0 ? (
              <EmptyState
                icon={Zap}
                title="No eligible inventory batches"
                description="To create a flash sale, you need inventory batches with active dynamic discounts (> 0%), available stock (> 0), and expiring in 3 days or less."
                actionButton={
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => navigate('/store-owner/inventory')}
                  >
                    Manage Store Inventory
                  </Button>
                }
              />
            ) : (
              <Card padding="p-6 sm:p-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-[#2E7D32]" />
                    <span>Publish Flash Sale Deal</span>
                  </CardTitle>
                  <CardDescription>
                    Select an eligible batch to feature in the local customer marketplace.
                  </CardDescription>
                </CardHeader>

                {formError && (
                  <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs font-semibold">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Batch Selection Dropdown */}
                  <Select
                    label="Eligible Inventory Batch"
                    required
                    value={selectedBatchId}
                    onChange={(e) => handleBatchSelect(e.target.value)}
                    options={eligibleBatches.map((b) => ({
                      value: b._id,
                      label: `${b.productId?.name} (Batch #${b.batchNumber}) — ${b.discountPercentage}% OFF (₹${b.currentPrice}), ${b.quantity} units, Expires ${new Date(b.expiryDate).toLocaleDateString()}`
                    }))}
                  />

                  {/* Selected Batch Preview Card */}
                  {selectedBatch && (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-900">
                          {selectedBatch.productId?.name}
                        </span>
                        <span className="text-xs font-black text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded border border-emerald-200">
                          {selectedBatch.discountPercentage}% OFF
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500 block">Original Price:</span>
                          <span className="font-bold line-through text-slate-400">₹{selectedBatch.originalPrice}</span>
                        </div>

                        <div>
                          <span className="text-slate-500 block">Flash Sale Price:</span>
                          <span className="font-extrabold text-[#2E7D32]">₹{selectedBatch.currentPrice}</span>
                        </div>

                        <div>
                          <span className="text-slate-500 block">Available Stock:</span>
                          <span className="font-bold text-slate-900">{selectedBatch.quantity} units</span>
                        </div>

                        <div>
                          <span className="text-slate-500 block">Days Left:</span>
                          <span className="font-extrabold text-amber-700">{selectedBatch.daysRemaining} days</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Title & Description */}
                  <Input
                    label="Flash Sale Title"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Fresh Bread — 40% OFF"
                  />

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#1F2937] mb-1.5">
                      Description / Promotion Note
                    </label>
                    <textarea
                      rows="3"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Add promotion details or pickup instructions for nearby customers..."
                      className="block w-full p-3 rounded-xl border border-[#E5E7EB] text-sm text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
                    ></textarea>
                  </div>

                  <Input
                    label="Flash Sale End Date (Max: Batch Expiry)"
                    type="date"
                    required
                    value={formData.endsAt}
                    onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
                  />

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <Button variant="secondary" size="md" type="button" onClick={() => navigate('/store-owner/flash-sales')}>
                      Cancel
                    </Button>
                    <Button variant="primary" size="md" type="submit" loading={submitting} icon={Zap}>
                      Publish Flash Sale
                    </Button>
                  </div>
                </form>
              </Card>
            )}
          </div>
        </PageContainer>
      </div>
    </div>
  );
}

export default CreateFlashSale;
