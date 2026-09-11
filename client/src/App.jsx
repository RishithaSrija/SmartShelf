import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LocationProvider } from './context/LocationContext';
import { ToastProvider } from './components/ui/Toast';
import ProtectedRoute from './components/ProtectedRoute';

// UI Design System Components
import Logo from './components/common/Logo';
import Button from './components/ui/Button';
import Card from './components/ui/Card';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Unauthorized from './pages/Unauthorized';

// Authenticated Dashboards & Admin Pages
import CustomerDashboard from './pages/CustomerDashboard';
import StoreOwnerDashboard from './pages/StoreOwnerDashboard';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminStores from './pages/admin/Stores';
import AdminProducts from './pages/admin/Products';
import AdminInventory from './pages/admin/Inventory';
import AdminFlashSales from './pages/admin/FlashSales';
import AdminOrders from './pages/admin/Orders';
import AdminExpiryWaste from './pages/admin/ExpiryWaste';
import AdminAnalytics from './pages/admin/Analytics';
import AdminSystemHealth from './pages/admin/SystemHealth';
import AdminActivityLogs from './pages/admin/ActivityLogs';

// Store Owner Pages
import Products from './pages/store-owner/Products';
import ProductForm from './pages/store-owner/ProductForm';
import ProductDetails from './pages/store-owner/ProductDetails';
import Inventory from './pages/store-owner/Inventory';
import InventoryBatchForm from './pages/store-owner/InventoryBatchForm';
import InventoryBatchDetails from './pages/store-owner/InventoryBatchDetails';
import PricingRules from './pages/store-owner/PricingRules';
import ExpiringSoon from './pages/store-owner/ExpiringSoon';
import FlashSales from './pages/store-owner/FlashSales';
import CreateFlashSale from './pages/store-owner/CreateFlashSale';
import StoreSettings from './pages/store-owner/StoreSettings';
import StoreOwnerOrders from './pages/store-owner/Orders';
import StoreOwnerOrderDetail from './pages/store-owner/OrderDetails';
import DemandPrediction from './pages/store-owner/DemandPrediction';
import PredictionHistory from './pages/store-owner/PredictionHistory';

// Public & Customer Marketplace Pages
import Marketplace from './pages/customer/Marketplace';
import FlashSaleDetails from './pages/customer/FlashSaleDetails';
import MyOrders from './pages/customer/MyOrders';
import CustomerOrderDetail from './pages/customer/OrderDetails';
import ReservationSuccess from './pages/customer/ReservationSuccess';

// Lucide Icons
import { ShieldCheck, Zap, Layers, Sparkles, ArrowRight, UserCheck, LogOut, Clock3, ShoppingBag, MapPin, Receipt } from 'lucide-react';

function HomeLanding() {
  const { isAuthenticated, user, logout } = useAuth();

  const getDashboardPath = () => {
    if (!user) return '/login';
    if (user.role === 'STORE_OWNER') return '/store-owner';
    if (user.role === 'ADMIN') return '/admin';
    return '/customer';
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#1F2937] flex flex-col justify-between p-6 sm:p-12 font-sans selection:bg-[#2E7D32] selection:text-white">
      {/* Header */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between border-b border-[#E5E7EB] pb-6">
        <Logo showTagline size="md" />

        <div className="flex items-center gap-3">
          <Link to="/marketplace">
            <Button variant="outline" size="sm" icon={ShoppingBag}>
              Explore Marketplace
            </Button>
          </Link>

          {isAuthenticated ? (
            <>
              <Link to={getDashboardPath()}>
                <Button variant="primary" size="sm" icon={UserCheck}>
                  Dashboard ({user?.role})
                </Button>
              </Link>
              <Button variant="secondary" size="sm" icon={LogOut} onClick={logout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="secondary" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">
                  Get Started <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto w-full text-center py-16 flex flex-col items-center justify-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E8F5E9] border border-emerald-200 text-[#2E7D32] text-xs font-bold uppercase tracking-wider mb-6 shadow-2xs">
          <Sparkles className="w-4 h-4 text-[#2E7D32]" />
          <span>Step 14 — Machine Learning Demand &amp; Footfall Forecasting Active</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-[#1F2937] mb-4 leading-tight">
          SmartShelf
        </h1>

        <p className="text-xl sm:text-2xl font-bold text-[#2E7D32] max-w-xl mx-auto mb-4">
          "Save food. Save money."
        </p>

        <p className="text-base sm:text-lg text-[#6B7280] max-w-2xl mx-auto mb-10 leading-relaxed">
          Expiry-Aware Dynamic Pricing, Local Flash Sale Reservations &amp; Scikit-Learn Machine Learning Demand Forecasting.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full mt-4">
          <Card hover padding="p-6">
            <Receipt className="w-8 h-8 text-[#2E7D32] mb-4" />
            <h3 className="text-lg font-bold text-[#1F2937] mb-2">Instant Reservations</h3>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              Customers reserve discounted flash sales with 30-minute guaranteed inventory holds and atomic stock synchronization.
            </p>
          </Card>

          <Card hover padding="p-6">
            <ShoppingBag className="w-8 h-8 text-[#2E7D32] mb-4" />
            <h3 className="text-lg font-bold text-[#1F2937] mb-2">Store Pickup Orders</h3>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              Store owners review incoming reservations, confirm customer pickups, and automatically fulfill orders at pickup.
            </p>
          </Card>

          <Card hover padding="p-6">
            <ShieldCheck className="w-8 h-8 text-[#2E7D32] mb-4" />
            <h3 className="text-lg font-bold text-[#1F2937] mb-2">Automated Hold Expiry</h3>
            <p className="text-xs text-[#6B7280] leading-relaxed">
              Automated 5-minute scheduler monitors pending reservations, automatically releasing uncollected stock back to inventory.
            </p>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full text-center border-t border-[#E5E7EB] pt-6 text-xs text-[#6B7280]">
        SmartShelf &copy; {new Date().getFullYear()} — Save food. Save money.
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <ToastProvider>
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomeLanding />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* Public Customer Marketplace Routes */}
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/marketplace/flash-sales/:id" element={<FlashSaleDetails />} />

              {/* Protected Customer Routes */}
              <Route
                path="/customer"
                element={
                  <ProtectedRoute allowedRoles={['CUSTOMER']}>
                    <CustomerDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/orders"
                element={
                  <ProtectedRoute allowedRoles={['CUSTOMER']}>
                    <MyOrders />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/orders/:id"
                element={
                  <ProtectedRoute allowedRoles={['CUSTOMER']}>
                    <CustomerOrderDetail />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/orders/success/:id"
                element={
                  <ProtectedRoute allowedRoles={['CUSTOMER']}>
                    <ReservationSuccess />
                  </ProtectedRoute>
                }
              />

              {/* Protected Store Owner Routes */}
              <Route
                path="/store-owner"
                element={
                  <ProtectedRoute allowedRoles={['STORE_OWNER']}>
                    <StoreOwnerDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/store-owner/orders"
                element={
                  <ProtectedRoute allowedRoles={['STORE_OWNER']}>
                    <StoreOwnerOrders />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/store-owner/orders/:id"
                element={
                  <ProtectedRoute allowedRoles={['STORE_OWNER']}>
                    <StoreOwnerOrderDetail />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/store-owner/settings"
                element={
                  <ProtectedRoute allowedRoles={['STORE_OWNER']}>
                    <StoreSettings />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/store-owner/products"
                element={
                  <ProtectedRoute allowedRoles={['STORE_OWNER']}>
                    <Products />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/store-owner/products/new"
                element={
                  <ProtectedRoute allowedRoles={['STORE_OWNER']}>
                    <ProductForm />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/store-owner/products/:id"
                element={
                  <ProtectedRoute allowedRoles={['STORE_OWNER']}>
                    <ProductDetails />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/store-owner/products/:id/edit"
                element={
                  <ProtectedRoute allowedRoles={['STORE_OWNER']}>
                    <ProductForm />
                  </ProtectedRoute>
                }
              />

              {/* Protected Inventory Routes */}
              <Route
                path="/store-owner/inventory"
                element={
                  <ProtectedRoute allowedRoles={['STORE_OWNER']}>
                    <Inventory />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/store-owner/inventory/new"
                element={
                  <ProtectedRoute allowedRoles={['STORE_OWNER']}>
                    <InventoryBatchForm />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/store-owner/inventory/:id"
                element={
                  <ProtectedRoute allowedRoles={['STORE_OWNER']}>
                    <InventoryBatchDetails />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/store-owner/inventory/:id/edit"
                element={
                  <ProtectedRoute allowedRoles={['STORE_OWNER']}>
                    <InventoryBatchForm />
                  </ProtectedRoute>
                }
              />

              {/* Protected Pricing Rules & Expiring Routes */}
              <Route
                path="/store-owner/pricing"
                element={
                  <ProtectedRoute allowedRoles={['STORE_OWNER']}>
                    <PricingRules />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/store-owner/pricing-rules"
                element={
                  <ProtectedRoute allowedRoles={['STORE_OWNER']}>
                    <PricingRules />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/store-owner/expiring-soon"
                element={
                  <ProtectedRoute allowedRoles={['STORE_OWNER']}>
                    <ExpiringSoon />
                  </ProtectedRoute>
                }
              />

              {/* Protected Flash Sale Routes */}
              <Route
                path="/store-owner/flash-sales"
                element={
                  <ProtectedRoute allowedRoles={['STORE_OWNER']}>
                    <FlashSales />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/store-owner/flash-sales/new"
                element={
                  <ProtectedRoute allowedRoles={['STORE_OWNER']}>
                    <CreateFlashSale />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/store-owner/demand-prediction"
                element={
                  <ProtectedRoute allowedRoles={['STORE_OWNER']}>
                    <DemandPrediction />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/store-owner/prediction-history"
                element={
                  <ProtectedRoute allowedRoles={['STORE_OWNER']}>
                    <PredictionHistory />
                  </ProtectedRoute>
                }
              />

              {/* Protected Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminUsers />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/stores"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminStores />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/products"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminProducts />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/inventory"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminInventory />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/flash-sales"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminFlashSales />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/orders"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminOrders />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/expiry-waste"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminExpiryWaste />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/analytics"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminAnalytics />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/system-health"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminSystemHealth />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/activity-logs"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminActivityLogs />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </ToastProvider>
      </LocationProvider>
    </AuthProvider>
  );
}
