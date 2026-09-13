import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import productService from '../../services/productService';
import inventoryService from '../../services/inventoryService';
import storeService from '../../services/storeService';

// Layout & UI Components
import Sidebar from '../../components/layout/Sidebar';
import Topbar from '../../components/layout/Topbar';
import PageContainer from '../../components/layout/PageContainer';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import ProductImage from '../../components/common/ProductImage';
import { useToast } from '../../components/ui/Toast';

// Icons
import {
  Package,
  ArrowLeft,
  Edit3,
  Image as ImageIcon,
  Boxes,
  Calendar,
  Building,
  Tag,
  ChevronRight,
  Plus
} from 'lucide-react';

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [store, setStore] = useState(null);
  const [product, setProduct] = useState(null);
  const [inventoryStats, setInventoryStats] = useState({ totalBatches: 0, totalUnits: 0 });
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    storeService.getMyStore().then((res) => {
      if (res.success && res.data) setStore(res.data);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    productService
      .getProductById(id)
      .then((res) => {
        if (res.success && res.data) {
          setProduct(res.data);

          // Fetch associated inventory batches for this product
          return inventoryService.getBatches({ productId: res.data._id, limit: 100 });
        }
      })
      .then((batchRes) => {
        if (batchRes && batchRes.success && batchRes.data) {
          const batches = batchRes.data.batches || [];
          const totalUnits = batches.reduce((sum, b) => sum + (b.quantity || 0), 0);
          setInventoryStats({
            totalBatches: batches.length,
            totalUnits
          });
        }
      })
      .catch((err) => {
        console.error('[ProductDetails] Fetch error:', err);
        addToast('Product not found.', 'error');
        navigate('/store-owner/products');
      })
      .finally(() => setLoading(false));
  }, [id, navigate, addToast]);

  if (loading || !product) {
    return (
      <div className="min-h-screen bg-[#F8FAF8] flex flex-col items-center justify-center p-6 text-slate-700">
        <Skeleton height="h-10" width="w-10" rounded="rounded-xl" className="mb-3" />
        <p className="text-sm font-semibold text-[#6B7280]">Loading product details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#1F2937] flex font-sans">
      <Sidebar
        activeTab="products"
        onSelectTab={(tab) => {
          if (tab === 'inventory') navigate('/store-owner/inventory');
          else navigate('/store-owner/products');
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Topbar
          title="Product Profile"
          storeName={store?.name}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <PageContainer>
          <div className="flex items-center justify-between gap-4 mb-2">
            <Button
              variant="ghost"
              size="sm"
              icon={ArrowLeft}
              onClick={() => navigate('/store-owner/products')}
            >
              Back to Products
            </Button>

            <Button
              variant="secondary"
              size="sm"
              icon={Edit3}
              onClick={() => navigate(`/store-owner/products/${product._id}/edit`)}
            >
              Edit Product
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Product Card */}
            <Card padding="p-6 sm:p-8" className="lg:col-span-2 space-y-6">
              <div className="flex flex-col sm:flex-row items-start gap-6 border-b border-[#E5E7EB] pb-6">
                <div className="w-28 h-28 rounded-2xl border border-[#E5E7EB] shrink-0 overflow-hidden shadow-xs">
                  <ProductImage
                    src={product.imageUrl || product.image}
                    alt={product.name}
                    category={product.category}
                    aspectRatio="square"
                    className="w-full h-full"
                  />
                </div>

                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-black text-[#1F2937] tracking-tight">{product.name}</h1>
                    <Badge variant={product.isActive ? 'AVAILABLE' : 'EXPIRED'}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <p className="text-xs text-[#6B7280] flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-[#2E7D32]" />
                    <span className="font-bold text-[#2E7D32]">{product.category}</span>
                    <span>•</span>
                    <span className="capitalize">{product.unit}</span>
                  </p>
                </div>
              </div>

              {/* Product Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                <div>
                  <span className="font-bold text-[#6B7280] uppercase block mb-1">Brand</span>
                  <p className="font-bold text-[#1F2937]">{product.brand || '—'}</p>
                </div>

                <div>
                  <span className="font-bold text-[#6B7280] uppercase block mb-1">Unit of Measure</span>
                  <p className="font-bold text-[#1F2937] capitalize">{product.unit}</p>
                </div>

                <div>
                  <span className="font-bold text-[#6B7280] uppercase block mb-1">Date Created</span>
                  <p className="font-bold text-[#1F2937] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(product.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <span className="font-bold text-[#6B7280] uppercase block mb-1">Description</span>
                  <p className="text-slate-700 leading-relaxed">
                    {product.description || 'No description provided for this product.'}
                  </p>
                </div>
              </div>

              {/* Real API-Powered Inventory Summary Section */}
              <div className="pt-6 border-t border-[#E5E7EB]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-extrabold text-[#1F2937] flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-[#2E7D32]" />
                    <span>Associated Inventory Batches</span>
                  </h3>

                  <Button
                    variant="outline"
                    size="sm"
                    icon={Plus}
                    onClick={() => navigate('/store-owner/inventory/new')}
                  >
                    Add Batch
                  </Button>
                </div>

                <div className="p-6 rounded-2xl bg-[#E8F5E9]/50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-12 h-12 rounded-xl bg-white text-[#2E7D32] border border-emerald-200 flex items-center justify-center font-extrabold text-lg shadow-2xs">
                      <Boxes className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-[#1F2937]">
                        {inventoryStats.totalBatches} {inventoryStats.totalBatches === 1 ? 'Batch' : 'Batches'} ({inventoryStats.totalUnits} Total Units)
                      </p>
                      <p className="text-xs text-[#6B7280]">
                        Real batch tracking active for this product item.
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(`/store-owner/inventory?productId=${product._id}`)}
                  >
                    View Inventory <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Quick Actions Sidebar */}
            <div className="space-y-6">
              <Card padding="p-6" className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] border-b border-[#E5E7EB] pb-3">
                  Store Context
                </h4>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[#6B7280] block mb-0.5 font-semibold">Store Name</span>
                    <p className="font-bold text-[#1F2937]">{store?.name}</p>
                  </div>
                  <div>
                    <span className="text-[#6B7280] block mb-0.5 font-semibold">Business Type</span>
                    <p className="font-bold text-[#2E7D32]">{store?.businessType}</p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  icon={Edit3}
                  className="w-full mt-2"
                  onClick={() => navigate(`/store-owner/products/${product._id}/edit`)}
                >
                  Edit Product Information
                </Button>
              </Card>
            </div>
          </div>
        </PageContainer>
      </div>
    </div>
  );
}

export default ProductDetails;
