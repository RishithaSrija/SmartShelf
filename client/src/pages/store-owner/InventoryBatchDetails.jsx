import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';

// Icons
import {
  Boxes,
  ArrowLeft,
  Edit3,
  Edit2,
  Calendar,
  Clock3,
  Tag,
  Package,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

const getExpiryInfo = (expiryDateStr) => {
  const expiry = new Date(expiryDateStr);
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfExpiry = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());

  const diffTime = startOfExpiry.getTime() - startOfToday.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: 'This batch has EXPIRED.', bg: 'bg-rose-50 border-rose-200 text-rose-800' };
  } else if (diffDays === 0) {
    return { text: 'This batch EXPIRES TODAY!', bg: 'bg-rose-50 border-rose-200 text-rose-800 font-bold' };
  } else if (diffDays === 1) {
    return { text: 'This batch EXPIRES TOMORROW.', bg: 'bg-orange-50 border-orange-200 text-orange-800 font-bold' };
  } else if (diffDays <= 3) {
    return { text: `This batch expires in ${diffDays} days.`, bg: 'bg-amber-50 border-amber-200 text-amber-800' };
  } else {
    return { text: `This batch expires in ${diffDays} days.`, bg: 'bg-[#E8F5E9] border-emerald-200 text-[#2E7D32]' };
  }
};

function InventoryBatchDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [store, setStore] = useState(null);
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Qty modal
  const [qtyModalOpen, setQtyModalOpen] = useState(false);
  const [newQuantity, setNewQuantity] = useState(0);
  const [qtyUpdating, setQtyUpdating] = useState(false);

  useEffect(() => {
    storeService.getMyStore().then((res) => {
      if (res.success && res.data) setStore(res.data);
    });
  }, []);

  const fetchBatch = async () => {
    try {
      setLoading(true);
      const res = await inventoryService.getBatchById(id);
      if (res.success && res.data) {
        setBatch(res.data);
        setNewQuantity(res.data.quantity);
      }
    } catch (err) {
      console.error('[InventoryBatchDetails] Error:', err);
      addToast('Inventory batch not found.', 'error');
      navigate('/store-owner/inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatch();
  }, [id]);

  const handleQtySubmit = async (e) => {
    e.preventDefault();
    try {
      setQtyUpdating(true);
      const res = await inventoryService.updateQuantity(id, newQuantity);
      if (res.success) {
        addToast('Stock quantity updated successfully!', 'success');
        setQtyModalOpen(false);
        fetchBatch();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update quantity.', 'error');
    } finally {
      setQtyUpdating(false);
    }
  };

  if (loading || !batch) {
    return (
      <div className="min-h-screen bg-[#F8FAF8] flex flex-col items-center justify-center p-6 text-slate-700">
        <Skeleton height="h-10" width="w-10" rounded="rounded-xl" className="mb-3" />
        <p className="text-sm font-semibold text-[#6B7280]">Loading batch details...</p>
      </div>
    );
  }

  const expInfo = getExpiryInfo(batch.expiryDate);

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
          title="Inventory Batch Details"
          storeName={store?.name}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <PageContainer>
          <div className="flex items-center justify-between gap-4 mb-2">
            <Button
              variant="ghost"
              size="sm"
              icon={ArrowLeft}
              onClick={() => navigate('/store-owner/inventory')}
            >
              Back to Inventory
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={Edit2}
                onClick={() => setQtyModalOpen(true)}
              >
                Update Stock
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Edit3}
                onClick={() => navigate(`/store-owner/inventory/${batch._id}/edit`)}
              >
                Edit Batch
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card padding="p-6 sm:p-8" className="lg:col-span-2 space-y-6">
              {/* Expiry Banner */}
              <div className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-bold ${expInfo.bg}`}>
                <Clock3 className="w-5 h-5 shrink-0" />
                <span>{expInfo.text}</span>
              </div>

              {/* Title Header */}
              <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-4">
                <div>
                  <h1 className="text-2xl font-black text-[#1F2937] tracking-tight">
                    Batch #{batch.batchNumber}
                  </h1>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    Product: <span className="font-bold text-[#1F2937]">{batch.productId?.name}</span> ({batch.productId?.category})
                  </p>
                </div>
                <Badge variant={batch.status}>{batch.status}</Badge>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                <div>
                  <span className="font-bold text-[#6B7280] uppercase block mb-1">Stock Quantity</span>
                  <p className="text-xl font-extrabold text-[#1F2937]">{batch.quantity} units</p>
                </div>

                <div>
                  <span className="font-bold text-[#6B7280] uppercase block mb-1">Original Price</span>
                  <p className="text-xl font-extrabold text-[#1F2937]">₹{batch.originalPrice}</p>
                </div>

                <div>
                  <span className="font-bold text-[#6B7280] uppercase block mb-1">Current Price</span>
                  <p className="text-xl font-extrabold text-[#2E7D32]">₹{batch.currentPrice} (0% Discount)</p>
                </div>

                <div>
                  <span className="font-bold text-[#6B7280] uppercase block mb-1">Manufacture Date</span>
                  <p className="font-bold text-[#1F2937] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(batch.manufactureDate).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <span className="font-bold text-[#6B7280] uppercase block mb-1">Expiry Date</span>
                  <p className="font-bold text-[#1F2937] flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {new Date(batch.expiryDate).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <span className="font-bold text-[#6B7280] uppercase block mb-1">Batch Value</span>
                  <p className="font-bold text-[#2E7D32]">
                    ₹{(batch.quantity * batch.originalPrice).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </Card>

            <div className="space-y-6">
              <Card padding="p-6" className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] border-b border-[#E5E7EB] pb-3">
                  Product Context
                </h4>
                <div className="space-y-2 text-xs">
                  <p className="font-bold text-slate-900">{batch.productId?.name}</p>
                  <p className="text-slate-500">Brand: {batch.productId?.brand || '—'}</p>
                  <p className="text-slate-500">Unit: {batch.productId?.unit}</p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/store-owner/products/${batch.productId?._id}`)}
                  className="w-full mt-2"
                >
                  View Master Product
                </Button>
              </Card>
            </div>
          </div>
        </PageContainer>
      </div>

      {/* Stock Modal */}
      <Modal isOpen={qtyModalOpen} onClose={() => setQtyModalOpen(false)} title="Update Stock Quantity">
        <form onSubmit={handleQtySubmit} className="space-y-4">
          <Input
            label="Quantity"
            type="number"
            min="0"
            required
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="secondary" size="sm" onClick={() => setQtyModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={qtyUpdating}>
              Save Quantity
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default InventoryBatchDetails;
