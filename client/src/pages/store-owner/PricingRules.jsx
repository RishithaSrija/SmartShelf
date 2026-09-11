import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import pricingService from '../../services/pricingService';
import storeService from '../../services/storeService';

// Layout & UI Components
import Sidebar from '../../components/layout/Sidebar';
import Topbar from '../../components/layout/Topbar';
import PageContainer from '../../components/layout/PageContainer';
import Card, { CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';

// Icons
import {
  Zap,
  Plus,
  Edit3,
  Trash2,
  Power,
  RefreshCw,
  Calculator,
  AlertTriangle,
  Clock3,
  CheckCircle2,
  Info
} from 'lucide-react';

function PricingRules() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [store, setStore] = useState(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Recalculating All state
  const [recalculating, setRecalculating] = useState(false);

  // Rule Form Modal state
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleFormData, setRuleFormData] = useState({
    daysRemainingMin: '',
    daysRemainingMax: '',
    discountPercentage: ''
  });
  const [ruleSubmitting, setRuleSubmitting] = useState(false);
  const [ruleError, setRuleError] = useState('');

  // Live Price Preview Widget state
  const [previewInput, setPreviewInput] = useState({
    originalPrice: '100',
    expiryDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
  });
  const [previewResult, setPreviewResult] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    storeService.getMyStore().then((res) => {
      if (res.success && res.data) setStore(res.data);
    });
  }, []);

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await pricingService.getPricingRules();
      if (res.success && res.data) {
        setRules(res.data);
      }
    } catch (err) {
      console.error('[PricingRules] Fetch error:', err);
      addToast('Unable to load pricing rules.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Initial Price Preview calculation on load
  const handlePreviewCalculate = async (e) => {
    if (e) e.preventDefault();
    if (!previewInput.originalPrice || !previewInput.expiryDate) return;

    try {
      setPreviewLoading(true);
      const res = await pricingService.previewPrice(previewInput.originalPrice, previewInput.expiryDate);
      if (res.success && res.data) {
        setPreviewResult(res.data);
      }
    } catch (err) {
      console.error('[Preview] Error:', err);
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    handlePreviewCalculate();
  }, []);

  // Handle Recalculate All Inventory Prices
  const handleRecalculateAll = async () => {
    try {
      setRecalculating(true);
      const res = await pricingService.recalculateStoreInventory();
      if (res.success && res.data) {
        const { processed, updated, expired, expiringSoon } = res.data;
        addToast(
          `Recalculation complete! Updated ${updated} of ${processed} batches (${expiringSoon} expiring soon, ${expired} expired).`,
          'success'
        );
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to recalculate store inventory.', 'error');
    } finally {
      setRecalculating(false);
    }
  };

  // Open modal for Create / Edit rule
  const handleOpenRuleModal = (rule = null) => {
    setRuleError('');
    if (rule) {
      setEditingRule(rule);
      setRuleFormData({
        daysRemainingMin: String(rule.daysRemainingMin),
        daysRemainingMax: String(rule.daysRemainingMax),
        discountPercentage: String(rule.discountPercentage)
      });
    } else {
      setEditingRule(null);
      setRuleFormData({
        daysRemainingMin: '2',
        daysRemainingMax: '3',
        discountPercentage: '25'
      });
    }
    setRuleModalOpen(true);
  };

  // Submit Rule Form
  const handleRuleSubmit = async (e) => {
    e.preventDefault();
    setRuleError('');

    const minDays = Number(ruleFormData.daysRemainingMin);
    const maxDays = Number(ruleFormData.daysRemainingMax);
    const discount = Number(ruleFormData.discountPercentage);

    if (isNaN(minDays) || minDays < 0) {
      setRuleError('Minimum days must be a non-negative number.');
      return;
    }

    if (isNaN(maxDays) || maxDays < minDays) {
      setRuleError('Maximum days must be greater than or equal to minimum days.');
      return;
    }

    if (isNaN(discount) || discount < 0 || discount > 100) {
      setRuleError('Discount percentage must be between 0% and 100%.');
      return;
    }

    try {
      setRuleSubmitting(true);
      if (editingRule) {
        const res = await pricingService.updatePricingRule(editingRule._id, {
          daysRemainingMin: minDays,
          daysRemainingMax: maxDays,
          discountPercentage: discount
        });
        if (res.success) {
          addToast('Pricing rule updated successfully!', 'success');
          setRuleModalOpen(false);
          fetchRules();
        }
      } else {
        const res = await pricingService.createPricingRule({
          daysRemainingMin: minDays,
          daysRemainingMax: maxDays,
          discountPercentage: discount
        });
        if (res.success) {
          addToast('Pricing rule created successfully!', 'success');
          setRuleModalOpen(false);
          fetchRules();
        }
      }
    } catch (err) {
      setRuleError(err.response?.data?.message || 'Failed to save pricing rule.');
    } finally {
      setRuleSubmitting(false);
    }
  };

  // Toggle Rule Active Status
  const handleToggleStatus = async (ruleId, currentStatus) => {
    try {
      const res = await pricingService.updatePricingRuleStatus(ruleId, !currentStatus);
      if (res.success) {
        addToast(`Rule is now ${!currentStatus ? 'Active' : 'Inactive'}.`, 'success');
        fetchRules();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to toggle status.', 'error');
    }
  };

  // Delete Rule
  const handleDeleteConfirm = async () => {
    if (!ruleToDelete) return;
    try {
      setDeleting(true);
      const res = await pricingService.deletePricingRule(ruleToDelete._id);
      if (res.success) {
        addToast('Pricing rule deleted successfully.', 'success');
        setDeleteModalOpen(false);
        setRuleToDelete(null);
        fetchRules();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Unable to delete rule.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const formatDaysLabel = (min, max) => {
    if (min === 0 && max === 0) return 'Today (0 days)';
    if (min === max) return `${min} ${min === 1 ? 'day' : 'days'}`;
    if (max >= 9999) return `${min}+ days`;
    return `${min}–${max} days`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#1F2937] flex font-sans">
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
          title="Pricing Engine & Rules"
          storeName={store?.name}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <PageContainer>
          {/* Header & Recalculate CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-[#1F2937] tracking-tight">
                Pricing Rules
              </h2>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Automatically adjust prices as products approach expiry.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="md"
                icon={RefreshCw}
                loading={recalculating}
                onClick={handleRecalculateAll}
              >
                Recalculate All Inventory Prices
              </Button>

              <Button
                variant="primary"
                size="md"
                icon={Plus}
                onClick={() => handleOpenRuleModal(null)}
              >
                Add Pricing Rule
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Rules Table Column */}
            <div className="lg:col-span-2 space-y-6">
              <Card padding="p-0" className="overflow-hidden">
                <CardHeader className="p-6 pb-4 mb-0 border-b border-[#E5E7EB]">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#2E7D32]" />
                    <span>Store Pricing Discount Matrix</span>
                  </CardTitle>
                  <CardDescription>
                    Discount tiers automatically evaluate based on days remaining until batch expiry date.
                  </CardDescription>
                </CardHeader>

                {loading ? (
                  <div className="p-6 space-y-3">
                    <Skeleton height="h-10" />
                    <Skeleton height="h-10" />
                    <Skeleton height="h-10" />
                  </div>
                ) : rules.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No pricing rules configured for this store.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-[#E5E7EB] text-[#6B7280] font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-3.5 px-6">Days Until Expiry</th>
                          <th className="py-3.5 px-6">Discount %</th>
                          <th className="py-3.5 px-6">Status</th>
                          <th className="py-3.5 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB] text-[#1F2937]">
                        {rules.map((rule) => (
                          <tr key={rule._id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-4 px-6 font-extrabold text-slate-900 text-sm">
                              {formatDaysLabel(rule.daysRemainingMin, rule.daysRemainingMax)}
                            </td>

                            <td className="py-4 px-6 font-black text-sm text-[#2E7D32]">
                              {rule.discountPercentage}% OFF
                            </td>

                            <td className="py-4 px-6">
                              <Badge variant={rule.isActive ? 'AVAILABLE' : 'EXPIRED'}>
                                {rule.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>

                            <td className="py-4 px-6 text-right space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                title={rule.isActive ? 'Deactivate' : 'Activate'}
                                onClick={() => handleToggleStatus(rule._id, rule.isActive)}
                              >
                                <Power className={`w-4 h-4 ${rule.isActive ? 'text-amber-600' : 'text-[#2E7D32]'}`} />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                title="Edit Rule"
                                onClick={() => handleOpenRuleModal(rule)}
                              >
                                <Edit3 className="w-4 h-4 text-blue-600" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                title="Delete Rule"
                                onClick={() => {
                                  setRuleToDelete(rule);
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
                )}
              </Card>

              {/* Engine Logic Rules Card */}
              <Card padding="p-6" className="bg-[#E8F5E9]/30 border-emerald-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#2E7D32] mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  <span>Dynamic Engine Rules</span>
                </h4>
                <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside leading-relaxed">
                  <li>Expiry calculation works strictly with <strong>whole calendar days</strong> normalized to midnight.</li>
                  <li>Expired inventory (<code>daysRemaining &lt; 0</code>) automatically receives <code>currentPrice = 0</code> and status <code>EXPIRED</code>.</li>
                  <li>Overlapping ranges across active rules are strictly prevented by backend validation.</li>
                </ul>
              </Card>
            </div>

            {/* Live Price Preview Widget Sidebar */}
            <div className="space-y-6">
              <Card padding="p-6 sm:p-8" className="border-t-4 border-t-[#2E7D32]">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#E5E7EB]">
                  <Calculator className="w-5 h-5 text-[#2E7D32]" />
                  <h3 className="text-base font-extrabold text-[#1F2937]">Live Price Preview</h3>
                </div>

                <form onSubmit={handlePreviewCalculate} className="space-y-4">
                  <Input
                    label="Original Price (₹)"
                    type="number"
                    step="any"
                    required
                    value={previewInput.originalPrice}
                    onChange={(e) => setPreviewInput({ ...previewInput, originalPrice: e.target.value })}
                  />

                  <Input
                    label="Expiry Date"
                    type="date"
                    required
                    value={previewInput.expiryDate}
                    onChange={(e) => setPreviewInput({ ...previewInput, expiryDate: e.target.value })}
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={previewLoading}
                    icon={Calculator}
                    className="w-full"
                  >
                    Calculate Preview
                  </Button>
                </form>

                {previewResult && (
                  <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-semibold">Days Remaining</span>
                      <span className="text-xs font-bold text-slate-900">{previewResult.daysRemaining} days</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-semibold">Discount Applied</span>
                      <span className="text-xs font-black text-[#2E7D32]">{previewResult.discountPercentage}% OFF</span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                      <span className="text-xs text-slate-700 font-extrabold">Current Sale Price</span>
                      <span className="text-lg font-black text-[#2E7D32]">₹{previewResult.currentPrice}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-semibold">Calculated Status</span>
                      <Badge variant={previewResult.status}>{previewResult.status}</Badge>
                    </div>

                    <p className="text-[11px] text-[#2E7D32] font-semibold bg-[#E8F5E9] p-2.5 rounded-xl border border-emerald-200 mt-2">
                      {previewResult.explanation}
                    </p>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </PageContainer>
      </div>

      {/* Add / Edit Rule Modal */}
      <Modal
        isOpen={ruleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        title={editingRule ? 'Edit Pricing Rule' : 'Add Pricing Rule'}
      >
        <form onSubmit={handleRuleSubmit} className="space-y-4">
          {ruleError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{ruleError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Minimum Days"
              type="number"
              min="0"
              required
              value={ruleFormData.daysRemainingMin}
              onChange={(e) => setRuleFormData({ ...ruleFormData, daysRemainingMin: e.target.value })}
              placeholder="e.g. 2"
            />

            <Input
              label="Maximum Days"
              type="number"
              min="0"
              required
              value={ruleFormData.daysRemainingMax}
              onChange={(e) => setRuleFormData({ ...ruleFormData, daysRemainingMax: e.target.value })}
              placeholder="e.g. 3"
            />
          </div>

          <Input
            label="Discount Percentage (%)"
            type="number"
            min="0"
            max="100"
            required
            value={ruleFormData.discountPercentage}
            onChange={(e) => setRuleFormData({ ...ruleFormData, discountPercentage: e.target.value })}
            placeholder="e.g. 20"
          />

          <div className="p-3 rounded-xl bg-[#E8F5E9] text-[#2E7D32] text-xs font-semibold">
            Preview: Products with {formatDaysLabel(Number(ruleFormData.daysRemainingMin) || 0, Number(ruleFormData.daysRemainingMax) || 0)} remaining will receive a {ruleFormData.discountPercentage || 0}% discount.
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" size="sm" type="button" onClick={() => setRuleModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={ruleSubmitting}>
              {editingRule ? 'Save Changes' : 'Create Rule'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Rule Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setRuleToDelete(null);
        }}
        title="Delete Pricing Rule?"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Are you sure you want to delete the pricing rule for <span className="font-bold text-slate-900">{ruleToDelete && formatDaysLabel(ruleToDelete.daysRemainingMin, ruleToDelete.daysRemainingMax)}</span> ({ruleToDelete?.discountPercentage}% OFF)?
          </p>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" size="sm" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" loading={deleting} onClick={handleDeleteConfirm}>
              Delete Rule
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default PricingRules;
