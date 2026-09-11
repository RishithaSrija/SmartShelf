import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/common/Logo';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import AuthShowcase from '../../components/auth/AuthShowcase';
import { Mail, Lock, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await login({ email: email.trim(), password });
      if (res.success && res.data?.user) {
        const role = res.data.user.role;
        if (role === 'STORE_OWNER') {
          navigate('/store-owner');
        } else if (role === 'ADMIN') {
          navigate('/admin');
        } else {
          navigate('/customer');
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password. Please check your credentials.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF8] flex flex-col justify-center font-sans selection:bg-[#16A34A] selection:text-white">
      {/* 2-Column Responsive Layout */}
      <div className="w-full min-h-screen grid grid-cols-1 lg:grid-cols-12">
        {/* Left Column: Rotating Animated Showcase (Hidden on small mobile, visible on lg+) */}
        <div className="hidden lg:block lg:col-span-5 xl:col-span-6 sticky top-0 h-screen">
          <AuthShowcase />
        </div>

        {/* Right Column: Form Container */}
        <div className="col-span-1 lg:col-span-7 xl:col-span-6 flex flex-col justify-center px-4 sm:px-8 lg:px-16 py-12">
          <div className="w-full max-w-md mx-auto">
            {/* Brand Header */}
            <div className="mb-8 text-center sm:text-left">
              <Link to="/" className="inline-block mb-4">
                <Logo showTagline size="lg" />
              </Link>
              <h1 className="text-2xl sm:text-3xl font-black text-[#1F2937] tracking-tight">
                Welcome back
              </h1>
              <p className="mt-1 text-sm text-[#6B7280]">
                Sign in to your account to explore deals, manage inventory, and save food.
              </p>
            </div>

            {/* Error Message Alert */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs font-semibold animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form className="space-y-5" onSubmit={handleSubmit}>
              <Input
                label="Email Address"
                type="email"
                required
                icon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
              />

              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                required
                icon={Lock}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
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

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={submitting}
                className="w-full shadow-md bg-[#15803D] hover:bg-[#0D6832] text-white font-bold py-3 rounded-xl transition-all"
              >
                Sign In to SmartShelf <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </form>

            {/* Switch to Register */}
            <div className="mt-8 pt-6 border-t border-[#E5E7EB] text-center">
              <p className="text-sm text-[#6B7280]">
                New to SmartShelf?{' '}
                <Link to="/register" className="font-bold text-[#15803D] hover:text-[#0D6832] hover:underline">
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
