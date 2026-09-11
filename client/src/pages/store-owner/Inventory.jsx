import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import inventoryService from '../../services/inventoryService';
import productService from '../../services/productService';
import storeService from '../../services/storeService';

// Layout & UI Components
import Sidebar from '../../components/layout/Sidebar';
import Topbar from '../../components/layout/Topbar';
import PageContainer from '../../components/layout/PageContainer';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';

// Icons
import {
  Boxes,
  Plus,
  Search,
  Filter,
  Eye,
  Edit3,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Clock3,
  DollarSign,
  PackageCheck,
  PackageX,
  Layers,
  Edit2
} from 'lucide-react';

const expiryOptions = [
  { value: 'all', label: 'All Expiry Dates' },
  { value: 'today', label: 'Expires Today' },
  { value: 'tomorrow', label: 'Expires Tomorrow' },
  { value: '3days', label: 'Expires in 3 Days' },
  { value: '7days', label: 'Expires in 7 Days' },
  { value: 'expired', label: 'Expired' }
];

const statusOptions = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'LOW_STOCK', label: 'Low Stock' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'SOLD_OUT', label: 'Sold Out' }
];

// Expiry visualizer calculation helper
const getExpiryBadge = (expiryDateStr) => {
  const expiry = new Date(expiryDateStr);
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfExpiry = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());

  const diffTime = startOfExpiry.getTime() - startOfToday.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: 'Expired', variant: 'EXPIRED', textClass: 'text-rose-700 font-bold' };
  } else if (diffDays === 0) {
    return { label: 'Expires today', variant: 'EXPIRED', textClass: 'text-rose-600 font-bold' };
  } else if (diffDays === 1) {
    return { label: 'Expires tomorrow', variant: 'EXPIRING_SOON', textClass: 'text-orange-700 font-bold' };
  } else if (diffDays <= 3) {
    return { label: `Expires in ${diffDays} days`, variant: 'EXPIRING_SOON', textClass: 'text-amber-700 font-semibold' };
  } else if (diffDays <= 7) {
    return { label: `Expires in ${diffDays} days`, variant: 'LOW_STOCK', textClass: 'text-slate-700 font-semibold' };
  } else {
    return { label: `Expires in ${diffDays} days`, variant: 'AVAILABLE', textClass: 'text-slate-600 font-normal' };
  }
};

function Inventory() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();

  const [store, setStore] = useState(null);
  const [summary, setSummary] = useState({
    totalBatches: 0,
    totalUnits: 0,
    inventoryValue: 0,
    lowStockBatches: 0,
    expiringSoonBatches: 0,
    expiredBatches: 0
  });

  const [batches, setBatches] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(searchParams.get('productId') || 'ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedExpiry, setSelectedExpiry] = useState('all');
  const [page, setPage] = useState(1);

  // Quantity modal state
  const [qtyModalOpen, setQtyModalOpen] = useState(false);
  const [batchToUpdate, setBatchToUpdate] = useState(null);
  const [newQuantity, setNewQuantity] = useState(0);
  const [qtyUpdating, setQtyUpdating] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch store and master products for filter dropdown
  useEffect(() => {
    storeService.getMyStore().then((res) => {
      if (res.success && res.data) setStore(res.data);
    });

    productService.getProducts({ limit: 100 }).then((res) => {
      if (res.success && res.data?.products) {
        setProductsList(res.data.products);
      }
    });
  }, []);

  // Fetch Summary Statistics
  const fetchSummary = useCallback(async () => {
    try {
      const res = await inventoryService.getInventorySummary();
      if (res.success && res.data) {
        setSummary(res.data);
      }
    } catch (err) {
      console.error('[Inventory] Summary error:', err);
    }
  }, []);

  // Fetch Batches
  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      const res = await inventoryService.getBatches({
        search: searchTerm,
        productId: selectedProduct !== 'ALL' ? selectedProduct : undefined,
        status: selectedStatus,
        expiry: selectedExpiry !== 'all' ? selectedExpiry : undefined,
        page,
        limit: 10
      });

      if (res.success && res.data) {
        setBatches(res.data.batches || []);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('[Inventory] Fetch error:', err);
      addToast('Unable to load inventory batches.', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedProduct, selectedStatus, selectedExpiry, page, addToast]);

  useEffect(() => {
    fetchSummary();
    fetchBatches();
  }, [fetchSummary, fetchBatches]);

  // Handle quantity update submission
  const handleQuantitySubmit = async (e) => {
    e.preventDefault();
    if (!batchToUpdate) return;
    try {
      setQtyUpdating(true);
      const res = await inventoryService.updateQuantity(batchToUpdate._id, newQuantity);
      if (res.success) {
        addToast('Stock quantity updated successfully!', 'success');
        setQtyModalOpen(false);
        setBatchToUpdate(null);
        fetchBatches();
        fetchSummary();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update quantity.', 'error');
    } finally {
      setQtyUpdating(false);
    }
  };

  // Handle batch deletion
  const handleDeleteConfirm = async () => {
    if (!batchToDelete) return;
    try {
      setDeleting(true);
      const res = await inventoryService.deleteBatch(batchToDelete._id);
      if (res.success) {
        addToast('Inventory batch deleted successfully.', 'success');
        setDeleteModalOpen(false);
        setBatchToDelete(null);
        fetchBatches();
        fetchSummary();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Unable to delete batch.';
      addToast(msg, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#1F2937] flex font-sans">
      <Sidebar
        activeTab="inventory"
        onSelectTab={(tab) => {
          if (tab === 'overview' || tab === 'settings') navigate('/store-owner');
          if (tab === 'products') navigate('/store-owner/products');
        }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Topbar
          title="Inventory Batches"
          storeName={store?.name}
          onOpenSidebar={() => setSidebarOpen(true)}
          searchPlaceholder="Search product name or batch number..."
        />

        <PageContainer>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-[#1F2937] tracking-tight">
                Inventory
              </h2>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Track every product batch, quantity, and expiry date.
              </p>
            </div>

            <Button
              variant="primary"
              size="md"
              icon={Plus}
              onClick={() => navigate('/store-owner/inventory/new')}
            >
              Add Batch
            </Button>
          </div>

          {/* Real KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card padding="p-4" className="border-l-4 border-l-[#2E7D32]">
              <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">
                Total Batches
              </span>
              <p className="text-2xl font-extrabold text-[#1F2937]">{summary.totalBatches}</p>
            </Card>

            <Card padding="p-4" className="border-l-4 border-l-blue-600">
              <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">
                Total Units
              </span>
              <p className="text-2xl font-extrabold text-[#1F2937]">{summary.totalUnits}</p>
            </Card>

            <Card padding="p-4" className="border-l-4 border-l-emerald-600">
              <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">
                Inventory Value
              </span>
              <p className="text-2xl font-extrabold text-[#2E7D32]">₹{summary.inventoryValue.toLocaleString('en-IN')}</p>
            </Card>

            <Card padding="p-4" className="border-l-4 border-l-amber-500">
              <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">
                Low Stock
              </span>
              <p className="text-2xl font-extrabold text-amber-700">{summary.lowStockBatches}</p>
            </Card>

            <Card padding="p-4" className="border-l-4 border-l-orange-500">
              <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider block mb-1">
                Expiring Soon
              </span>
              <p className="text-2xl font-extrabold text-orange-700">{summary.expiringSoonBatches}</p>
            </Card>
          </div>

          {/* Search & Filter Controls */}
          <Card padding="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                icon={Search}
                placeholder="Search product or batch number..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
              />

              <Select
                value={selectedProduct}
                onChange={(e) => {
                  setSelectedProduct(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All Master Products</option>
                {productsList.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </Select>

              <Select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                options={statusOptions}
              />

              <Select
                value={selectedExpiry}
                onChange={(e) => {
                  setSelectedExpiry(e.target.value);
                  setPage(1);
                }}
                options={expiryOptions}
              />
            </div>
          </Card>

          {/* Batches Data Table / Cards */}
          {loading ? (
            <Card padding="p-6">
              <div className="space-y-4">
                <Skeleton height="h-10" />
                <Skeleton height="h-10" />
                <Skeleton height="h-10" />
              </div>
            </Card>
          ) : batches.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title={searchTerm || selectedProduct !== 'ALL' || selectedExpiry !== 'all' ? 'No matching inventory batches' : 'No inventory batches yet'}
              description={
                searchTerm || selectedProduct !== 'ALL' || selectedExpiry !== 'all'
                  ? 'Try adjusting your search criteria or expiry filters.'
                  : 'Add your first batch to start tracking quantities and batch-level expiry dates.'
              }
              actionButton={
                searchTerm || selectedProduct !== 'ALL' || selectedExpiry !== 'all' ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedProduct('ALL');
                      setSelectedStatus('ALL');
                      setSelectedExpiry('all');
                    }}
                  >
                    Reset Filters
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Plus}
                    onClick={() => navigate('/store-owner/inventory/new')}
                  >
                    Add First Batch
                  </Button>
                )
              }
            />
          ) : (
            <Card padding="p-0" className="overflow-hidden">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-[#E5E7EB] text-[#6B7280] font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Product</th>
                      <th className="py-3.5 px-4">Batch #</th>
                      <th className="py-3.5 px-4">Quantity</th>
                      <th className="py-3.5 px-4">Original Price</th>
                      <th className="py-3.5 px-4">Current Price</th>
                      <th className="py-3.5 px-4">Expiry Date</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] text-[#1F2937]">
                    {batches.map((item) => {
                      const expInfo = getExpiryBadge(item.expiryDate);
                      return (
                        <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-bold">
                            <p className="text-sm font-extrabold text-[#1F2937] leading-tight">
                              {item.productId?.name || 'Unknown Product'}
                            </p>
                            <p className="text-[11px] font-normal text-[#6B7280]">
                              {item.productId?.category} • {item.productId?.unit}
                            </p>
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                            {item.batchNumber}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`font-black text-sm ${item.quantity <= 5 ? 'text-amber-700' : 'text-slate-900'}`}>
                              {item.quantity}
                            </span>
                            <span className="text-[11px] text-slate-500 ml-1">units</span>
                          </td>

                          <td className="py-3.5 px-4 font-bold text-slate-700">
                            {item.discountPercentage > 0 ? (
                              <span className="line-through text-slate-400">₹{item.originalPrice}</span>
                            ) : (
                              <span>₹{item.originalPrice}</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-extrabold text-[#2E7D32]">
                            <div className="flex items-center gap-1.5">
                              <span>₹{item.currentPrice}</span>
                              {item.discountPercentage > 0 && (
                                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-[#E8F5E9] text-[#2E7D32] border border-emerald-200">
                                  {item.discountPercentage}% OFF
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <p className={expInfo.textClass}>{expInfo.label}</p>
                            <p className="text-[10px] text-slate-400">
                              {new Date(item.expiryDate).toLocaleDateString()}
                            </p>
                          </td>

                          <td className="py-3.5 px-4">
                            <Badge variant={item.status}>{item.status}</Badge>
                          </td>

                          <td className="py-3.5 px-4 text-right space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="View Batch Details"
                              onClick={() => navigate(`/store-owner/inventory/${item._id}`)}
                            >
                              <Eye className="w-4 h-4 text-slate-600" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              title="Quick Update Quantity"
                              onClick={() => {
                                setBatchToUpdate(item);
                                setNewQuantity(item.quantity);
                                setQtyModalOpen(true);
                              }}
                            >
                              <Edit2 className="w-4 h-4 text-amber-600" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              title="Edit Batch"
                              onClick={() => navigate(`/store-owner/inventory/${item._id}/edit`)}
                            >
                              <Edit3 className="w-4 h-4 text-blue-600" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              title="Delete Batch"
                              onClick={() => {
                                setBatchToDelete(item);
                                setDeleteModalOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-rose-600" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="md:hidden divide-y divide-[#E5E7EB]">
                {batches.map((item) => {
                  const expInfo = getExpiryBadge(item.expiryDate);
                  return (
                    <div key={item._id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-extrabold text-sm text-[#1F2937]">
                            {item.productId?.name}
                          </h4>
                          <p className="text-xs font-mono font-bold text-slate-500">
                            Batch #{item.batchNumber}
                          </p>
                        </div>
                        <Badge variant={item.status}>{item.status}</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <div>
                          <span className="text-slate-500 block">Quantity:</span>
                          <span className="font-bold text-slate-900">{item.quantity} units</span>
                        </div>

                        <div>
                          <span className="text-slate-500 block">Original Price:</span>
                          <span className="font-bold text-slate-900">₹{item.originalPrice}</span>
                        </div>

                        <div className="col-span-2 pt-1 border-t border-slate-200">
                          <span className="text-slate-500 block">Expiry Info:</span>
                          <span className={expInfo.textClass}>{expInfo.label} ({new Date(item.expiryDate).toLocaleDateString()})</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1 pt-1">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/store-owner/inventory/${item._id}`)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setBatchToUpdate(item);
                            setNewQuantity(item.quantity);
                            setQtyModalOpen(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4 text-amber-600" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/store-owner/inventory/${item._id}/edit`)}>
                          <Edit3 className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setBatchToDelete(item);
                            setDeleteModalOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-rose-600" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
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

      {/* Quick Quantity Update Modal */}
      <Modal
        isOpen={qtyModalOpen}
        onClose={() => {
          setQtyModalOpen(false);
          setBatchToUpdate(null);
        }}
        title="Update Stock Quantity"
      >
        <form onSubmit={handleQuantitySubmit} className="space-y-4">
          <p className="text-xs text-slate-600">
            Updating stock for batch <span className="font-bold text-slate-900">{batchToUpdate?.batchNumber}</span> ({batchToUpdate?.productId?.name})
          </p>

          <Input
            label="Stock Quantity"
            type="number"
            min="0"
            required
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setQtyModalOpen(false);
                setBatchToUpdate(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={qtyUpdating}>
              Update Quantity
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setBatchToDelete(null);
        }}
        title="Delete Inventory Batch?"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-800 text-xs font-semibold">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">Transaction History Lock:</p>
              <p>Batches with order transaction history cannot be deleted. Update stock to 0 instead if sold out.</p>
            </div>
          </div>

          <p className="text-sm text-slate-700">
            Are you sure you want to delete batch <span className="font-bold text-slate-900">{batchToDelete?.batchNumber}</span>?
          </p>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setDeleteModalOpen(false);
                setBatchToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" size="sm" loading={deleting} onClick={handleDeleteConfirm}>
              Delete Batch
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default Inventory;
