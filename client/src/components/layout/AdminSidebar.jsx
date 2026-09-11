import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../common/Logo';
import {
  LayoutDashboard,
  Users,
  Store,
  Package,
  Boxes,
  Zap,
  ShoppingBag,
  Clock3,
  BarChart3,
  Activity,
  ScrollText,
  LogOut,
  X,
  ShieldAlert
} from 'lucide-react';

const adminNavItems = [
  { id: 'dashboard', label: 'Platform Overview', path: '/admin', icon: LayoutDashboard },
  { id: 'users', label: 'Users', path: '/admin/users', icon: Users },
  { id: 'stores', label: 'Stores', path: '/admin/stores', icon: Store },
  { id: 'products', label: 'Products', path: '/admin/products', icon: Package },
  { id: 'inventory', label: 'Inventory', path: '/admin/inventory', icon: Boxes },
  { id: 'flash-sales', label: 'Flash Sales', path: '/admin/flash-sales', icon: Zap },
  { id: 'orders', label: 'Orders', path: '/admin/orders', icon: ShoppingBag },
  { id: 'expiry-waste', label: 'Expiry & Waste', path: '/admin/expiry-waste', icon: Clock3 },
  { id: 'analytics', label: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
  { id: 'system-health', label: 'System Health', path: '/admin/system-health', icon: Activity },
  { id: 'activity-logs', label: 'Activity Logs', path: '/admin/activity-logs', icon: ScrollText }
];

const AdminSidebar = ({ activeTab, isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleNavClick = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-[#E5E7EB] flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header / Logo */}
        <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size="sm" showTagline={false} />
            <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[10px] font-black tracking-wider uppercase border border-purple-200">
              Admin
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-[#6B7280] hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-none">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Platform Management
          </div>

          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-colors text-left ${
                  isActive
                    ? 'bg-[#2E7D32] text-white shadow-2xs'
                    : 'text-[#6B7280] hover:bg-[#E8F5E9]/50 hover:text-[#2E7D32]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#6B7280]'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* User Profile & Logout Footer */}
        <div className="p-3 border-t border-[#E5E7EB] bg-slate-50/50">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-[#E5E7EB]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-xs uppercase shrink-0 border border-purple-200">
                {user?.name ? user.name[0] : 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#1F2937] truncate">{user?.name || 'Administrator'}</p>
                <p className="text-[10px] text-purple-700 font-semibold truncate">SUPER ADMIN</p>
              </div>
            </div>

            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
