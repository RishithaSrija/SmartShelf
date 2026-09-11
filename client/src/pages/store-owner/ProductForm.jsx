import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  Package,
  ArrowLeft,
  Save,
  PlusCircle,
  AlertCircle,
  Image as ImageIcon,
  CheckCircle2,
  Tag,
  Building
} from 'lucide-react';

const categoryOptions = [
  { value: 'DAIRY', label: 'Dairy & Eggs' },
  { value: 'BAKERY', label: 'Bakery' },
  { value: 'BEVERAGES', label: 'Beverages' },
  { value: 'FRUITS', label: 'Fruits' },
  { value: 'VEGETABLES', label: 'Vegetables' },
  { value: 'SNACKS', label: 'Snacks' },
  { value: 'FROZEN', label: 'Frozen Food' },
  { value: 'READY_TO_EAT', label: 'Ready to Eat' },
  { value: 'OTHER', label: 'Other' }
];

const unitOptions = [
  { value: 'piece', label: 'Piece' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'gram', label: 'Gram (g)' },
  { value: 'liter', label: 'Liter (L)' },
  { value: 'ml', label: 'Milliliter (ml)' },
  { value: 'pack', label: 'Pack' },
  { value: 'box', label: 'Box' },
  { value: 'bottle', label: 'Bottle' },
  { value: 'dozen', label: 'Dozen' }
];

function ProductForm() {
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [store, setStore] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'DAIRY',
    brand: '',
    unit: 'piece',
    description: '',
    image: ''
  });
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load store details
  useEffect(() => {
    storeService.getMyStore().then((res) => {
      if (res.success && res.data) {
        setStore(res.data);
      }
    });
  }, []);

  // Load product if in Edit mode
  useEffect(() => {
    if (isEditMode) {
      setLoading(true);
      productService
        .getProductById(id)
        .then((res) => {
          if (res.success && res.data) {
            const p = res.data;
            setFormData({
              name: p.name || '',
              category: p.category || 'DAIRY',
              brand: p.brand || '',
              unit: p.unit || 'piece',
              description: p.description || '',
              image: p.image || ''
            });
          }
        })
        .catch((err) => {
          console.error('[ProductForm] Fetch error:', err);
          setError('Unable to load product for editing.');
          addToast('Product not found.', 'error');
        })
        .finally(() => setLoading(false));
    }
  }, [id, isEditMode, addToast]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      setError('Product name must be at least 2 characters.');
      return;
    }

    if (!formData.category) {
      setError('Please select a product category.');
      return;
    }

    if (!formData.unit) {
      setError('Please select a measurement unit.');
      return;
    }

    try {
      setSubmitting(true);
      if (isEditMode) {
        const res = await productService.updateProduct(id, formData);
        if (res.success) {
          addToast('Product updated successfully!', 'success');
          navigate('/store-owner/products');
        }
      } else {
        const res = await productService.createProduct(formData);
        if (res.success) {
          addToast('Product created successfully!', 'success');
          navigate('/store-owner/products');
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save product. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAF8] flex flex-col items-center justify-center p-6 text-slate-700">
        <Skeleton height="h-10" width="w-10" rounded="rounded-xl" className="mb-3" />
        <p className="text-sm font-semibold text-[#6B7280]">Loading product form...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#1F2937] flex font-sans">
      <Sidebar
        activeTab="products"
        onSelectTab={() => navigate('/store-owner/products')}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Topbar
          title={isEditMode ? 'Edit Product' : 'Add New Product'}
          storeName={store?.name}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <PageContainer>
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="sm"
              icon={ArrowLeft}
              onClick={() => navigate('/store-owner/products')}
            >
              Back to Products
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Column */}
            <Card padding="p-6 sm:p-8" className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{isEditMode ? 'Edit Product Details' : 'Create New Product'}</CardTitle>
                <CardDescription>
                  Enter the general product information. Batch quantities and expiry dates will be assigned separately.
                </CardDescription>
              </CardHeader>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  label="Product Name"
                  name="name"
                  required
                  icon={Package}
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Amul Full Cream Milk"
                  helperText="Minimum 2 characters, maximum 100 characters."
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Select
                    label="Category"
                    name="category"
                    required
                    icon={Tag}
                    value={formData.category}
                    onChange={handleChange}
                    options={categoryOptions}
                  />

                  <Select
                    label="Unit of Measurement"
                    name="unit"
                    required
                    value={formData.unit}
                    onChange={handleChange}
                    options={unitOptions}
                  />
                </div>

                <Input
                  label="Brand Name"
                  name="brand"
                  icon={Building}
                  value={formData.brand}
                  onChange={handleChange}
                  placeholder="e.g. Amul, Britannia, Nestle (optional)"
                />

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#1F2937] mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows="3"
                    name="description"
                    maxLength={500}
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Product details, ingredients, or specifications (max 500 chars)..."
                    className="block w-full p-3 rounded-xl border border-[#E5E7EB] text-sm text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#2E7D32]"
                  ></textarea>
                </div>

                <Input
                  label="Image URL"
                  name="image"
                  icon={ImageIcon}
                  value={formData.image}
                  onChange={handleChange}
                  placeholder="https://example.com/images/product.jpg (optional)"
                  helperText="Enter a valid image URL. Live preview is shown on the right."
                />

                <div className="flex items-center gap-3 pt-4 border-t border-[#E5E7EB]">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={submitting}
                    icon={isEditMode ? Save : PlusCircle}
                  >
                    {isEditMode ? 'Save Changes' : 'Create Product'}
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => navigate('/store-owner/products')}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>

            {/* Live Image Preview Sidebar Column */}
            <div className="space-y-6">
              <Card padding="p-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-3">
                  Product Image Preview
                </h4>
                <div className="w-full h-56 rounded-2xl bg-slate-100 border border-[#E5E7EB] flex items-center justify-center overflow-hidden relative">
                  {formData.image ? (
                    <img
                      src={formData.image}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="text-center p-4 text-slate-400">
                      <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">No Image URL specified</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 p-4 rounded-xl bg-[#E8F5E9] border border-emerald-200 text-xs text-[#2E7D32] space-y-1">
                  <p className="font-bold">Master Product Record</p>
                  <p className="text-slate-600">
                    This product will be available for batch creation in Step 7.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </PageContainer>
      </div>
    </div>
  );
}

export default ProductForm;
