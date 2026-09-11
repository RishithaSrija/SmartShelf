import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import storeService from '../../services/storeService';
import geoService from '../../services/geoService';

// Layout & Common Components
import Sidebar from '../../components/layout/Sidebar';
import Topbar from '../../components/layout/Topbar';
import PageContainer from '../../components/layout/PageContainer';

// UI Components
import Card, { CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';

// Icons
import {
  Store,
  MapPin,
  Clock,
  Phone,
  Building,
  AlertCircle,
  CheckCircle2,
  Navigation,
  Crosshair,
  Edit3,
  Globe
} from 'lucide-react';

function StoreSettings() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [formData, setFormData] = useState({
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [locationMessage, setLocationMessage] = useState('');

  const fetchStore = useCallback(async () => {
    try {
      setLoading(true);
      const res = await storeService.getMyStore();
      if (res.success && res.data) {
        setStore(res.data);
        setFormData({
          name: res.data.name || '',
          businessType: res.data.businessType || 'GROCERY',
          description: res.data.description || '',
          phone: res.data.phone || '',
          email: res.data.email || '',
          address: res.data.address || '',
          openingHours: res.data.openingHours || '',
          latitude: res.data.location?.coordinates?.[1] !== undefined ? res.data.location.coordinates[1].toString() : '',
          longitude: res.data.location?.coordinates?.[0] !== undefined ? res.data.location.coordinates[0].toString() : ''
        });
      }
    } catch (err) {
      console.error('[StoreSettings] Error fetching store:', err);
      addToast('Unable to load store profile.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchStore();
  }, [fetchStore]);

  // Use browser geolocation explicitly on user click
  const handleUseCurrentLocation = async () => {
    setErrorMessage('');
    setLocationMessage('');
    setIsLocating(true);

    try {
      const coords = await geoService.getCurrentLocation();
      setFormData((prev) => ({
        ...prev,
        latitude: coords.latitude.toString(),
        longitude: coords.longitude.toString()
      }));
      setLocationMessage('Detected current GPS coordinates successfully!');
      addToast('Current coordinates populated.', 'success');
    } catch (err) {
      const msg = err.message || 'Location permission was denied. You can enter your coordinates manually.';
      setErrorMessage(msg);
      addToast(msg, 'info');
    } finally {
      setIsLocating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLocationMessage('');

    if (!formData.name.trim()) {
      setErrorMessage('Store name is required.');
      return;
    }

    if (formData.latitude || formData.longitude) {
      const lat = parseFloat(formData.latitude);
      const lng = parseFloat(formData.longitude);
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        setErrorMessage('Latitude must be between -90 and 90, Longitude between -180 and 180.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const res = await storeService.updateStore(formData);
      if (res.success && res.data) {
        setStore(res.data);
        addToast('Store settings and location updated successfully!', 'success');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update store settings.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAF8] flex flex-col items-center justify-center p-6 text-slate-700">
        <Skeleton height="h-10" width="w-10" rounded="rounded-xl" className="mb-3" />
        <p className="text-sm font-semibold text-[#6B7280]">Loading store settings...</p>
      </div>
    );
  }

  const isLocationConfigured =
    store?.location?.coordinates &&
    (store.location.coordinates[0] !== 0 || store.location.coordinates[1] !== 0);

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#1F2937] flex font-sans">
      <Sidebar
        activeTab="settings"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Topbar
          title="Store Settings"
          storeName={store?.name}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <PageContainer>
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold text-[#1F2937] tracking-tight">
                Store Settings &amp; Geolocation
              </h2>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Configure your store details and geographic coordinates for local customer discovery.
              </p>
            </div>

            {errorMessage && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {locationMessage && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-800 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{locationMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Store Form */}
              <Card padding="p-6 sm:p-8" className="lg:col-span-2">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <CardHeader className="p-0 border-none mb-4">
                    <CardTitle className="text-base">Store Profile Information</CardTitle>
                    <CardDescription>Public identity and contact information for your store.</CardDescription>
                  </CardHeader>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Store Name"
                      required
                      icon={Store}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />

                    <Select
                      label="Business Type"
                      required
                      icon={Building}
                      value={formData.businessType}
                      onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
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
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Market Street, Main Road"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Phone Number"
                      type="tel"
                      icon={Phone}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />

                    <Input
                      label="Opening Hours"
                      icon={Clock}
                      value={formData.openingHours}
                      onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#1F2937] mb-1.5">
                      Store Description
                    </label>
                    <textarea
                      rows="3"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="block w-full p-3 rounded-xl border border-[#E5E7EB] text-xs text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
                      placeholder="Describe fresh items, organic goods, or specialty foods..."
                    />
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
                        value={formData.latitude}
                        onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      />
                      <Input
                        label="Longitude"
                        type="number"
                        step="any"
                        placeholder="e.g. 80.6480"
                        value={formData.longitude}
                        onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      />

                      <div className="sm:col-span-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          icon={isLocating ? Crosshair : Navigation}
                          loading={isLocating}
                          onClick={handleUseCurrentLocation}
                          className="w-full justify-center"
                        >
                          {isLocating ? 'Detecting Location...' : 'Use My Current Location'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={isSubmitting}
                    icon={Edit3}
                    className="w-full justify-center"
                  >
                    Save Store Settings
                  </Button>
                </form>
              </Card>

              {/* Location Preview Card */}
              <div className="space-y-4">
                <Card padding="p-6" className="space-y-4 border border-[#E5E7EB]">
                  <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-3">
                    <Globe className="w-4 h-4 text-[#2E7D32]" />
                    <h3 className="text-sm font-extrabold text-[#1F2937]">Store Location</h3>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#2E7D32] animate-pulse" />
                      <span className="text-xs font-bold text-emerald-900">
                        {isLocationConfigured ? 'Location configured' : 'Default coordinates (0, 0)'}
                      </span>
                    </div>

                    <div className="text-xs font-mono bg-white/80 p-2.5 rounded-lg border border-emerald-200 text-slate-700 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-sans">Latitude:</span>
                        <span className="font-bold">{store?.location?.coordinates?.[1] ?? 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-sans">Longitude:</span>
                        <span className="font-bold">{store?.location?.coordinates?.[0] ?? 0}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#6B7280] leading-relaxed">
                    When nearby customers browse the Marketplace within a 1–25 km radius, your active Flash Sales will appear with real distance indicators.
                  </p>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={Navigation}
                    onClick={handleUseCurrentLocation}
                    loading={isLocating}
                    className="w-full justify-center text-xs"
                  >
                    Use Current Location
                  </Button>
                </Card>

                {/* Store Status Card */}
                <Card padding="p-5" className="border border-[#E5E7EB] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#6B7280] uppercase">Store Status</span>
                    <Badge variant={store?.isActive ? 'AVAILABLE' : 'EXPIRED'}>
                      {store?.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-[#6B7280]">
                    {store?.isActive
                      ? 'Your store and deals are visible on the public marketplace.'
                      : 'Your store is inactive. Flash sales are hidden from customers.'}
                  </p>
                </Card>
              </div>
            </div>
          </div>
        </PageContainer>
      </div>
    </div>
  );
}

export default StoreSettings;
