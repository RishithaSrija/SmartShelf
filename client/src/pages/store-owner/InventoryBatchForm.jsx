import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import inventoryService from '../../services/inventoryService';
import productService from '../../services/productService';
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
import { useToast } from '../../components/ui/Toast';

// Icons
import {
  Boxes,
  ArrowLeft,
  Save,
  PlusCircle,
  AlertCircle,
  Calendar,
  DollarSign,
  Package,
  CheckCircle2,
  Tag
} from 'lucide-react';

function InventoryBatchForm() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    productId: '',
    batchNumber: '',
    quantity: '',
    originalPrice: '',
    manufactureDate: new Date().toISOString().split('T')[0],
    expiryDate: ''
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch Store and Master Products
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const storeRes = await storeService.getMyStore();
        if (storeRes.success && storeRes.data) setStore(storeRes.data);

        const prodRes = await productService.getProducts({ limit: 100 });
        if (prodRes.success && prodRes.data?.products) {
          setProducts(prodRes.data.products);
          if (!isEditMode && prodRes.data.products.length > 0) {
            setFormData((prev) => ({ ...prev, productId: prodRes.data.products[0]._id }));
          }
        }

        if (isEditMode) {
          const batchRes = await inventoryService.getBatchById(id);
          if (batchRes.success && batchRes.data) {
            const b = batchRes.data;
            setFormData({
              productId: b.productId?._id || b.productId || '',
              batchNumber: b.batchNumber || '',
              quantity: b.quantity ?? '',
              originalPrice: b.originalPrice ?? '',
              manufactureDate: b.manufactureDate ? new Date(b.manufactureDate).toISOString().split('T')[0] : '',
              expiryDate: b.expiryDate ? new Date(b.expiryDate).toISOString().split('T')[0] : ''
            });
          }
        }
      } catch (err) {
        console.error('[InventoryBatchForm] Load error:', err);
        setError('Unable to load initial form data.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isEditMode]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.productId) {
      setError('Please select a master product.');
      return;
    }

    if (!formData.batchNumber.trim()) {
      setError('Batch number is required.');
      return;
    }

    if (formData.quantity === '' || Number(formData.quantity) < 0) {
      setError('Stock quantity cannot be negative.');
      return;
    }

    if (!formData.originalPrice || Number(formData.originalPrice) <= 0) {
      setError('Original price must be greater than 0.');
      return;
    }

    if (!formData.manufactureDate || !formData.expiryDate) {
      setError('Manufacture and Expiry dates are required.');
      return;
    }

    const mDate = new Date(formData.manufactureDate);
    const eDate = new Date(formData.expiryDate);

    if (eDate <= mDate) {
      setError('Expiry date must be later than manufacture date.');
      return;
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    if (!isEditMode && eDate < startOfToday) {
      setError('Expiry date cannot be in the past.');
      return;
    }

    try {
      setSubmitting(true);
      if (isEditMode) {
        const res = await inventoryService.updateBatch(id, formData);
        if (res.success) {
          addToast('Inventory batch updated successfully!', 'success');
          navigate('/store-owner/inventory');
        }
      } else {
        const res = await inventoryService.createBatch(formData);
        if (res.success) {
          addToast('Inventory batch created successfully!', 'success');
          navigate('/store-owner/inventory');
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save inventory batch.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAF8] flex flex-col items-center justify-center p-6 text-slate-700">
        <Skeleton height="h-10" width="w-10" rounded="rounded-xl" className="mb-3" />
        <p className="text-sm font-semibold text-[#6B7280]">Loading batch form...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#1F2937] flex font-sans">
      <Sidebar
        activeTab="inventory"
        onSelectTab={() => navigate('/store-owner/inventory')}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Topbar
          title={isEditMode ? 'Edit Inventory Batch' : 'Add New Inventory Batch'}
          storeName={store?.name}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <PageContainer>
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="sm"
              icon={ArrowLeft}
              onClick={() => navigate('/store-owner/inventory')}
            >
              Back to Inventory
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <Card padding="p-6 sm:p-8" className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{isEditMode ? 'Edit Batch Details' : 'Add New Batch'}</CardTitle>
                <CardDescription>
                  Register a batch with specific quantity, price, and expiry date.
                </CardDescription>
              </CardHeader>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1F2937] mb-1.5">
                    Select Master Product <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    name="productId"
                    required
                    disabled={isEditMode}
                    value={formData.productId}
                    onChange={handleChange}
                  >
                    {products.length === 0 ? (
                      <option value="">No products available. Create a product first.</option>
                    ) : (
                      products.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name} ({p.category} • {p.unit})
                        </option>
                      ))
                    )}
                  </Select>
                  {isEditMode && (
                    <p className="mt-1 text-[11px] text-[#6B7280]">
                      Product association cannot be changed once a batch is created.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Input
                    label="Batch Number"
                    name="batchNumber"
                    required
                    value={formData.batchNumber}
                    onChange={handleChange}
                    placeholder="e.g. MILK-2026-001"
                    helperText="Must be unique per product."
                  />

                  <Input
                    label="Stock Quantity"
                    name="quantity"
                    type="number"
                    min="0"
                    required
                    value={formData.quantity}
                    onChange={handleChange}
                    placeholder="e.g. 50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Input
                    label="Original Price (₹)"
                    name="originalPrice"
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    value={formData.originalPrice}
                    onChange={handleChange}
                    placeholder="e.g. 50"
                  />

                  <Input
                    label="Current Price (₹)"
                    value={formData.originalPrice || '0'}
                    disabled
                    helperText="Step 7 pricing is equal to original price (0% discount)."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Input
                    label="Manufacture Date"
                    name="manufactureDate"
                    type="date"
                    required
                    icon={Calendar}
                    value={formData.manufactureDate}
                    onChange={handleChange}
                  />

                  <Input
                    label="Expiry Date"
                    name="expiryDate"
                    type="date"
                    required
                    icon={Calendar}
                    value={formData.expiryDate}
                    onChange={handleChange}
                  />
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-[#E5E7EB]">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={submitting}
                    icon={isEditMode ? Save : PlusCircle}
                  >
                    {isEditMode ? 'Save Batch Changes' : 'Create Batch'}
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => navigate('/store-owner/inventory')}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>

            {/* Read-only Context Sidebar */}
            <div className="space-y-6">
              <Card padding="p-6" className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] border-b border-[#E5E7EB] pb-3">
                  Step 7 System Rules
                </h4>

                <div className="space-y-3 text-xs text-slate-600">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#2E7D32] shrink-0 mt-0.5" />
                    <span>Batch Number is unique per product inside your store.</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#2E7D32] shrink-0 mt-0.5" />
                    <span>Expiry date must be strictly after manufacture date.</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#2E7D32] shrink-0 mt-0.5" />
                    <span>Status is automatically assigned (LOW_STOCK when quantity ≤ 5).</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </PageContainer>
      </div>
    </div>
  );
}

export default InventoryBatchForm;
