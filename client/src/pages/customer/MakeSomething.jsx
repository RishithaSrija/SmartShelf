import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import ingredientBasketService from '../../services/ingredientBasketService';
import paymentService, { loadRazorpayScript } from '../../services/paymentService';
import { useToast } from '../../components/ui/Toast';

// UI Components
import Logo from '../../components/common/Logo';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import ProductImage from '../../components/common/ProductImage';
import DemoPaymentModal from '../../components/payment/DemoPaymentModal';

// Icons
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  Store,
  MapPin,
  Clock,
  Check,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Leaf,
  Layers,
  ShieldCheck,
  RotateCcw,
  Boxes,
  TrendingDown,
  Info,
  CreditCard,
  Building2,
  Receipt
} from 'lucide-react';

const categoryTabs = [
  { id: 'ALL', label: 'All Recipes' },
  { id: 'Indian Sweets', label: '🍬 Indian Sweets' },
  { id: 'Traditional Snacks / Sweets', label: '🥜 Snacks & Chikki' },
  { id: 'Bakery', label: '🧁 Bakery & Cakes' }
];

const batchPresets = [
  { label: 'Small (5 kg)', value: 5 },
  { label: 'Medium (10 kg)', value: 10 },
  { label: 'Large (25 kg)', value: 25 },
  { label: 'Commercial (50 kg)', value: 50 }
];

function MakeSomething() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { addToast } = useToast();
  const { latitude, longitude, radius, isLocationSet, locationLabel } = useLocation();

  // Wizard Step: 1 = Recipe, 2 = Batch Size, 3 = Review & Select Ingredients, 4 = Basket & Checkout
  const [step, setStep] = useState(1);

  // Recipes & Selection State
  const [recipes, setRecipes] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState('ALL');
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  // Batch Size State
  const [batchSize, setBatchSize] = useState(10);
  const [customSizeInput, setCustomSizeInput] = useState('');

  // Matching & Inventory State
  const [matchingData, setMatchingData] = useState(null);
  const [loadingMatch, setLoadingMatch] = useState(false);

  // User's Selected Items for the Basket: { [ingredientId]: candidateMatch }
  const [selectedBasketItems, setSelectedBasketItems] = useState({});

  // Checkout State
  const [paymentMethod, setPaymentMethod] = useState('PAY_AT_STORE'); // 'PAY_AT_STORE' | 'ONLINE'
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutSuccessOrders, setCheckoutSuccessOrders] = useState(null);
  const [demoPaymentOrders, setDemoPaymentOrders] = useState([]);
  const [isDemoPaymentModalOpen, setIsDemoPaymentModalOpen] = useState(false);

  // Load recipes on mount
  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        setLoadingRecipes(true);
        const res = await ingredientBasketService.getRecipes();
        if (res.success && res.data) {
          const list = res.data.recipes || [];
          setRecipes(list);

          // If query param recipe is present, auto-select it
          const queryRecipeId = searchParams.get('recipe');
          if (queryRecipeId) {
            const found = list.find((r) => r.id === queryRecipeId);
            if (found) {
              setSelectedRecipe(found);
              setStep(2);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load recipe catalog:', err);
        addToast('Could not load recipes.', 'error');
      } finally {
        setLoadingRecipes(false);
      }
    };

    fetchRecipes();
  }, [searchParams, addToast]);

  // Handle recipe selection
  const handleSelectRecipe = (recipe) => {
    setSelectedRecipe(recipe);
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Trigger ingredient matching
  const handleFindIngredients = async () => {
    if (!selectedRecipe) return;

    try {
      setLoadingMatch(true);
      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      const res = await ingredientBasketService.matchIngredients({
        recipeId: selectedRecipe.id,
        batchSize,
        latitude: isLocationSet ? latitude : undefined,
        longitude: isLocationSet ? longitude : undefined,
        radius: radius || 15
      });

      if (res.success && res.data) {
        setMatchingData(res.data);

        // Pre-select top recommended match for all available ingredients
        const initialSelections = {};
        for (const ing of res.data.ingredients || []) {
          if (ing.recommendedMatch) {
            initialSelections[ing.ingredientId] = {
              ingredientId: ing.ingredientId,
              ingredientName: ing.ingredientName,
              requiredQuantity: ing.requiredQuantity,
              selectedQuantity: Math.min(ing.requiredQuantity, ing.recommendedMatch.availableQuantity),
              match: ing.recommendedMatch
            };
          }
        }
        setSelectedBasketItems(initialSelections);
      }
    } catch (err) {
      console.error('Ingredient matching failed:', err);
      addToast(err.response?.data?.message || 'Could not find ingredients nearby.', 'error');
    } finally {
      setLoadingMatch(false);
    }
  };

  // Change candidate store for an ingredient
  const handleSelectCandidateStore = (ingredientId, candidate, ingRequiredQty, ingName) => {
    setSelectedBasketItems((prev) => ({
      ...prev,
      [ingredientId]: {
        ingredientId,
        ingredientName: ingName,
        requiredQuantity: ingRequiredQty,
        selectedQuantity: Math.min(ingRequiredQty, candidate.availableQuantity),
        match: candidate
      }
    }));
    addToast(`Selected ${candidate.storeName} for ${ingName}`, 'info');
  };

  // Remove an ingredient from basket
  const handleRemoveIngredient = (ingredientId) => {
    setSelectedBasketItems((prev) => {
      const next = { ...prev };
      delete next[ingredientId];
      return next;
    });
  };

  // Group selected items by store for Step 4
  const groupedByStore = Object.values(selectedBasketItems).reduce((acc, item) => {
    const storeId = item.match.storeId.toString();
    if (!acc[storeId]) {
      acc[storeId] = {
        storeId,
        storeName: item.match.storeName,
        storeAddress: item.match.storeAddress,
        items: [],
        subtotal: 0,
        savings: 0
      };
    }
    const itemTotal = item.match.salePrice * item.selectedQuantity;
    const itemSavings = (item.match.originalPrice - item.match.salePrice) * item.selectedQuantity;
    acc[storeId].items.push(item);
    acc[storeId].subtotal += itemTotal;
    acc[storeId].savings += itemSavings;
    return acc;
  }, {});

  const storeGroupsList = Object.values(groupedByStore);
  const totalBasketPrice = storeGroupsList.reduce((sum, g) => sum + g.subtotal, 0);
  const totalBasketSavings = storeGroupsList.reduce((sum, g) => sum + g.savings, 0);
  const totalWasteRescueItems = Object.values(selectedBasketItems).filter((i) => i.match.isWasteRescue).length;

  // Execute checkout for the Ingredient Basket
  const handleCheckoutBasket = async () => {
    const itemsToOrder = Object.values(selectedBasketItems).map((i) => ({
      flashSaleId: i.match.dealId,
      quantity: i.selectedQuantity,
      ingredientName: i.ingredientName,
      name: i.ingredientName
    }));

    if (itemsToOrder.length === 0) {
      addToast('Please select at least one ingredient to checkout.', 'error');
      return;
    }

    try {
      setIsCheckingOut(true);

      const basketGroupId = `BASKET-${Date.now()}`;
      const recipeTitle = `${selectedRecipe.name} (${batchSize} ${selectedRecipe.unit || 'kg'} Batch)`;

      // 1. ONLINE PAYMENT FLOW
      if (paymentMethod === 'ONLINE') {
        const res = await ingredientBasketService.checkoutBasket({
          basketGroupId,
          recipeName: recipeTitle,
          paymentMethod: 'ONLINE',
          items: itemsToOrder
        });

        if (res.success && res.data?.orders) {
          const orders = res.data.orders;
          setCheckoutSuccessOrders(orders);

          // Check if demo payment is active or orders have demoPayment payload
          const isDemo = orders.some((o) => o.isDemoPayment || o.demoPayment || !o.razorpay?.orderId);
          if (isDemo) {
            setIsCheckingOut(false);
            setDemoPaymentOrders(orders);
            setIsDemoPaymentModalOpen(true);
            return;
          }

          // If there is an online order with razorpay payload, trigger gateway for the first order
          const firstOnlineOrder = orders.find((o) => o.razorpay);
          if (firstOnlineOrder) {
            const rzpInfo = firstOnlineOrder.razorpay;
            const options = {
              key: rzpInfo.keyId || (await paymentService.getRazorpayKey()),
              amount: rzpInfo.amount,
              currency: rzpInfo.currency || 'INR',
              name: 'SmartShelf',
              description: `Ingredient Basket: ${recipeTitle}`,
              order_id: rzpInfo.orderId,
              prefill: {
                name: user?.name || '',
                email: user?.email || '',
                contact: user?.phone || ''
              },
              theme: { color: '#2E7D32' },
              handler: async function (response) {
                try {
                  await paymentService.verifyPayment({
                    orderId: firstOnlineOrder._id || firstOnlineOrder.id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature
                  });
                  addToast('Payment verified! Ingredient orders sent to stores.', 'success');
                  navigate('/orders');
                } catch (e) {
                  addToast('Payment verification failed, check My Orders.', 'error');
                  navigate('/orders');
                }
              },
              modal: {
                ondismiss: function () {
                  addToast('Payment dismissed. You can complete payments in My Orders.', 'info');
                  navigate('/orders');
                }
              }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
            return;
          }

          addToast('Ingredient basket reserved successfully!', 'success');
          navigate('/orders');
        }
        return;
      }

      // 2. PAY AT STORE FLOW
      const res = await ingredientBasketService.checkoutBasket({
        basketGroupId,
        recipeName: recipeTitle,
        paymentMethod: 'PAY_AT_STORE',
        items: itemsToOrder
      });

      if (res.success && res.data) {
        addToast(`Reserved ${res.data.orderCount} ingredient items with 30-min hold!`, 'success');
        setCheckoutSuccessOrders(res.data.orders);
        navigate('/orders');
      }
    } catch (err) {
      console.error('Basket checkout error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to checkout basket.';
      addToast(msg, 'error');
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Filtered recipes
  const filteredRecipes = recipes.filter(
    (r) => selectedCategoryTab === 'ALL' || r.category === selectedCategoryTab
  );

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#1F2937] flex flex-col font-sans selection:bg-[#2E7D32] selection:text-white">
      {/* Top Header */}
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/customer" className="hover:opacity-90 transition-opacity">
              <Logo showTagline size="md" />
            </Link>
            <span className="text-slate-300 hidden sm:inline">/</span>
            <span className="text-xs font-extrabold text-purple-900 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-xl hidden sm:flex items-center gap-1">
              <span>🍬 Make Something</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/orders">
              <Button variant="ghost" size="sm" icon={Receipt}>
                My Orders
              </Button>
            </Link>
            <Link to="/customer">
              <Button variant="outline" size="sm" icon={ArrowLeft}>
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner with Feature Pitch */}
      <section className="bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 text-white py-9 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-xs border border-white/20 text-purple-200 text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-purple-300" />
            <span>Business Ingredient Procurement</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">
            Plan your next batch in one basket.
          </h1>

          <p className="text-xs sm:text-sm text-purple-200 max-w-2xl mx-auto font-medium leading-relaxed">
            Choose what you're making and SmartShelf finds the ingredients available nearby — prioritizing stock that needs to move soon to maximize your raw material savings.
          </p>

          {/* Wizard Step Breadcrumb Navigation */}
          <div className="pt-3 flex items-center justify-center gap-2 text-xs font-bold">
            <button
              onClick={() => setStep(1)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                step === 1 ? 'bg-white text-purple-950 shadow-sm' : 'bg-white/10 text-purple-200 hover:bg-white/20'
              }`}
            >
              1. Choose Recipe
            </button>
            <span className="text-purple-400">→</span>

            <button
              disabled={!selectedRecipe}
              onClick={() => selectedRecipe && setStep(2)}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                !selectedRecipe
                  ? 'opacity-40 cursor-not-allowed text-purple-400'
                  : step === 2
                  ? 'bg-white text-purple-950 shadow-sm'
                  : 'bg-white/10 text-purple-200 hover:bg-white/20 cursor-pointer'
              }`}
            >
              2. Batch Size
            </button>
            <span className="text-purple-400">→</span>

            <button
              disabled={!matchingData}
              onClick={() => matchingData && setStep(3)}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                !matchingData
                  ? 'opacity-40 cursor-not-allowed text-purple-400'
                  : step === 3
                  ? 'bg-white text-purple-950 shadow-sm'
                  : 'bg-white/10 text-purple-200 hover:bg-white/20 cursor-pointer'
              }`}
            >
              3. Select Ingredients
            </button>
            <span className="text-purple-400">→</span>

            <button
              disabled={Object.keys(selectedBasketItems).length === 0}
              onClick={() => Object.keys(selectedBasketItems).length > 0 && setStep(4)}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                Object.keys(selectedBasketItems).length === 0
                  ? 'opacity-40 cursor-not-allowed text-purple-400'
                  : step === 4
                  ? 'bg-white text-purple-950 shadow-sm'
                  : 'bg-white/10 text-purple-200 hover:bg-white/20 cursor-pointer'
              }`}
            >
              4. Review Basket
            </button>
          </div>
        </div>
      </section>

      {/* Main Wizard Body */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">

        {/* ------------------------------------------------------------- */}
        {/* STEP 1: CHOOSE WHAT YOU'RE MAKING */}
        {/* ------------------------------------------------------------- */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                What are you making?
              </h2>
              <p className="text-xs text-slate-500">
                Select a verified production recipe to automatically calculate required raw materials.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
              {categoryTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategoryTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedCategoryTab === tab.id
                      ? 'bg-purple-700 text-white shadow-sm ring-2 ring-purple-200'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Recipe Grid */}
            {loadingRecipes ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <Card key={n} padding="p-6" className="space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <Skeleton className="h-9 w-full rounded-xl" />
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRecipes.map((recipe) => {
                  const isCurrent = selectedRecipe?.id === recipe.id;
                  return (
                    <Card
                      key={recipe.id}
                      hover
                      padding="p-6"
                      className={`flex flex-col justify-between transition-all group cursor-pointer border ${
                        isCurrent
                          ? 'border-purple-600 ring-2 ring-purple-100 bg-purple-50/20'
                          : 'border-slate-200 hover:border-purple-300 bg-white shadow-xs'
                      }`}
                      onClick={() => handleSelectRecipe(recipe)}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-3xl">{recipe.icon || '🍬'}</div>
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200">
                            {recipe.category}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-base font-black text-slate-900 group-hover:text-purple-700 transition-colors">
                            {recipe.name}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            {recipe.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 space-y-1.5">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                            Typical Ingredients ({recipe.ingredientCount}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {recipe.typicalIngredients.map((name, i) => (
                              <span
                                key={i}
                                className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-5">
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full justify-center bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectRecipe(recipe);
                          }}
                        >
                          Select Recipe <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 2: CHOOSE BATCH SIZE */}
        {/* ------------------------------------------------------------- */}
        {step === 2 && selectedRecipe && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedRecipe.icon || '🍬'}</span>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">
                      {selectedRecipe.name}
                    </h2>
                    <p className="text-xs text-slate-500">{selectedRecipe.category}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(1)}
                  className="text-xs text-purple-700"
                >
                  Change Recipe
                </Button>
              </div>

              {/* Batch Size Selector */}
              <div className="space-y-3">
                <label className="block text-sm font-extrabold text-slate-900">
                  How much do you want to make?
                </label>
                <p className="text-xs text-slate-500">
                  Select a production batch size. SmartShelf will scale the raw ingredient requirements proportionally.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  {batchPresets.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => {
                        setBatchSize(preset.value);
                        setCustomSizeInput('');
                      }}
                      className={`p-3 rounded-2xl text-xs font-black border transition-all cursor-pointer text-center ${
                        batchSize === preset.value && !customSizeInput
                          ? 'bg-purple-700 text-white border-purple-700 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Custom Batch Size Input */}
                <div className="pt-2 flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500">Or custom quantity:</span>
                  <div className="flex items-center gap-2 max-w-[180px]">
                    <input
                      type="number"
                      min="1"
                      max="500"
                      placeholder="e.g. 15"
                      value={customSizeInput}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setCustomSizeInput(e.target.value);
                        if (val > 0) setBatchSize(val);
                      }}
                      className="w-full px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white"
                    />
                    <span className="text-xs font-bold text-slate-700">kg</span>
                  </div>
                </div>
              </div>

              {/* Proportional Ingredients Preview */}
              <div className="bg-purple-50/60 border border-purple-100 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Scaled Ingredient Requirements ({batchSize} kg batch):</span>
                  </span>
                </div>

                <div className="divide-y divide-purple-100 text-xs">
                  {selectedRecipe.typicalIngredients ? (
                    // We call calculateIngredients locally
                    (() => {
                      const scale = batchSize / (selectedRecipe.baseBatchSize || 10);
                      return (
                        <div className="space-y-1.5 pt-1">
                          <p className="text-[11px] text-purple-800">
                            SmartShelf will search for all necessary ingredients across local store inventory batches.
                          </p>
                        </div>
                      );
                    })()
                  ) : null}
                </div>
              </div>

              {/* CTA to Step 3 */}
              <div className="pt-2 flex items-center gap-3">
                <Button
                  variant="primary"
                  size="md"
                  loading={loadingMatch}
                  className="w-full bg-purple-700 hover:bg-purple-800 text-white font-extrabold py-3 rounded-2xl shadow-md text-sm"
                  onClick={handleFindIngredients}
                >
                  Find Ingredients Nearby ({batchSize} kg Batch) <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 3: REVIEW & SELECT INGREDIENTS */}
        {/* ------------------------------------------------------------- */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {loadingMatch ? (
              <div className="space-y-4 max-w-4xl mx-auto">
                <Skeleton className="h-10 w-1/3" />
                <Skeleton className="h-28 w-full rounded-2xl" />
                <Skeleton className="h-28 w-full rounded-2xl" />
                <Skeleton className="h-28 w-full rounded-2xl" />
              </div>
            ) : matchingData ? (
              <>
                {/* Header Summary for Ingredients */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{selectedRecipe.icon || '🍬'}</span>
                      <h2 className="text-xl font-black text-slate-900">
                        {matchingData.recipeName} — {matchingData.batchSize} {matchingData.unit} Batch
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {matchingData.summary.availableCount} of {matchingData.summary.totalIngredients} ingredients available in full. Prioritizing stock that needs to move soon.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStep(2)}
                      className="text-xs"
                    >
                      Change Batch Size
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs"
                      disabled={Object.keys(selectedBasketItems).length === 0}
                      onClick={() => {
                        setStep(4);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      Review Basket ({Object.keys(selectedBasketItems).length}) <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>

                {/* Ingredient Requirements List */}
                <div className="space-y-4">
                  {matchingData.ingredients.map((ing) => {
                    const selectedItem = selectedBasketItems[ing.ingredientId];
                    const topMatch = ing.recommendedMatch;

                    return (
                      <Card
                        key={ing.ingredientId}
                        padding="p-5 sm:p-6"
                        className="bg-white border border-slate-200 shadow-xs space-y-4"
                      >
                        {/* Ingredient Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-black text-slate-900">
                                {ing.ingredientName}
                              </h3>
                              <span className="text-xs font-bold text-slate-500">
                                Required: <strong className="text-slate-900">{ing.requiredQuantity} {ing.unit}</strong>
                              </span>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div>
                            {ing.status === 'AVAILABLE' ? (
                              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Available in full</span>
                              </span>
                            ) : ing.status === 'PARTIALLY_AVAILABLE' ? (
                              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                <span>{ing.statusMessage}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Not Available Nearby</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Recommendation Card */}
                        {topMatch ? (
                          <div className="space-y-3">
                            <div className="p-4 rounded-2xl border bg-slate-50/60 border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                              {/* Left Product Image & Title */}
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-200">
                                  <ProductImage
                                    src={topMatch.imageUrl}
                                    alt={topMatch.productName}
                                    category={topMatch.category}
                                    aspectRatio="square"
                                    className="w-full h-full object-cover"
                                  />
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-black text-slate-900 truncate">
                                      {topMatch.productName}
                                    </h4>
                                    {topMatch.isWasteRescue && (
                                      <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <Leaf className="w-3 h-3 text-emerald-600" />
                                        <span>Waste Rescue</span>
                                      </span>
                                    )}
                                    {topMatch.discountPercentage >= 20 && (
                                      <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <Flame className="w-3 h-3 text-amber-600" />
                                        <span>{topMatch.discountPercentage}% OFF</span>
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                    <Store className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                    <span className="font-semibold text-slate-700">{topMatch.storeName}</span>
                                    {topMatch.distanceKm !== null && (
                                      <span>• {topMatch.distanceKm} km away</span>
                                    )}
                                  </div>

                                  {/* Reasons */}
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {topMatch.reasons.map((r, i) => (
                                      <span
                                        key={i}
                                        className="text-[10px] font-bold bg-white text-purple-900 border border-purple-200 px-2 py-0.5 rounded-md shadow-2xs"
                                      >
                                        {r}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Right Pricing & Action */}
                              <div className="flex items-center justify-between md:justify-end gap-5 w-full md:w-auto pt-2 md:pt-0 border-t md:border-none border-slate-200">
                                <div className="text-right">
                                  <div className="flex items-baseline gap-1.5 justify-end">
                                    <span className="text-lg font-black text-emerald-700">₹{topMatch.salePrice}</span>
                                    <span className="text-xs text-slate-400 line-through">₹{topMatch.originalPrice}</span>
                                    <span className="text-[10px] text-slate-500">/{topMatch.unit}</span>
                                  </div>
                                  <span className="text-[11px] text-slate-500 font-medium">
                                    Stock: <strong>{topMatch.availableQuantity} {topMatch.unit}</strong>
                                  </span>
                                </div>

                                <div>
                                  {selectedItem ? (
                                    <button
                                      onClick={() => handleRemoveIngredient(ing.ingredientId)}
                                      className="px-3.5 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                                    >
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>In Basket</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() =>
                                        handleSelectCandidateStore(
                                          ing.ingredientId,
                                          topMatch,
                                          ing.requiredQuantity,
                                          ing.ingredientName
                                        )
                                      }
                                      className="px-3.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
                                    >
                                      + Add to Basket
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Alternative Stores (if available) */}
                            {ing.otherStores && ing.otherStores.length > 0 && (
                              <div className="pt-1">
                                <span className="text-[11px] font-bold text-slate-500 block mb-1">
                                  Other stores carrying this ingredient:
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {ing.otherStores.map((alt) => (
                                    <button
                                      key={alt.dealId}
                                      onClick={() =>
                                        handleSelectCandidateStore(
                                          ing.ingredientId,
                                          alt,
                                          ing.requiredQuantity,
                                          ing.ingredientName
                                        )
                                      }
                                      className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                                    >
                                      <Store className="w-3 h-3 text-slate-400" />
                                      <span>{alt.storeName} (₹{alt.salePrice}/{alt.unit})</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Missing Ingredient Notice */
                          <div className="bg-rose-50/50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                            <div>
                              <span className="font-bold text-rose-900">
                                No active local stores currently have {ing.ingredientName} in stock.
                              </span>
                              <p className="text-[11px] text-rose-700 mt-0.5">
                                You can search the broader marketplace catalog or procure this ingredient separately.
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <Link to="/marketplace">
                                <Button variant="outline" size="sm" className="text-xs">
                                  Search Marketplace
                                </Button>
                              </Link>
                              {ing.optional && (
                                <span className="text-[11px] text-slate-500 font-medium italic">
                                  (Optional for this recipe)
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>

                {/* Sticky Floating Bottom Bar for Basket Review */}
                <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block">Selected Items:</span>
                      <strong className="text-base text-slate-900">
                        {Object.keys(selectedBasketItems).length} of {matchingData.summary.totalIngredients}
                      </strong>
                    </div>
                    <div className="border-l border-slate-200 pl-4">
                      <span className="text-slate-500 block">Estimated Total:</span>
                      <strong className="text-base text-purple-900">₹{totalBasketPrice}</strong>
                    </div>
                    {totalBasketSavings > 0 && (
                      <div className="border-l border-slate-200 pl-4 hidden md:block">
                        <span className="text-emerald-700 block">Potential Savings:</span>
                        <strong className="text-base text-emerald-700">₹{totalBasketSavings}</strong>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Button
                      variant="primary"
                      size="md"
                      disabled={Object.keys(selectedBasketItems).length === 0}
                      className="w-full sm:w-auto bg-purple-700 hover:bg-purple-800 text-white font-extrabold px-6"
                      onClick={() => {
                        setStep(4);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      Review &amp; Checkout Basket <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* STEP 4: BASKET SUMMARY & MULTI-STORE CHECKOUT */}
        {/* ------------------------------------------------------------- */}
        {step === 4 && (
          <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Your Ingredient Basket
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review selected ingredients grouped by store before placing reservations.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(3)}
                className="text-xs"
              >
                ← Edit Ingredients
              </Button>
            </div>

            {/* Metrics Overview Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 block">Total Ingredients</span>
                <span className="text-xl font-black text-slate-900">
                  {Object.keys(selectedBasketItems).length}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 block">Stores Involved</span>
                <span className="text-xl font-black text-purple-900">
                  {storeGroupsList.length}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 block">Waste Rescue Items</span>
                <span className="text-xl font-black text-emerald-700">
                  {totalWasteRescueItems}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 block">Total Estimated Cost</span>
                <span className="text-xl font-black text-slate-900">
                  ₹{totalBasketPrice}
                </span>
              </div>
            </div>

            {/* Multi-Store Safe Order Notice */}
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3 text-xs text-blue-900">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-black mb-0.5">
                  Multi-Store Reservation Architecture
                </strong>
                <span>
                  Your ingredients come from <strong>{storeGroupsList.length} different local stores</strong>.
                  Checkout will atomically create separate orders for each store linked under this basket session,
                  providing each retailer with automated 30-minute reservation holds.
                </span>
              </div>
            </div>

            {/* Store Groups */}
            <div className="space-y-4">
              {storeGroupsList.map((group) => (
                <Card key={group.storeId} padding="p-5" className="bg-white border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-purple-600" />
                      <h4 className="text-sm font-black text-slate-900">
                        {group.storeName}
                      </h4>
                    </div>
                    <span className="text-xs font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded-md">
                      Subtotal: ₹{group.subtotal}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {group.items.map((item) => (
                      <div key={item.ingredientId} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-extrabold text-slate-900">{item.ingredientName}</span>
                          <span className="text-slate-500 block text-[11px]">
                            {item.selectedQuantity} {item.match.unit} × ₹{item.match.salePrice}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-slate-900">
                            ₹{item.match.salePrice * item.selectedQuantity}
                          </span>
                          {item.match.originalPrice > item.match.salePrice && (
                            <span className="text-[10px] text-emerald-700 block font-semibold">
                              Saved ₹{(item.match.originalPrice - item.match.salePrice) * item.selectedQuantity}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>

            {/* Payment Method Selection */}
            <Card padding="p-5" className="bg-white border border-slate-200 shadow-xs space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Choose Payment Method
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('PAY_AT_STORE')}
                  className={`p-3.5 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    paymentMethod === 'PAY_AT_STORE'
                      ? 'border-[#2E7D32] bg-[#E8F5E9]/60 text-[#1F2937] ring-1 ring-[#2E7D32]'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center ${
                      paymentMethod === 'PAY_AT_STORE' ? 'border-[#2E7D32]' : 'border-slate-300'
                    }`}
                  >
                    {paymentMethod === 'PAY_AT_STORE' && <div className="w-2 h-2 rounded-full bg-[#2E7D32]" />}
                  </div>
                  <div>
                    <span className="font-bold text-xs block text-slate-900">Pay at Store (Pickup)</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Guaranteed 30-minute hold reservation. Pay cash or UPI upon collection.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('ONLINE')}
                  className={`p-3.5 rounded-2xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    paymentMethod === 'ONLINE'
                      ? 'border-[#2E7D32] bg-[#E8F5E9]/60 text-[#1F2937] ring-1 ring-[#2E7D32]'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center ${
                      paymentMethod === 'ONLINE' ? 'border-[#2E7D32]' : 'border-slate-300'
                    }`}
                  >
                    {paymentMethod === 'ONLINE' && <div className="w-2 h-2 rounded-full bg-[#2E7D32]" />}
                  </div>
                  <div>
                    <span className="font-bold text-xs block text-slate-900">Pay Online (Razorpay)</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Instant online payment via UPI, Credit/Debit Cards, or Netbanking.
                    </p>
                  </div>
                </button>
              </div>
            </Card>

            {/* Final Checkout Button */}
            <div className="pt-2">
              <Button
                variant="primary"
                size="lg"
                loading={isCheckingOut}
                disabled={storeGroupsList.length === 0}
                className="w-full bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-black py-4 rounded-2xl shadow-lg text-base"
                onClick={handleCheckoutBasket}
              >
                Place Ingredient Basket Order (₹{totalBasketPrice}) <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#E5E7EB] py-8 text-center text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo showTagline size="sm" />
          <p>SmartShelf &copy; {new Date().getFullYear()} — Ingredient Basket &amp; Intelligent Waste Reduction</p>
        </div>
      </footer>
      {/* Demo Payment Modal for Basket Orders */}
      <DemoPaymentModal
        isOpen={isDemoPaymentModalOpen}
        onClose={() => {
          setIsDemoPaymentModalOpen(false);
          navigate('/orders');
        }}
        orders={demoPaymentOrders}
        onSuccess={(updatedOrders) => {
          setIsDemoPaymentModalOpen(false);
          addToast('Demo payment captured! Ingredient orders sent to stores.', 'success');
          navigate('/orders');
        }}
        onFailure={(updatedOrders) => {
          setIsDemoPaymentModalOpen(false);
          addToast('Payment simulation failed. You can complete it in My Orders.', 'info');
          navigate('/orders');
        }}
      />
    </div>
  );
}

export default MakeSomething;
