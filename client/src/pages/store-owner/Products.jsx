import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import productService from '../../services/productService';
import storeService from '../../services/storeService';

// Layout & Common Components
import Sidebar from '../../components/layout/Sidebar';
import Topbar from '../../components/layout/Topbar';
import PageContainer from '../../components/layout/PageContainer';

// UI Components
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import ProductImage from '../../components/common/ProductImage';

// Icons
import {
  Package,
  Plus,
  Search,
  Filter,
  Eye,
  Edit3,
  Power,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Boxes,
  CheckCircle2,
  XCircle,
  Image as ImageIcon
} from 'lucide-react';

const categories = [
  { value: 'ALL', label: 'All Categories' },
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

function Products() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [counts, setCounts] = useState({ total: 0, active: 0, inactive: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [page, setPage] = useState(1);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch store details
  useEffect(() => {
    storeService.getMyStore().then((res) => {
      if (res.success && res.data) {
        setStore(res.data);
      }
    });
  }, []);

  // Fetch products based on filters
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await productService.getProducts({
        search: searchTerm,
        category: selectedCategory,
        status: selectedStatus,
        page,
        limit: 10
      });

      if (res.success && res.data) {
        setProducts(res.data.products || []);
        if (res.data.counts) setCounts(res.data.counts);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('[Products] Fetch error:', err);
      addToast('Unable to load products.', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCategory, selectedStatus, page, addToast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handle status toggle
  const handleToggleStatus = async (productId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      const res = await productService.updateProductStatus(productId, newStatus);
      if (res.success) {
        addToast(`Product ${newStatus ? 'activated' : 'deactivated'} successfully.`, 'success');
        fetchProducts();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update status.', 'error');
    }
  };

  // Handle product deletion
  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    try {
      setDeleting(true);
      const res = await productService.deleteProduct(productToDelete._id);
      if (res.success) {
        addToast('Product deleted successfully.', 'success');
        setDeleteModalOpen(false);
        setProductToDelete(null);
        fetchProducts();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Unable to delete product.';
      addToast(msg, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#1F2937] flex font-sans">
      <Sidebar
        activeTab="products"
        onSelectTab={(tab) => {
          if (tab === 'overview') navigate('/store-owner');
          if (tab === 'settings') navigate('/store-owner');
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Topbar
          title="Products Catalog"
          storeName={store?.name}
          onOpenSidebar={() => setSidebarOpen(true)}
          searchPlaceholder="Search product by name or brand..."
        />

        <PageContainer>
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-[#1F2937] tracking-tight">
                Products
              </h2>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Manage the products available in your store.
              </p>
            </div>

            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={() => navigate('/store-owner/products/new')}
            >
              Add Product
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card padding="p-4" className="border-l-4 border-l-[#2E7D32]">
              <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider block mb-1">
                Total Products
              </span>
              <p className="text-2xl font-extrabold text-[#1F2937]">{counts.total}</p>
            </Card>

            <Card padding="p-4" className="border-l-4 border-l-emerald-600">
              <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider block mb-1">
                Active Products
              </span>
              <p className="text-2xl font-extrabold text-[#2E7D32]">{counts.active}</p>
            </Card>

            <Card padding="p-4" className="border-l-4 border-l-slate-400">
              <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider block mb-1">
                Inactive Products
              </span>
              <p className="text-2xl font-extrabold text-slate-600">{counts.inactive}</p>
            </Card>
          </div>

          {/* Search & Filter Bar */}
          <Card padding="p-4">
            <div className="flex flex-col md:flex-row items-center gap-4">
              {/* Search */}
              <div className="flex-1 w-full">
                <Input
                  icon={Search}
                  placeholder="Search product by name or brand..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              {/* Category Filter */}
              <div className="w-full md:w-48">
                <Select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setPage(1);
                  }}
                  options={categories}
                />
              </div>

              {/* Status Filter */}
              <div className="w-full md:w-40">
                <Select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setPage(1);
                  }}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'active', label: 'Active Only' },
                    { value: 'inactive', label: 'Inactive Only' }
                  ]}
                />
              </div>
            </div>
          </Card>

          {/* Products Data Display */}
          {loading ? (
            <Card padding="p-6">
              <div className="space-y-4">
                <Skeleton height="h-10" />
                <Skeleton height="h-10" />
                <Skeleton height="h-10" />
              </div>
            </Card>
          ) : products.length === 0 ? (
            <EmptyState
              icon={Package}
              title={searchTerm || selectedCategory !== 'ALL' ? 'No matching products found' : 'No products yet'}
              description={
                searchTerm || selectedCategory !== 'ALL'
                  ? 'Try adjusting your search terms or filters.'
                  : 'Add your first product to start managing your SmartShelf catalog.'
              }
              actionButton={
                searchTerm || selectedCategory !== 'ALL' ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory('ALL');
                      setSelectedStatus('all');
                    }}
                  >
                    Reset Filters
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Plus}
                    onClick={() => navigate('/store-owner/products/new')}
                  >
                    Add First Product
                  </Button>
                )
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
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Brand</th>
                      <th className="py-3.5 px-4">Unit</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] text-[#1F2937]">
                    {products.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl border border-slate-200 shrink-0 overflow-hidden">
                            <ProductImage
                              src={item.imageUrl || item.image}
                              alt={item.name}
                              category={item.category}
                              aspectRatio="square"
                              className="w-full h-full"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-extrabold text-[#1F2937] leading-tight">{item.name}</p>
                            <p className="text-[11px] font-normal text-[#6B7280] line-clamp-1">{item.description || 'No description'}</p>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant="info">{item.category}</Badge>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          {item.brand || '—'}
                        </td>
                        <td className="py-3.5 px-4 font-semibold capitalize text-slate-700">
                          {item.unit}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant={item.isActive ? 'AVAILABLE' : 'EXPIRED'}>
                            {item.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="View Product"
                            onClick={() => navigate(`/store-owner/products/${item._id}`)}
                          >
                            <Eye className="w-4 h-4 text-slate-600" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            title="Edit Product"
                            onClick={() => navigate(`/store-owner/products/${item._id}/edit`)}
                          >
                            <Edit3 className="w-4 h-4 text-blue-600" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            title={item.isActive ? 'Deactivate' : 'Activate'}
                            onClick={() => handleToggleStatus(item._id, item.isActive)}
                          >
                            <Power className={`w-4 h-4 ${item.isActive ? 'text-amber-600' : 'text-[#2E7D32]'}`} />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            title="Delete Product"
                            onClick={() => {
                              setProductToDelete(item);
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

              {/* Mobile Card List Representation */}
              <div className="md:hidden divide-y divide-[#E5E7EB]">
                {products.map((item) => (
                  <div key={item._id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl border border-slate-200 shrink-0 overflow-hidden">
                          <ProductImage
                            src={item.imageUrl || item.image}
                            alt={item.name}
                            category={item.category}
                            aspectRatio="square"
                            className="w-full h-full"
                          />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-[#1F2937]">{item.name}</h4>
                          <p className="text-xs text-[#6B7280]">{item.brand ? `${item.brand} • ` : ''}{item.unit}</p>
                        </div>
                      </div>
                      <Badge variant={item.isActive ? 'AVAILABLE' : 'EXPIRED'}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <Badge variant="info">{item.category}</Badge>

                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/store-owner/products/${item._id}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/store-owner/products/${item._id}/edit`)}>
                          <Edit3 className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(item._id, item.isActive)}>
                          <Power className={`w-4 h-4 ${item.isActive ? 'text-amber-600' : 'text-[#2E7D32]'}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setProductToDelete(item);
                            setDeleteModalOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-rose-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Bar */}
              {pagination.totalPages > 1 && (
                <div className="p-4 border-t border-[#E5E7EB] bg-slate-50 flex items-center justify-between text-xs">
                  <span className="text-[#6B7280]">
                    Showing Page <span className="font-bold text-[#1F2937]">{pagination.page}</span> of{' '}
                    <span className="font-bold text-[#1F2937]">{pagination.totalPages}</span> ({pagination.total} total)
                  </span>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page >= pagination.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </PageContainer>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setProductToDelete(null);
        }}
        title="Delete Product?"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-800 text-xs font-semibold">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">Important Deletion Rule:</p>
              <p>Products with inventory history cannot be deleted to preserve historical sales data. Deactivate instead if stock exists.</p>
            </div>
          </div>

          <p className="text-sm text-slate-700">
            Are you sure you want to delete <span className="font-bold text-slate-900">{productToDelete?.name}</span>?
          </p>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setDeleteModalOpen(false);
                setProductToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={deleting}
              onClick={handleDeleteConfirm}
            >
              Delete Product
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default Products;
