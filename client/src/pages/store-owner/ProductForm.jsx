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

import uploadService from '../../services/uploadService';
import ProductImage from '../../components/common/ProductImage';

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
  Building,
  Upload,
  X,
  Loader2
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
    image: '',
    imageUrl: '',
    imagePublicId: ''
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
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
              image: p.imageUrl || p.image || '',
              imageUrl: p.imageUrl || p.image || '',
              imagePublicId: p.imagePublicId || ''
            });
            setImagePreview(p.imageUrl || p.image || '');
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
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'image' ? { imageUrl: value } : {})
    }));
    if (name === 'image') {
      setImagePreview(value);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      addToast('File size exceeds 5MB limit.', 'error');
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);

    try {
      setUploadingImage(true);
      const res = await uploadService.uploadImage(file, 'smartshelf/products');
      if (res.success && res.data) {
        setFormData((prev) => ({
          ...prev,
          image: res.data.imageUrl,
          imageUrl: res.data.imageUrl,
          imagePublicId: res.data.imagePublicId || ''
        }));
        addToast('Product image uploaded successfully!', 'success');
      }
    } catch (err) {
      console.error('[ProductForm] Image upload failed:', err);
      addToast(err.response?.data?.message || 'Image upload failed.', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview('');
    setFormData((prev) => ({
      ...prev,
      image: '',
      imageUrl: '',
      imagePublicId: ''
    }));
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

                {/* Image Upload & URL Section */}
                <div className="space-y-3 p-4 bg-slate-50/80 rounded-2xl border border-[#E5E7EB]">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#1F2937]">
                      Product Imagery
                    </label>
                    {(formData.image || imagePreview) && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Remove image</span>
                      </button>
                    )}
                  </div>

                  {/* File Upload Button & Dropzone */}
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <label className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-dashed border-emerald-300 hover:border-[#15803D] hover:bg-emerald-50/50 rounded-xl cursor-pointer transition-all text-xs font-bold text-[#0A4D2E]">
                      {uploadingImage ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-[#15803D]" />
                          <span>Uploading image...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 text-[#16A34A]" />
                          <span>Upload from device</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        className="hidden"
                        disabled={uploadingImage}
                        onChange={handleFileSelect}
                      />
                    </label>

                    <span className="text-xs text-slate-400 font-semibold uppercase sm:px-1">or</span>

                    {/* Image URL Input */}
                    <div className="w-full sm:flex-1">
                      <Input
                        name="image"
                        icon={ImageIcon}
                        value={formData.image}
                        onChange={handleChange}
                        placeholder="Paste image URL (https://...)"
                        className="text-xs py-2.5"
                      />
                    </div>
                  </div>

                  {formData.imagePublicId && (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold bg-emerald-100/70 px-2.5 py-1 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">Cloud storage ID: {formData.imagePublicId}</span>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500">
                    Supports JPEG, PNG, WEBP, and AVIF up to 5MB. Cloudinary optimization applied automatically.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-[#E5E7EB]">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    loading={submitting || uploadingImage}
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
                <div className="w-full rounded-2xl border border-[#E5E7EB] overflow-hidden relative shadow-xs">
                  <ProductImage
                    src={imagePreview || formData.imageUrl || formData.image}
                    alt={formData.name || 'Product Preview'}
                    category={formData.category}
                    aspectRatio="square"
                    className="w-full"
                  />
                </div>

                <div className="mt-4 p-4 rounded-xl bg-[#E8F5E9] border border-emerald-200 text-xs text-[#2E7D32] space-y-1">
                  <p className="font-bold">Live Visual Presentation</p>
                  <p className="text-slate-600">
                    If no photo is provided, SmartShelf automatically displays a branded {formData.category.toLowerCase()} placeholder.
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
