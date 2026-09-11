import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, LogOut, User } from 'lucide-react';

function AdminDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between p-6 sm:p-12 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Header Navigation */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between border-b border-slate-200 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-md">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Admin Portal</h1>
            <p className="text-xs text-slate-500">System Administration Console</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm">
            <User className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{user?.name}</span>
            <span className="text-xs text-slate-900 bg-slate-200 px-2 py-0.5 rounded-md uppercase font-extrabold">{user?.role}</span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 px-3 py-2 rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto w-full text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm p-8 my-auto">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center mx-auto mb-6 shadow-lg">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 mb-3">Admin Portal</h2>
        <p className="text-base font-medium text-emerald-700 mb-6">
          "Save food. Save money."
        </p>
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-600 max-w-md mx-auto">
          System Administration coming in the next development phase.
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full text-center text-xs text-slate-400 pt-6 border-t border-slate-200">
        SmartShelf &copy; {new Date().getFullYear()} — Administrator Authorization Verified
      </footer>
    </div>
  );
}

export default AdminDashboard;
