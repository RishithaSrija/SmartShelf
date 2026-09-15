import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useToast } from '../ui/Toast';
import wasteRescueService from '../../services/wasteRescueService';
import {
  ShoppingBag,
  Building2,
  Check,
  Sparkles,
  Clock,
  Package,
  Heart,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

const businessTypes = [
  'Sweet Shop',
  'Bakery',
  'Restaurant',
  'Café',
  'Caterer',
  'Cloud Kitchen',
  'Food Manufacturer',
  'Grocery / Retail',
  'Other'
];

const categoryGroups = [
  {
    name: 'Dairy',
    icon: '🥛',
    items: ['Milk', 'Paneer', 'Curd', 'Butter', 'Cream', 'Ghee']
  },
  {
    name: 'Baking',
    icon: '🧁',
    items: ['Flour', 'Maida', 'Eggs', 'Butter', 'Cream', 'Sugar']
  },
  {
    name: 'Sweet Making',
    icon: '🍬',
    items: ['Milk', 'Ghee', 'Sugar', 'Besan', 'Dry Fruits', 'Jaggery', 'Peanuts']
  },
  {
    name: 'Fruits & Vegetables',
    icon: '🍎',
    items: ['Fruits', 'Vegetables']
  },
  {
    name: 'Staples',
    icon: '🌾',
    items: ['Rice', 'Flour', 'Pulses', 'Spices']
  }
];

const shelfLifeOptions = [
  {
    id: 'any',
    label: 'Any shelf life',
    desc: 'I can use products normally'
  },
  {
    id: 'short',
    label: 'Short shelf life',
    desc: 'I can use products within a few days'
  },
  {
    id: 'urgent',
    label: 'Very urgent',
    desc: 'I can use products expiring soon'
  }
];

export default function SmartPreferencesModal({ isOpen, onClose, currentUser, onUpdated }) {
  const { addToast } = useToast();

  const [customerType, setCustomerType] = useState('personal');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('Sweet Shop');
  const [businessSize, setBusinessSize] = useState('Small');
  const [preferredQuantity, setPreferredQuantity] = useState('small');
  const [buyingFrequency, setBuyingFrequency] = useState('Weekly');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [shelfLifePreference, setShelfLifePreference] = useState('any');
  const [saving, setSaving] = useState(false);

  // Initialize from currentUser
  useEffect(() => {
    if (currentUser) {
      setCustomerType(currentUser.customerType || 'personal');
      setBusinessName(currentUser.businessProfile?.businessName || '');
      setBusinessType(currentUser.businessProfile?.businessType || 'Sweet Shop');
      setBusinessSize(currentUser.businessProfile?.businessSize || 'Small');
      setPreferredQuantity(currentUser.businessProfile?.preferredQuantity || 'small');
      setBuyingFrequency(currentUser.businessProfile?.buyingFrequency || 'Weekly');
      setSelectedCategories(currentUser.smartPreferences?.categories || ['Dairy']);
      setSelectedProducts(currentUser.smartPreferences?.products || ['Milk']);
      setShelfLifePreference(currentUser.smartPreferences?.shelfLifePreference || 'any');
    }
  }, [currentUser, isOpen]);

  const toggleProduct = (productName, categoryName) => {
    setSelectedProducts((prev) => {
      const exists = prev.includes(productName);
      const next = exists ? prev.filter((p) => p !== productName) : [...prev, productName];

      // Auto ensure category is marked if product is selected
      if (!exists && !selectedCategories.includes(categoryName)) {
        setSelectedCategories((cPrev) => [...cPrev, categoryName]);
      }
      return next;
    });
  };

  const toggleCategory = (catName) => {
    setSelectedCategories((prev) =>
      prev.includes(catName) ? prev.filter((c) => c !== catName) : [...prev, catName]
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        customerType,
        businessProfile:
          customerType === 'business'
            ? {
                businessName: businessName.trim() || undefined,
                businessType,
                businessSize,
                preferredQuantity,
                buyingFrequency,
                optInDiscovery: true
              }
            : undefined,
        smartPreferences: {
          categories: selectedCategories,
          products: selectedProducts,
          shelfLifePreference,
          bulkBuying: preferredQuantity === 'bulk'
        }
      };

      const res = await wasteRescueService.updatePreferences(payload);
      if (res.success && res.data) {
        addToast(
          `Preferences saved! Switched to ${customerType === 'business' ? 'Business Shopping' : 'Personal Shopping'}.`,
          'success'
        );
        if (onUpdated) onUpdated(res.data);
        onClose();
      }
    } catch (err) {
      console.error('Failed to update preferences:', err);
      addToast(err.response?.data?.message || 'Failed to save preferences.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Shopping Mode &amp; Smart Preferences"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
        {/* Step 1: Customer Type Choice */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            How are you shopping?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Personal Option */}
            <div
              onClick={() => setCustomerType('personal')}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                customerType === 'personal'
                  ? 'border-[#2E7D32] bg-emerald-50/50 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-lg shadow-2xs">
                    🛒
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">Personal</h4>
                    <p className="text-xs text-slate-500">For home &amp; personal use</p>
                  </div>
                </div>
                {customerType === 'personal' && (
                  <span className="w-5 h-5 rounded-full bg-[#2E7D32] text-white flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            </div>

            {/* Business Option */}
            <div
              onClick={() => {
                setCustomerType('business');
                if (preferredQuantity === 'small') setPreferredQuantity('bulk');
              }}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                customerType === 'business'
                  ? 'border-[#2E7D32] bg-emerald-50/50 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-lg shadow-2xs">
                    🏪
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">Business</h4>
                    <p className="text-xs text-slate-500">For shop, kitchen or restaurant</p>
                  </div>
                </div>
                {customerType === 'business' && (
                  <span className="w-5 h-5 rounded-full bg-[#2E7D32] text-white flex items-center justify-center">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Business Profile Details (if Business selected) */}
        {customerType === 'business' && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#2E7D32] flex items-center gap-1.5">
              <Building2 className="w-4 h-4" />
              <span>Tell us about your business</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Business Name (Optional)
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Royal Sweets, Sunrise Café"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Business Type
                </label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
                >
                  {businessTypes.map((bt) => (
                    <option key={bt} value={bt}>
                      {bt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Business Size
                </label>
                <select
                  value={businessSize}
                  onChange={(e) => setBusinessSize(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
                >
                  <option value="Small">Small (1-5 staff)</option>
                  <option value="Medium">Medium (6-20 staff)</option>
                  <option value="Large">Large (20+ staff)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Preferred Purchasing Quantity
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPreferredQuantity('small')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      preferredQuantity === 'small'
                        ? 'bg-[#2E7D32] text-white border-[#2E7D32]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Regular / Small
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreferredQuantity('bulk')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      preferredQuantity === 'bulk'
                        ? 'bg-[#2E7D32] text-white border-[#2E7D32]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    📦 Bulk
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                How often do you buy ingredients? (Optional)
              </label>
              <div className="flex flex-wrap gap-2">
                {['Daily', 'Weekly', 'Biweekly', 'Monthly', 'Occasionally'].map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => setBuyingFrequency(freq)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      buyingFrequency === freq
                        ? 'bg-[#2E7D32] text-white border-[#2E7D32]'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: What do you usually need? */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              What do you usually need?
            </label>
            <span className="text-[11px] text-slate-400">Select multiple items</span>
          </div>

          <div className="space-y-3">
            {categoryGroups.map((group) => (
              <div key={group.name} className="p-3 rounded-2xl bg-white border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <span>{group.icon}</span>
                    <span>{group.name}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleCategory(group.name)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                      selectedCategories.includes(group.name)
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                  >
                    {selectedCategories.includes(group.name) ? '✓ Preferred' : '+ Prefer'}
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {group.items.map((item) => {
                    const isSelected = selectedProducts.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleProduct(item, group.name)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1 ${
                          isSelected
                            ? 'bg-[#2E7D32] text-white border-[#2E7D32] shadow-2xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>{item}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step 4: Urgency / Shelf-Life Preference */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            How fresh does it need to be?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {shelfLifeOptions.map((opt) => (
              <div
                key={opt.id}
                onClick={() => setShelfLifePreference(opt.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  shelfLifePreference === opt.id
                    ? 'border-[#2E7D32] bg-emerald-50 text-[#2E7D32]'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold">{opt.label}</span>
                  {shelfLifePreference === opt.id && <Check className="w-3.5 h-3.5" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">"{opt.desc}"</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-400">
            You can change this anytime from your dashboard.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={saving}
              onClick={handleSave}
              className="bg-[#2E7D32] hover:bg-[#1B5E20]"
            >
              Save Preferences
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
