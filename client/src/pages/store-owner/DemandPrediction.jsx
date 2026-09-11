import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import mlService from '../../services/mlService';
import productService from '../../services/productService';
import Sidebar from '../../components/layout/Sidebar';
import Topbar from '../../components/layout/Topbar';
import PageContainer from '../../components/layout/PageContainer';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import {
  TrendingUp,
  Calendar,
  Package,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
  History,
  ArrowRight,
  RotateCcw,
  Zap,
  BarChart3,
  ShieldCheck
} from 'lucide-react';

function DemandPrediction() {
  const { addToast } = useToast();

  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [targetDate, setTargetDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [predictionData, setPredictionData] = useState(null);
  const [insufficientData, setInsufficientData] = useState(null);
  const [serviceError, setServiceError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load store products on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        const res = await productService.getProducts({ limit: 100 });
        const prodList = res.data?.products || (Array.isArray(res.data) ? res.data : []);
        setProducts(prodList);
        if (prodList.length > 0) {
          setSelectedProductId(prodList[0]._id);
        }
      } catch (err) {
        console.error('[DemandPrediction] Product fetch error:', err);
        addToast('Unable to load product list.', 'error');
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, [addToast]);

  const handlePredict = async (e) => {
    if (e) e.preventDefault();
    if (!selectedProductId) {
      addToast('Please select a product first.', 'warning');
      return;
    }

    try {
      setPredicting(true);
      setPredictionData(null);
      setInsufficientData(null);
      setServiceError(null);

      const res = await mlService.getDemandPrediction(selectedProductId, targetDate);

      if (res.success && res.data) {
        setPredictionData(res.data);
      } else if (res.code === 'INSUFFICIENT_DATA') {
        setInsufficientData(res);
      } else {
        setServiceError(res.message || 'Unable to generate prediction.');
      }
    } catch (err) {
      console.error('[DemandPrediction] Prediction error:', err);
      if (err.response?.status === 503) {
        setServiceError('Demand prediction service is temporarily unavailable. Please verify the ML microservice is running.');
      } else {
        setServiceError(err.response?.data?.message || err.message || 'Failed to generate prediction.');
      }
    } finally {
      setPredicting(false);
    }
  };

  const selectedProduct = products.find((p) => p._id === selectedProductId);

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#1F2937] flex font-sans">
      <Sidebar
        activeTab="demand-prediction"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Topbar
          title="Demand Prediction"
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <PageContainer>
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black text-[#1F2937] tracking-tight">
                    Demand Prediction
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#2E7D32] text-[11px] font-extrabold border border-emerald-200">
                    ML Advisory
                  </span>
                </div>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Use historical sales patterns to estimate upcoming product demand.
                </p>
              </div>

              <Link to="/store-owner/prediction-history">
                <Button variant="outline" size="sm" icon={History} className="text-xs">
                  Prediction History
                </Button>
              </Link>
            </div>

            {/* Selection Form Card */}
            <Card padding="p-6" className="bg-white border border-[#E5E7EB] shadow-2xs">
              <form onSubmit={handlePredict} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                {/* 1. Product Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Select Product
                  </label>
                  {loadingProducts ? (
                    <Skeleton height="h-10" rounded="rounded-xl" />
                  ) : (
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#2E7D32] focus:bg-white font-medium"
                    >
                      {products.map((prod) => (
                        <option key={prod._id} value={prod._id}>
                          {prod.name} ({prod.category})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* 2. Target Date Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Prediction Date
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E5E7EB] bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#2E7D32] focus:bg-white font-medium"
                  />
                </div>

                {/* 3. Action Button */}
                <div>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    icon={TrendingUp}
                    disabled={predicting || loadingProducts || !selectedProductId}
                    className="w-full justify-center text-xs py-2.5"
                  >
                    {predicting ? 'Calculating Demand...' : 'Predict Demand'}
                  </Button>
                </div>
              </form>
            </Card>

            {/* Results Display Area */}
            {predicting ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} padding="p-6">
                    <Skeleton height="h-6" width="w-1/2" />
                    <Skeleton height="h-12" width="w-2/3" className="mt-3" />
                  </Card>
                ))}
              </div>
            ) : predictionData ? (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Expected Demand */}
                  <Card padding="p-6" className="bg-[#2E7D32] text-white border-none shadow-md">
                    <div className="flex items-center justify-between text-emerald-200">
                      <span className="text-xs font-bold uppercase tracking-wider">Expected Demand</span>
                      <TrendingUp className="w-5 h-5 text-emerald-200" />
                    </div>
                    <div className="text-4xl font-black text-white mt-3 font-mono">
                      {predictionData.roundedPrediction}{' '}
                      <span className="text-sm font-normal text-emerald-100">units</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-emerald-100 mt-3 pt-3 border-t border-emerald-600/60">
                      <span>Target Date: <strong>{predictionData.predictionDate}</strong></span>
                      <span className="font-mono">{predictionData.modelVersion}</span>
                    </div>
                  </Card>

                  {/* Current Active Inventory */}
                  <Card padding="p-6" className="bg-white border border-[#E5E7EB] shadow-2xs">
                    <div className="flex items-center justify-between text-slate-500">
                      <span className="text-xs font-bold uppercase tracking-wider">Current Inventory</span>
                      <Package className="w-5 h-5 text-[#2E7D32]" />
                    </div>
                    <div className="text-4xl font-black text-slate-900 mt-3 font-mono">
                      {predictionData.currentInventory}{' '}
                      <span className="text-sm font-normal text-slate-500">units</span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <Badge
                        variant={
                          predictionData.currentInventory >= predictionData.roundedPrediction
                            ? 'AVAILABLE'
                            : 'LOW_STOCK'
                        }
                      >
                        {predictionData.currentInventory >= predictionData.roundedPrediction
                          ? 'Stock Sufficient'
                          : 'Potential Stockout Risk'}
                      </Badge>
                    </div>
                  </Card>

                  {/* Near-Expiry Analysis */}
                  <Card padding="p-6" className="bg-white border border-[#E5E7EB] shadow-2xs">
                    <div className="flex items-center justify-between text-amber-600">
                      <span className="text-xs font-bold uppercase tracking-wider">Near-Expiry Stock</span>
                      <Clock className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="text-4xl font-black text-slate-900 mt-3 font-mono">
                      {predictionData.nearExpiryQuantity}{' '}
                      <span className="text-sm font-normal text-slate-500">units</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-100">
                      Batches expiring within the next 3 days.
                    </p>
                  </Card>
                </div>

                {/* Demand & Expiry Interpretation Insights */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card padding="p-6" className="bg-emerald-50/60 border border-emerald-200 space-y-2">
                    <div className="flex items-center gap-2 text-[#2E7D32] font-bold text-xs uppercase tracking-wider">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Inventory Demand Analysis</span>
                    </div>
                    <p className="text-sm font-extrabold text-slate-900">
                      {predictionData.inventoryInsight}
                    </p>
                    <p className="text-[11px] text-[#6B7280]">
                      Comparison between current in-stock inventory ({predictionData.currentInventory}) and projected sales ({predictionData.roundedPrediction}).
                    </p>
                  </Card>

                  <Card padding="p-6" className="bg-amber-50/60 border border-amber-200 space-y-2">
                    <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
                      <Zap className="w-4 h-4 text-amber-600" />
                      <span>Expiry &amp; Food Waste Recommendation</span>
                    </div>
                    <p className="text-sm font-extrabold text-slate-900">
                      {predictionData.expiryInsight || 'No near-expiry inventory risk detected for this product.'}
                    </p>
                    <p className="text-[11px] text-[#6B7280]">
                      Advisory recommendation to prevent unsold products from reaching expiration.
                    </p>
                  </Card>
                </div>

                {/* Historical Demand Context Note */}
                <Card padding="p-4" className="bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-[#6B7280]">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-slate-400" />
                    <span>{predictionData.confidenceNote}</span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-slate-500">
                    Model: Demand Model v1 (RandomForestRegressor)
                  </span>
                </Card>
              </div>
            ) : insufficientData ? (
              /* Insufficient Data State */
              <Card padding="p-8" className="bg-white border border-[#E5E7EB] text-center max-w-xl mx-auto space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-slate-900">
                  Not enough historical sales data yet
                </h3>
                <p className="text-xs text-[#6B7280] leading-relaxed">
                  SmartShelf requires at least {insufficientData.requiredObservations || 30} daily sales observations for a statistically reliable prediction. Currently recorded: <strong>{insufficientData.observationsCount || 0} observations</strong>.
                </p>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden max-w-xs mx-auto">
                  <div
                    className="bg-[#2E7D32] h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(((insufficientData.observationsCount || 0) / (insufficientData.requiredObservations || 30)) * 100)
                      )}%`
                    }}
                  />
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl text-emerald-800 text-xs font-semibold">
                  {insufficientData.suggestedAction || 'Continue recording sales to unlock demand predictions.'}
                </div>
              </Card>
            ) : serviceError ? (
              /* Service Offline or Error */
              <Card padding="p-6" className="bg-rose-50 border border-rose-200 text-rose-800 space-y-3">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  <span>Service Notification</span>
                </div>
                <p className="text-xs text-rose-700">{serviceError}</p>
                <Button variant="outline" size="sm" onClick={handlePredict} className="text-xs">
                  Retry Prediction
                </Button>
              </Card>
            ) : (
              /* Initial Empty State */
              <Card padding="p-12" className="bg-white border border-[#E5E7EB] text-center space-y-3">
                <TrendingUp className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-extrabold text-slate-800">
                  Select a product and date to forecast demand
                </h3>
                <p className="text-xs text-[#6B7280] max-w-md mx-auto">
                  SmartShelf analyzes historical completed orders, weekly seasonality, and recent moving averages to forecast expected customer demand.
                </p>
              </Card>
            )}
          </div>
        </PageContainer>
      </div>
    </div>
  );
}

export default DemandPrediction;
