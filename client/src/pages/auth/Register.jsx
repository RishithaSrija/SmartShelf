import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/common/Logo';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import AuthShowcase from '../../components/auth/AuthShowcase';
import { User, Mail, Phone, Lock, AlertCircle, ShoppingBag, Store, ArrowRight, Eye, EyeOff } from 'lucide-react';

function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'CUSTOMER'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      const res = await register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        role
      });
      if (res.success && res.data?.user) {
        if (res.data.user.role === 'STORE_OWNER') {
          navigate('/store-owner');
        } else {
          navigate('/customer');
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please verify your details.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] flex flex-col justify-center font-sans selection:bg-[#16A34A] selection:text-white">
      {/* 2-Column SaaS Layout */}
      <div className="w-full min-h-screen grid grid-cols-1 lg:grid-cols-12">
        {/* Left Column: Animated Value Showcase */}
        <div className="hidden lg:block lg:col-span-5 xl:col-span-6 sticky top-0 h-screen">
          <AuthShowcase />
        </div>

        {/* Right Column: Register Form Container */}
        <div className="col-span-1 lg:col-span-7 xl:col-span-6 flex flex-col justify-center px-4 sm:px-8 lg:px-16 py-10 sm:py-12">
          <div className="w-full max-w-lg mx-auto">
            {/* Brand Header */}
            <div className="mb-6 text-center sm:text-left">
              <Link to="/" className="inline-block mb-3">
                <Logo showTagline size="lg" />
              </Link>
              <h1 className="text-2xl sm:text-3xl font-black text-[#1F2937] tracking-tight">
                Create your account
              </h1>
              <p className="mt-1 text-sm text-[#6B7280]">
                Join SmartShelf to discover local flash sales or manage store inventory.
              </p>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div className="mb-5 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs font-semibold animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Registration Form */}
            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Account Type Toggle */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1F2937] mb-2">
                  I want to join as:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'CUSTOMER' })}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                      formData.role === 'CUSTOMER'
                        ? 'bg-[#E8F5E9] border-[#15803D] text-[#0A4D2E] shadow-2xs ring-1 ring-[#15803D]'
                        : 'bg-white border-[#E5E7EB] text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4 text-[#15803D]" />
                    <span>Customer</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'STORE_OWNER' })}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                      formData.role === 'STORE_OWNER'
                        ? 'bg-[#E8F5E9] border-[#15803D] text-[#0A4D2E] shadow-2xs ring-1 ring-[#15803D]'
                        : 'bg-white border-[#E5E7EB] text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Store className="w-4 h-4 text-[#15803D]" />
                    <span>Store Owner</span>
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <Input
                label="Full Name"
                type="text"
                name="name"
                required
                icon={User}
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your name"
                autoComplete="name"
              />

              {/* Email Address */}
              <Input
                label="Email Address"
                type="email"
                name="email"
                required
                icon={Mail}
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                autoComplete="email"
              />

              {/* Phone Number Field with +91 Country Prefix */}
              <Input
                label="Phone Number (Optional)"
                type="tel"
                name="phone"
                prefix="+91"
                icon={Phone}
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter your phone number"
                autoComplete="tel"
              />

              {/* Passwords */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  icon={Lock}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="new-password"
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-600 focus:outline-none p-1 transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />

                <Input
                  label="Confirm Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  required
                  icon={Lock}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-slate-400 hover:text-slate-600 focus:outline-none p-1 transition-colors"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={submitting}
                className="w-full shadow-md bg-[#15803D] hover:bg-[#0D6832] text-white font-bold py-3 rounded-xl transition-all mt-2"
              >
                Create SmartShelf Account <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </form>

            {/* Switch to Login */}
            <div className="mt-6 pt-5 border-t border-[#E5E7EB] text-center">
              <p className="text-sm text-[#6B7280]">
                Already have an account?{' '}
                <Link to="/login" className="font-bold text-[#15803D] hover:text-[#0D6832] hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
