import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Logo from '../components/common/Logo';

function Unauthorized() {
  const { user } = useAuth();

  const getHomePath = () => {
    if (!user) return '/login';
    if (user.role === 'STORE_OWNER') return '/store-owner';
    if (user.role === 'ADMIN') return '/admin';
    return '/customer';
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] flex flex-col justify-center items-center p-6 text-[#1F2937] font-sans selection:bg-[#2E7D32] selection:text-white">
      <Card padding="p-8 sm:p-10" className="max-w-md w-full text-center">
        <Logo showTagline size="md" className="justify-center mb-6" />

        <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <h1 className="text-2xl font-extrabold text-[#1F2937] mb-2">Access Restricted</h1>
        <p className="text-xs text-[#6B7280] mb-8 leading-relaxed">
          Your account role (<span className="font-bold text-[#1F2937] uppercase">{user?.role || 'Guest'}</span>) does not have permission to view this resource.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link to={getHomePath()} className="flex-1">
            <Button variant="primary" size="md" icon={Home} className="w-full">
              My Dashboard
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary" size="md" icon={ArrowLeft} className="w-full">
              Switch Account
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default Unauthorized;
