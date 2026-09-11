import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/common/Logo';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      const res = await login({ email, password });
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
      const msg = err.response?.data?.message || 'Invalid email or password.';
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
          Welcome back
        </h2>
        <p className="mt-1.5 text-sm text-[#6B7280]">
          Sign in to continue to <span className="font-bold text-[#2E7D32]">SmartShelf</span>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card padding="p-8">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <Input
              label="Email Address"
              type="email"
              required
              icon={Mail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />

            <Input
              label="Password"
              type="password"
              required
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={submitting}
              className="w-full"
            >
              Sign In <ArrowRight className="w-4 h-4" />
            </Button>
          </form>

          <div className="mt-8 text-center border-t border-[#E5E7EB] pt-6">
            <p className="text-xs text-[#6B7280]">
              Don't have an account?{' '}
              <Link to="/register" className="font-bold text-[#2E7D32] hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Login;
