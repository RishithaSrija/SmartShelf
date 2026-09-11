import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import notificationService from '../../services/notificationService';
import {
  Menu,
  Search,
  ShieldCheck,
  Bell,
  X,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

const AdminTopbar = ({ title, subtitle, onOpenSidebar }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [navSearch, setNavSearch] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (user) {
      notificationService
        .getUserNotifications()
        .then((res) => {
          if (res.success && res.data) {
            setNotifications(res.data.notifications || []);
            setUnreadCount(res.data.unreadCount || 0);
          }
        })
        .catch((err) => console.error('[AdminTopbar] Notification error:', err));
    }
  }, [user]);

  const handleMarkRead = async (id) => {
    try {
      await notificationService.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[AdminTopbar] Mark read error:', err);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const query = navSearch.trim().toLowerCase();
    if (!query) return;

    if (query.includes('user')) navigate('/admin/users');
    else if (query.includes('store')) navigate('/admin/stores');
    else if (query.includes('prod')) navigate('/admin/products');
    else if (query.includes('inv') || query.includes('batch')) navigate('/admin/inventory');
    else if (query.includes('sale') || query.includes('flash')) navigate('/admin/flash-sales');
    else if (query.includes('order')) navigate('/admin/orders');
    else if (query.includes('waste') || query.includes('expir')) navigate('/admin/expiry-waste');
    else if (query.includes('analy') || query.includes('chart')) navigate('/admin/analytics');
    else if (query.includes('health') || query.includes('job')) navigate('/admin/system-health');
    else if (query.includes('log') || query.includes('audit')) navigate('/admin/activity-logs');
    else navigate(`/admin/users?search=${encodeURIComponent(query)}`);

    setNavSearch('');
  };

  return (
    <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
        {/* Left Side: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenSidebar}
            className="lg:hidden p-2 rounded-xl text-[#6B7280] hover:bg-slate-100"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-base sm:text-lg font-black text-[#1F2937] truncate flex items-center gap-2">
              <span>{title || 'Platform Overview'}</span>
            </h1>
            {subtitle && (
              <p className="text-[11px] text-[#6B7280] hidden sm:block truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Quick Nav Search, Notifications, Admin Badge */}
        <div className="flex items-center gap-3">
          {/* Quick Nav Search */}
          <form onSubmit={handleSearchSubmit} className="hidden md:block relative w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search or jump to page..."
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2E7D32] focus:bg-white"
            />
          </form>

          {/* In-App Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 relative transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
              )}
            </button>

            {/* Notification Dropdown Menu */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-slate-900">Admin Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      <Bell className="w-6 h-6 mx-auto mb-2 opacity-40 text-slate-300" />
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n._id}
                        onClick={() => !n.isRead && handleMarkRead(n._id)}
                        className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 ${
                          n.isRead ? 'bg-white hover:bg-slate-50' : 'bg-emerald-50/50 hover:bg-emerald-50/80'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            n.type === 'EXPIRY_ALERT'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-[#2E7D32]'
                          }`}
                        >
                          {n.type === 'EXPIRY_ALERT' ? (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 truncate">{n.title}</p>
                          <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{n.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(n.createdAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Admin Role Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            <span>Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminTopbar;
