import React, { useState, useEffect, useCallback } from 'react';
import adminService from '../../services/adminService';
import AdminSidebar from '../../components/layout/AdminSidebar';
import AdminTopbar from '../../components/layout/AdminTopbar';
import PageContainer from '../../components/layout/PageContainer';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  UserCheck,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Filter,
  UserX,
  AlertCircle
} from 'lucide-react';

const roleFilters = [
  { id: 'ALL', label: 'All Roles' },
  { id: 'CUSTOMER', label: 'Customers' },
  { id: 'STORE_OWNER', label: 'Store Owners' },
  { id: 'ADMIN', label: 'Admins' }
];

function AdminUsers() {
  const { addToast } = useToast();

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [activeRole, setActiveRole] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminService.getUsers({
        page,
        limit: 20,
        role: activeRole !== 'ALL' ? activeRole : undefined,
        search: searchTerm.trim() || undefined
      });

      if (res.success && res.data) {
        setUsers(res.data.users || []);
        setPagination(res.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('[AdminUsers] Fetch error:', err);
      addToast('Unable to load users list.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, activeRole, searchTerm, addToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleStatus = async (user) => {
    try {
      setUpdatingId(user._id);
      const targetState = user.isActive === false ? true : false;
      const res = await adminService.updateUserStatus(user._id, targetState);
      if (res.success && res.data) {
        addToast(`User ${user.name} is now ${targetState ? 'ACTIVE' : 'DEACTIVATED'}`, 'success');
        fetchUsers();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update user status.';
      addToast(msg, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleChangeRole = async (user, newRole) => {
    if (newRole === user.role) return;
    try {
      setUpdatingId(user._id);
      const res = await adminService.updateUserRole(user._id, newRole);
      if (res.success && res.data) {
        addToast(`User ${user.name} role changed to ${newRole}`, 'success');
        fetchUsers();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update user role.';
      addToast(msg, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#1F2937] flex font-sans">
      <AdminSidebar
        activeTab="users"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <AdminTopbar
          title="User Management"
          subtitle="View and manage platform accounts, role assignments, and access permissions."
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <PageContainer>
          <div className="space-y-6">
            {/* Header Title */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#1F2937] tracking-tight flex items-center gap-2">
                  <Users className="w-6 h-6 text-[#2E7D32]" />
                  <span>Platform Users ({pagination.total})</span>
                </h2>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Manage registered Customers, Store Owners, and Administrators.
                </p>
              </div>

              <Button
                variant="ghost"
                size="sm"
                icon={RotateCcw}
                onClick={fetchUsers}
                className="text-xs"
              >
                Refresh
              </Button>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-2xs">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
                {roleFilters.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveRole(tab.id);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      activeRole === tab.id
                        ? 'bg-[#2E7D32] text-white shadow-2xs'
                        : 'bg-slate-50 border border-[#E5E7EB] text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name, email, phone..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#E5E7EB] bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#2E7D32] focus:bg-white"
                />
              </div>
            </div>

            {/* Users Table */}
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} padding="p-4">
                    <Skeleton height="h-6" width="w-1/3" />
                    <Skeleton height="h-4" width="w-1/2" className="mt-2" />
                  </Card>
                ))}
              </div>
            ) : users.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No users found"
                description={
                  activeRole === 'ALL'
                    ? 'No registered users match your search criteria.'
                    : `No users found with role "${activeRole}".`
                }
              />
            ) : (
              <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-[#E5E7EB] text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                        <th className="p-4">User</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">Phone</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Registered</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {users.map((u) => (
                        <tr key={u._id} className="hover:bg-slate-50/75 transition-colors">
                          <td className="p-4">
                            <p className="font-extrabold text-slate-900">{u.name}</p>
                            <p className="text-[11px] text-slate-500 font-mono">{u.email}</p>
                          </td>
                          <td className="p-4">
                            <select
                              value={u.role}
                              disabled={updatingId === u._id}
                              onChange={(e) => handleChangeRole(u, e.target.value)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-bold bg-slate-50 focus:outline-none focus:ring-1 focus:ring-[#2E7D32]"
                            >
                              <option value="CUSTOMER">CUSTOMER</option>
                              <option value="STORE_OWNER">STORE_OWNER</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                          </td>
                          <td className="p-4 font-mono text-slate-600">
                            {u.phone || '—'}
                          </td>
                          <td className="p-4">
                            <Badge variant={u.isActive !== false ? 'AVAILABLE' : 'EXPIRED'}>
                              {u.isActive !== false ? 'ACTIVE' : 'DEACTIVATED'}
                            </Badge>
                          </td>
                          <td className="p-4 text-[11px] text-slate-500">
                            {new Date(u.createdAt).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              variant={u.isActive !== false ? 'outline' : 'primary'}
                              size="sm"
                              loading={updatingId === u._id}
                              onClick={() => handleToggleStatus(u)}
                              className={`text-[11px] px-2.5 py-1 ${
                                u.isActive !== false
                                  ? 'text-rose-600 border-rose-200 hover:bg-rose-50'
                                  : 'bg-emerald-600 hover:bg-emerald-700'
                              }`}
                            >
                              {u.isActive !== false ? 'Deactivate' : 'Activate'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-4 border-t border-[#E5E7EB]">
                <Button
                  variant="outline"
                  size="sm"
                  icon={ChevronLeft}
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>

                <span className="text-xs font-bold text-slate-700">
                  Page {page} of {pagination.totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </PageContainer>
      </div>
    </div>
  );
}

export default AdminUsers;
