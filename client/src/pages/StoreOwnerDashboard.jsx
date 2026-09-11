import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import storeService from '../services/storeService';
import inventoryService from '../services/inventoryService';

// Layout & Common Components
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import PageContainer from '../components/layout/PageContainer';

// UI Components
import Card, { CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';

// Icons
import {
  Store,
  PlusCircle,
  Settings,
  LayoutDashboard,
  Power,
  MapPin,
  Clock,
  Phone,
  Mail,
  Building,
  AlertCircle,
  Boxes,
  Zap,
  Clock3,
  TrendingUp,
  Edit3
} from 'lucide-react';

function StoreOwnerDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'settings'
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Real KPI metrics state
  const [kpiMetrics, setKpiMetrics] = useState({
    inventoryValue: 0,
    expiringSoonBatches: 0,
    lowStockBatches: 0,
    totalBatches: 0
  });

  // Store creation form state
  const [createData, setCreateData] = useState({
    name: '',
    businessType: 'GROCERY',
    description: '',
    phone: '',
    email: '',
    address: '',
    openingHours: '',
    latitude: '',
    longitude: ''
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  // Store edit form state
  const [editData, setEditData] = useState({
    name: '',
    businessType: 'GROCERY',
    description: '',
    phone: '',
    email: '',
    address: '',
    openingHours: '',
    latitude: '',
    longitude: ''
  });
  const [updateSubmitting, setUpdateSubmitting] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Fetch store and real KPI metrics on mount
  const fetchStore = useCallback(async () => {
    try {
      setLoading(true);
      const res = await storeService.getMyStore();
      if (res.success && res.data) {
        setStore(res.data);
        setEditData({
          name: res.data.name || '',
          businessType: res.data.businessType || 'GROCERY',
          description: res.data.description || '',
          phone: res.data.phone || '',
          email: res.data.email || '',
          address: res.data.address || '',
          openingHours: res.data.openingHours || '',
          latitude: res.data.location?.coordinates?.[1] || '',
          longitude: res.data.location?.coordinates?.[0] || ''
        });

        // Fetch real inventory summary
        const summaryRes = await inventoryService.getInventorySummary();
        if (summaryRes.success && summaryRes.data) {
          setKpiMetrics({
            inventoryValue: summaryRes.data.inventoryValue || 0,
            expiringSoonBatches: summaryRes.data.expiringSoonBatches || 0,
            lowStockBatches: summaryRes.data.lowStockBatches || 0,
            totalBatches: summaryRes.data.totalBatches || 0
          });
        }
      } else {
        setStore(null);
      }
    } catch (err) {
      console.error('[StoreDashboard] Error fetching store:', err);
      setStore(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStore();
  }, [fetchStore]);

  // Handle store creation
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');

    if (!createData.name.trim()) {
      setCreateError('Store name is required.');
      return;
    }

    try {
      setCreateSubmitting(true);
      const res = await storeService.createStore(createData);
      if (res.success && res.data) {
        addToast('Store registered successfully!', 'success');
        setStore(res.data);
        setEditData({
          name: res.data.name || '',
          businessType: res.data.businessType || 'GROCERY',
          description: res.data.description || '',
          phone: res.data.phone || '',
          email: res.data.email || '',
          address: res.data.address || '',
          openingHours: res.data.openingHours || '',
          latitude: res.data.location?.coordinates?.[1] || '',
          longitude: res.data.location?.coordinates?.[0] || ''
        });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create store.';
      setCreateError(msg);
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Handle store updates
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setUpdateError('');

    try {
      setUpdateSubmitting(true);
      const res = await storeService.updateStore(editData);
      if (res.success && res.data) {
        addToast('Store profile updated successfully!', 'success');
        setStore(res.data);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update store details.';
      setUpdateError(msg);
    } finally {
      setUpdateSubmitting(false);
    }
  };

  // Handle store activation toggle
  const handleToggleStatus = async () => {
    try {
      setTogglingStatus(true);
      const res = await storeService.toggleStoreStatus();
      if (res.success && res.data) {
        const nextState = res.data.isActive;
        setStore(res.data);
        addToast(`Store is now ${nextState ? 'Active' : 'Inactive'}.`, nextState ? 'success' : 'info');
      }
    } catch (err) {
      addToast('Failed to toggle store status.', 'error');
    } finally {
      setTogglingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAF8] flex flex-col items-center justify-center p-6 text-slate-700">
        <Skeleton height="h-10" width="w-10" rounded="rounded-xl" className="mb-3" />
        <p className="text-sm font-semibold text-[#6B7280]">Loading store management console...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#1F2937] flex font-sans">
      {/* Desktop Sidebar Layout */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Topbar
          title={activeTab === 'overview' ? 'Dashboard Overview' : 'Store Settings'}
          storeName={store?.name}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <PageContainer>
          {/* CASE 1: NO STORE REGISTERED YET */}
          {!store ? (
            <Card padding="p-8 sm:p-10" className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <div className="w-14 h-14 rounded-2xl bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                  <PlusCircle className="w-7 h-7" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1F2937] mb-2">
                  Create Your Store
                </h2>
                <p className="text-sm text-[#6B7280] max-w-lg mx-auto leading-relaxed">
                  Register your grocery store, bakery, or food retail business on SmartShelf to start managing inventory batches and automated flash sales.
                </p>
              </div>

              {createError && (
                <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{createError}</span>
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Input
                    label="Store Name"
                    required
                    icon={Store}
                    value={createData.name}
                    onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                    placeholder="e.g. FreshMart Organics"
                  />

                  <Select
                    label="Business Type"
                    required
                    icon={Building}
                    value={createData.businessType}
                    onChange={(e) => setCreateData({ ...createData, businessType: e.target.value })}
                    options={[
                      { value: 'GROCERY', label: 'Grocery Store' },
                      { value: 'BAKERY', label: 'Bakery' },
                      { value: 'RESTAURANT', label: 'Restaurant' },
                      { value: 'SUPERMARKET', label: 'Supermarket' },
                      { value: 'OTHER', label: 'Other Retail' }
                    ]}
                  />
                </div>

                <Input
                  label="Store Address"
                  required
                  icon={MapPin}
                  value={createData.address}
                  onChange={(e) => setCreateData({ ...createData, address: e.target.value })}
                  placeholder="123 Main Street, Sector 4, City"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Input
                    label="Store Phone"
                    type="tel"
                    icon={Phone}
                    value={createData.phone}
                    onChange={(e) => setCreateData({ ...createData, phone: e.target.value })}
                    placeholder="9876543210"
                  />

                  <Input
                    label="Opening Hours"
                    icon={Clock}
                    value={createData.openingHours}
                    onChange={(e) => setCreateData({ ...createData, openingHours: e.target.value })}
                    placeholder="Mon-Sat: 8:00 AM - 9:00 PM"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1F2937] mb-1.5">
                    Store Description
                  </label>
                  <textarea
                    rows="3"
                    value={createData.description}
                    onChange={(e) => setCreateData({ ...createData, description: e.target.value })}
                    placeholder="Describe your store and fresh produce offerings..."
                    className="block w-full p-3 rounded-xl border border-[#E5E7EB] text-sm text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
                  ></textarea>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-[#E5E7EB]">
                  <Input
                    label="Latitude (optional)"
                    type="number"
                    step="any"
                    value={createData.latitude}
                    onChange={(e) => setCreateData({ ...createData, latitude: e.target.value })}
                    placeholder="17.3850"
                  />
                  <Input
                    label="Longitude (optional)"
                    type="number"
                    step="any"
                    value={createData.longitude}
                    onChange={(e) => setCreateData({ ...createData, longitude: e.target.value })}
                    placeholder="78.4867"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={createSubmitting}
                  icon={PlusCircle}
                  className="w-full"
                >
                  Create Store
                </Button>
              </form>
            </Card>
          ) : (
            /* CASE 2: STORE EXISTS — DASHBOARD SHELL WITH REAL KPI DATA */
            <div className="space-y-6">
              {/* Header Greeting & KPI Section */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-[#1F2937] tracking-tight">
                    Good morning, {user?.name?.split(' ')[0] || 'Store Owner'}
                  </h2>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    Here's what's happening with your store today.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant={store.isActive ? 'secondary' : 'primary'}
                    size="sm"
                    loading={togglingStatus}
                    icon={Power}
                    onClick={handleToggleStatus}
                  >
                    {store.isActive ? 'Deactivate Store' : 'Activate Store'}
                  </Button>
                </div>
              </div>

              {/* KPI Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card padding="p-5" className="border-l-4 border-l-[#2E7D32]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                      Inventory Value
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center">
                      <Boxes className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-extrabold text-[#1F2937]">₹{kpiMetrics.inventoryValue.toLocaleString('en-IN')}</p>
                  <p className="text-[11px] text-[#6B7280] mt-1 font-medium">
                    {kpiMetrics.totalBatches} total active batches
                  </p>
                </Card>

                <Card padding="p-5" className="border-l-4 border-l-amber-500">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                      Expiring Soon
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                      <Clock3 className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-extrabold text-[#1F2937]">{kpiMetrics.expiringSoonBatches} <span className="text-xs font-normal text-slate-500">batches</span></p>
                  <p className="text-[11px] text-amber-700 mt-1 font-semibold">
                    Automated scheduler monitoring active
                  </p>
                </Card>

                <Card padding="p-5" className="border-l-4 border-l-orange-500">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                      Low Stock Alerts
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-extrabold text-[#1F2937]">{kpiMetrics.lowStockBatches} <span className="text-xs font-normal text-slate-500">batches</span></p>
                  <p className="text-[11px] text-orange-700 mt-1 font-semibold">
                    Stock quantity ≤ 5 units
                  </p>
                </Card>

                <Card padding="p-5" className="border-l-4 border-l-blue-600">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">
                      Dynamic Pricing Engine
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Zap className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-extrabold text-[#1F2937]">Active</p>
                  <p className="text-[11px] text-blue-700 mt-1 font-semibold">
                    Hourly automated price adjustment
                  </p>
                </Card>
              </div>

              {/* TAB NAVIGATION */}
              <div className="flex items-center gap-2 border-b border-[#E5E7EB] pt-2">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold transition-all ${
                    activeTab === 'overview'
                      ? 'border-[#2E7D32] text-[#2E7D32]'
                      : 'border-transparent text-[#6B7280] hover:text-[#1F2937]'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Store Overview</span>
                </button>

                <button
                  onClick={() => setActiveTab('settings')}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold transition-all ${
                    activeTab === 'settings'
                      ? 'border-[#2E7D32] text-[#2E7D32]'
                      : 'border-transparent text-[#6B7280] hover:text-[#1F2937]'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>Store Settings</span>
                </button>
              </div>

              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* ML Demand Insights Banner Card */}
                  <Card padding="p-6" className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white border-none shadow-md">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-emerald-400" />
                          <h3 className="text-base font-extrabold text-white">
                            Machine Learning Demand Forecasting
                          </h3>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-800/80 text-emerald-200 text-[10px] font-black uppercase">
                            Demand Model v1
                          </span>
                        </div>
                        <p className="text-xs text-emerald-200/90 max-w-xl">
                          Estimate upcoming product sales using historical order trends, weekly seasonality, and rolling averages to reduce waste and prevent stockouts.
                        </p>
                      </div>

                      <Link to="/store-owner/demand-prediction">
                        <Button variant="primary" size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white border-none text-xs whitespace-nowrap">
                          Open Predictor
                        </Button>
                      </Link>
                    </div>
                  </Card>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card padding="p-6" className="lg:col-span-2 space-y-6">
                      <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
                        <div>
                          <CardTitle>{store.name}</CardTitle>
                          <CardDescription>{store.address || 'No address specified'}</CardDescription>
                        </div>
                      <Badge variant={store.isActive ? 'AVAILABLE' : 'EXPIRED'}>
                        {store.isActive ? 'Active Store' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                      <div>
                        <span className="font-bold text-[#6B7280] uppercase block mb-1">Business Type</span>
                        <Badge variant="info">{store.businessType}</Badge>
                      </div>

                      <div>
                        <span className="font-bold text-[#6B7280] uppercase block mb-1">Contact Phone</span>
                        <p className="font-bold text-[#1F2937] flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {store.phone || 'Not provided'}
                        </p>
                      </div>

                      <div>
                        <span className="font-bold text-[#6B7280] uppercase block mb-1">Store Email</span>
                        <p className="font-bold text-[#1F2937] flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {store.email || 'Not provided'}
                        </p>
                      </div>

                      <div>
                        <span className="font-bold text-[#6B7280] uppercase block mb-1">Opening Hours</span>
                        <p className="font-bold text-[#1F2937] flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {store.openingHours || 'Not configured'}
                        </p>
                      </div>

                      <div className="sm:col-span-2">
                        <span className="font-bold text-[#6B7280] uppercase block mb-1">Description</span>
                        <p className="text-slate-600 leading-relaxed">
                          {store.description || 'No description added yet.'}
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Sidebar Info */}
                  <Card padding="p-6" className="space-y-4">
                    <CardTitle className="text-base border-b border-[#E5E7EB] pb-3">
                      Owner Verification
                    </CardTitle>
                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-[#6B7280] font-medium block mb-0.5">Account Name</span>
                        <p className="font-bold text-[#1F2937]">{user?.name}</p>
                      </div>

                      <div>
                        <span className="text-[#6B7280] font-medium block mb-0.5">Owner Email</span>
                        <p className="font-bold text-[#1F2937]">{user?.email}</p>
                      </div>

                      <div>
                        <span className="text-[#6B7280] font-medium block mb-0.5">Location Coordinates</span>
                        <p className="font-mono text-[11px] bg-slate-100 p-2 rounded-lg border border-slate-200">
                          Lng: {store.location?.coordinates?.[0] ?? 0}, Lat: {store.location?.coordinates?.[1] ?? 0}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}

              {/* TAB 2: SETTINGS */}
              {activeTab === 'settings' && (
                <Card padding="p-6 sm:p-8" className="max-w-3xl">
                  <CardHeader>
                    <CardTitle>Update Store Profile</CardTitle>
                    <CardDescription>Edit store identity, business address, and contact hours.</CardDescription>
                  </CardHeader>

                  {updateError && (
                    <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs font-semibold">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{updateError}</span>
                    </div>
                  )}

                  <form onSubmit={handleUpdateSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <Input
                        label="Store Name"
                        required
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      />

                      <Select
                        label="Business Type"
                        required
                        value={editData.businessType}
                        onChange={(e) => setEditData({ ...editData, businessType: e.target.value })}
                        options={[
                          { value: 'GROCERY', label: 'Grocery Store' },
                          { value: 'BAKERY', label: 'Bakery' },
                          { value: 'RESTAURANT', label: 'Restaurant' },
                          { value: 'SUPERMARKET', label: 'Supermarket' },
                          { value: 'OTHER', label: 'Other Retail' }
                        ]}
                      />
                    </div>

                    <Input
                      label="Store Address"
                      required
                      value={editData.address}
                      onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <Input
                        label="Phone Number"
                        type="tel"
                        value={editData.phone}
                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      />

                      <Input
                        label="Opening Hours"
                        value={editData.openingHours}
                        onChange={(e) => setEditData({ ...editData, openingHours: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#1F2937] mb-1.5">
                        Store Description
                      </label>
                      <textarea
                        rows="3"
                        value={editData.description}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                        className="block w-full p-3 rounded-xl border border-[#E5E7EB] text-sm text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
                      ></textarea>
                    </div>

                    {/* Store Location Section */}
                    <div className="pt-4 border-t border-[#E5E7EB] space-y-4">
                      <div>
                        <h3 className="text-sm font-extrabold text-[#1F2937] flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-[#2E7D32]" />
                          <span>Store Location</span>
                        </h3>
                        <p className="text-xs text-[#6B7280] mt-0.5">
                          Your location helps nearby customers discover your Flash Sales.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-[#E5E7EB]">
                        <Input
                          label="Latitude"
                          type="number"
                          step="any"
                          placeholder="e.g. 16.5062"
                          value={editData.latitude}
                          onChange={(e) => setEditData({ ...editData, latitude: e.target.value })}
                        />
                        <Input
                          label="Longitude"
                          type="number"
                          step="any"
                          placeholder="e.g. 80.6480"
                          value={editData.longitude}
                          onChange={(e) => setEditData({ ...editData, longitude: e.target.value })}
                        />

                        <div className="sm:col-span-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            icon={MapPin}
                            onClick={async () => {
                              try {
                                if (!navigator.geolocation) {
                                  addToast('Geolocation is not supported by your browser.', 'error');
                                  return;
                                }
                                navigator.geolocation.getCurrentPosition(
                                  (pos) => {
                                    setEditData((prev) => ({
                                      ...prev,
                                      latitude: pos.coords.latitude.toFixed(6),
                                      longitude: pos.coords.longitude.toFixed(6)
                                    }));
                                    addToast('Current coordinates populated.', 'success');
                                  },
                                  () => {
                                    addToast(
                                      'Location permission was denied. You can enter your coordinates manually.',
                                      'info'
                                    );
                                  }
                                );
                              } catch (err) {
                                addToast('Failed to retrieve location.', 'error');
                              }
                            }}
                            className="w-full justify-center"
                          >
                            Use My Current Location
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      loading={updateSubmitting}
                      icon={Edit3}
                    >
                      Save Profile Changes
                    </Button>
                  </form>
                </Card>
              )}
            </div>
          )}
        </PageContainer>
      </div>
    </div>
  );
}

export default StoreOwnerDashboard;
