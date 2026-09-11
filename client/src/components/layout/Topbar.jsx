import React, { useState, useEffect } from 'react';
import { Menu, Bell, Search, Store, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import notificationService from '../../services/notificationService';

const Topbar = ({ title, storeName, onOpenSidebar, searchPlaceholder = 'Search inventory or products...' }) => {
  const { user } = useAuth();
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
        .catch((err) => console.error('[Topbar] Notification fetch error:', err));
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
      console.error('[Topbar] Mark read error:', err);
    }
  };

  return (
    <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-30 shadow-2xs">
      <div className="px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-[#1F2937] tracking-tight">
              {title}
            </h1>
            {storeName && (
              <p className="text-xs text-[#6B7280] flex items-center gap-1.5 mt-0.5 font-medium">
                <Store className="w-3.5 h-3.5 text-[#2E7D32]" />
                <span>{storeName}</span>
              </p>
            )}
          </div>
        </div>

        {/* Middle: Search input bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-4 py-2 text-xs text-[#1F2937] bg-slate-50 rounded-xl border border-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#2E7D32] focus:bg-white transition-all placeholder-slate-400"
            />
          </div>
        </div>

        {/* Right: Notifications & User profile indicator */}
        <div className="flex items-center gap-3 relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse"></span>
            )}
          </button>

          {/* Notifications Popover Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 p-4 space-y-3 animate-scale-up">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs font-extrabold text-slate-900">Notifications</h4>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No notifications yet.</p>
                ) : (
                  notifications.map((item) => (
                    <div
                      key={item._id}
                      onClick={() => !item.isRead && handleMarkRead(item._id)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        item.isRead
                          ? 'bg-white border-slate-100 text-slate-600'
                          : 'bg-[#E8F5E9]/50 border-emerald-200 text-slate-900 font-medium'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-[#1F2937] leading-tight">{item.title}</p>
                          <p className="text-[11px] text-[#6B7280] mt-0.5">{item.message}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pl-3 border-l border-[#E5E7EB]">
            <div className="w-8 h-8 rounded-xl bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center font-bold text-xs border border-emerald-200">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-[#1F2937] leading-none">{user?.name}</p>
              <span className="text-[10px] text-[#2E7D32] font-extrabold uppercase">
                {user?.role}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
