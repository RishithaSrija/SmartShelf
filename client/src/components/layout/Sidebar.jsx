import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Logo from '../common/Logo';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Package,
  Boxes,
  Clock3,
  Zap,
  ShoppingBag,
  BarChart3,
  Settings,
  LogOut,
  User,
  X
} from 'lucide-react';

const navItems = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'expiring', label: 'Expiring Soon', icon: Clock3 },
  { id: 'pricing', label: 'Pricing Rules', icon: Zap },
  { id: 'flash-sales', label: 'Flash Sales', icon: Zap },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'demand-prediction', label: 'Demand Forecast', icon: BarChart3, badge: 'ML v1' },
  { id: 'settings', label: 'Store Settings', icon: Settings }
];

const Sidebar = ({ activeTab, onSelectTab, isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleNavClick = (id) => {
    if (id === 'overview') {
      navigate('/store-owner');
    } else if (id === 'settings') {
      navigate('/store-owner/settings');
    } else if (id === 'products') {
      navigate('/store-owner/products');
    } else if (id === 'inventory') {
      navigate('/store-owner/inventory');
    } else if (id === 'expiring') {
      navigate('/store-owner/expiring-soon');
    } else if (id === 'pricing') {
      navigate('/store-owner/pricing-rules');
    } else if (id === 'flash-sales') {
      navigate('/store-owner/flash-sales');
    } else if (id === 'orders') {
      navigate('/store-owner/orders');
    } else if (id === 'demand-prediction') {
      navigate('/store-owner/demand-prediction');
    } else if (onSelectTab) {
      onSelectTab(id);
    }
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-xs"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-[#E5E7EB] z-50 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Branding */}
        <div>
          <div className="p-5 border-b border-[#E5E7EB] flex items-center justify-between">
            <Logo showTagline size="md" />
            <button
              onClick={onClose}
              className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isLocked = !!item.badge;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (!isLocked) {
                      handleNavClick(item.id);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-[#E8F5E9] text-[#2E7D32] shadow-2xs font-bold'
                      : isLocked
                      ? 'text-slate-400 hover:bg-slate-50 cursor-not-allowed'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-[#2E7D32]' : isLocked ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 border border-slate-200">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Info & Logout */}
        <div className="p-4 border-t border-[#E5E7EB] bg-slate-50/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-200">
              <User className="w-4 h-4 text-[#2E7D32]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#1F2937] truncate">{user?.name}</p>
              <p className="text-[11px] text-[#6B7280] truncate capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
