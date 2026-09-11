import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/common/Logo';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { User, Mail, Phone, Lock, AlertCircle, ShoppingBag, Store, ArrowRight } from 'lucide-react';

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'CUSTOMER'
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const { name, email, phone, password, confirmPassword, role } = formData;

    if (!name.trim()) {
      setError('Full name is required.');
      return;
    }

    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await register({ name, email, phone, password, role });
      if (res.success && res.data?.user) {
        if (res.data.user.role === 'STORE_OWNER') {
          navigate('/store-owner');
        } else {
          navigate('/customer');
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans selection:bg-[#2E7D32] selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Logo showTagline size="lg" className="justify-center mb-6" />
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1F2937] tracking-tight">
          Create your SmartShelf account
        </h2>
        <p className="mt-1.5 text-sm text-[#6B7280]">
          Join the expiry-aware dynamic marketplace
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <Card padding="p-8">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Account Type Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1F2937] mb-2">
                Account Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'CUSTOMER' })}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                    formData.role === 'CUSTOMER'
                      ? 'bg-[#E8F5E9] border-[#2E7D32] text-[#2E7D32] shadow-2xs'
                      : 'bg-white border-[#E5E7EB] text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 text-[#2E7D32]" />
                  <span>Customer</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'STORE_OWNER' })}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                    formData.role === 'STORE_OWNER'
                      ? 'bg-[#E8F5E9] border-[#2E7D32] text-[#2E7D32] shadow-2xs'
                      : 'bg-white border-[#E5E7EB] text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Store className="w-4 h-4 text-[#2E7D32]" />
                  <span>Store Owner</span>
                </button>
              </div>
            </div>

            <Input
              label="Full Name"
              type="text"
              name="name"
              required
              icon={User}
              value={formData.name}
              onChange={handleChange}
              placeholder="Rishitha Srija"
            />

            <Input
              label="Email Address"
              type="email"
              name="email"
              required
              icon={Mail}
              value={formData.email}
              onChange={handleChange}
              placeholder="name@example.com"
            />

            <Input
              label="Phone Number"
              type="tel"
              name="phone"
              icon={Phone}
              value={formData.phone}
              onChange={handleChange}
              placeholder="9876543210 (optional)"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Password"
                type="password"
                name="password"
                required
                icon={Lock}
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
              />

              <Input
                label="Confirm Password"
                type="password"
                name="confirmPassword"
                required
                icon={Lock}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={submitting}
              className="w-full mt-2"
            >
              Create Account <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <div className="mt-8 text-center border-t border-[#E5E7EB] pt-6">
            <p className="text-xs text-[#6B7280]">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-[#2E7D32] hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Register;
