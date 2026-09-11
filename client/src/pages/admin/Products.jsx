import React, { useState, useEffect, useCallback } from 'react';
import adminService from '../../services/adminService';
import AdminSidebar from '../../components/layout/AdminSidebar';
import AdminTopbar from '../../components/layout/AdminTopbar';
import PageContainer from '../../components/layout/PageContainer';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import {
  Package,
  Search,
  Store,
  Boxes,
  RotateCcw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const categories = [
  'ALL',
  'DAIRY',
  'BAKERY',
  'MEAT',
  'SEAFOOD',
  'PRODUCE',
  'PANTRY',
  'BEVERAGES',
  'SNACKS',
  'OTHER'
];

function AdminProducts() {
  const { addToast } = useToast();

  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminService.getProducts({
        page,
        limit: 20,
        category: activeCategory !== 'ALL' ? activeCategory : undefined,
        search: searchTerm.trim() || undefined
      });

      if (res.success && res.data) {
        setProducts(res.data.products || []);
        setPagination(res.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('[AdminProducts] Fetch error:', err);
      addToast('Unable to load products.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, activeCategory, searchTerm, addToast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#1F2937] flex font-sans">
      <AdminSidebar
        activeTab="products"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <AdminTopbar
          title="Products Catalog Overview"
          subtitle="Monitor products registered across all retail stores on SmartShelf."
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <PageContainer>
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#1F2937] tracking-tight flex items-center gap-2">
                  <Package className="w-6 h-6 text-[#2E7D32]" />
                  <span>Platform Products ({pagination.total})</span>
                </h2>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Platform-wide overview of all products and active inventory batches.
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                icon={RotateCcw}
                onClick={fetchProducts}
                className="text-xs"
              >
                Refresh
              </Button>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-2xs">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setActiveCategory(cat);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      activeCategory === cat
                        ? 'bg-[#2E7D32] text-white shadow-2xs'
                        : 'bg-slate-50 border border-[#E5E7EB] text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search product name or brand..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#E5E7EB] bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#2E7D32] focus:bg-white"
                />
              </div>
            </div>

            {/* Products Table */}
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} padding="p-4">
                    <Skeleton height="h-6" width="w-1/3" />
                    <Skeleton height="h-4" width="w-1/2" className="mt-2" />
                  </Card>
                ))}
              </div>
            ) : products.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No products found"
                description="No products match your filter criteria."
              />
            ) : (
              <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-[#E5E7EB] text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                        <th className="p-4">Product Name</th>
                        <th className="p-4">Store</th>
                        <th className="p-4">Category</th>
                        <th className="p-4">Brand</th>
                        <th className="p-4">Base Price</th>
                        <th className="p-4">Batches</th>
                        <th className="p-4">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {products.map((p) => (
                        <tr key={p._id} className="hover:bg-slate-50/75 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {p.image ? (
                                <img
                                  src={p.image}
                                  alt={p.name}
                                  className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#2E7D32] flex items-center justify-center font-bold shrink-0">
                                  <Package className="w-5 h-5" />
                                </div>
                              )}
                              <div>
                                <p className="font-extrabold text-slate-900">{p.name}</p>
                                <p className="text-[11px] text-slate-400">Unit: {p.unit}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="font-bold text-slate-900 flex items-center gap-1">
                              <Store className="w-3.5 h-3.5 text-[#2E7D32]" />
                              <span>{p.storeId?.name || 'Store'}</span>
                            </span>
                          </td>
                          <td className="p-4">
                            <Badge variant="info">{p.category}</Badge>
                          </td>
                          <td className="p-4 text-slate-600 font-semibold">
                            {p.brand || '—'}
                          </td>
                          <td className="p-4 font-black text-[#2E7D32]">
                            ₹{p.basePrice}
                          </td>
                          <td className="p-4 font-bold text-slate-700">
                            <span className="inline-flex items-center gap-1">
                              <Boxes className="w-3.5 h-3.5 text-slate-400" />
                              <span>{p.batchCount || 0}</span>
                            </span>
                          </td>
                          <td className="p-4 text-[11px] text-slate-500">
                            {new Date(p.createdAt).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-4 border-t border-[#E5E7EB]">
                <Button
                  variant="outline"
                  size="sm"
                  icon={ChevronLeft}
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>

                <span className="text-xs font-bold text-slate-700">
                  Page {page} of {pagination.totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </PageContainer>
      </div>
    </div>
  );
}

export default AdminProducts;
