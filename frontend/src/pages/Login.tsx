import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../services/api';

interface LoginForm {
  username: string;
  password: string;
}

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const tokenResponse = await authAPI.login(data.username, data.password);
      const token = tokenResponse.access;

      // Temporarily set token to get user data
      useAuthStore.setState({ token });

      const user = await authAPI.getMe();
      login(user, token);

      toast.success('Welcome back!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-accent-700 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
              <span className="text-white font-bold text-lg">MU</span>
            </div>
            <span className="text-2xl font-bold text-white">MortgageAI</span>
          </div>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            AI-Powered Mortgage Underwriting Platform
          </h1>
          <p className="text-xl text-white/80">
            Multi-agent autonomous system for intelligent, compliant, and efficient loan decisions.
          </p>
          <div className="flex gap-4 pt-4">
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-3xl font-bold text-white">6</p>
              <p className="text-sm text-white/70">AI Agents</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-3xl font-bold text-white">MCP</p>
              <p className="text-sm text-white/70">Protocol</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-3xl font-bold text-white">RAG</p>
              <p className="text-sm text-white/70">Enabled</p>
            </div>
          </div>
        </div>

        <div className="text-white/60 text-sm">
          Secure, Compliant, Intelligent
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-primary-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">MU</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">MortgageAI</span>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-gray-600 mt-2">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="username" className="label">
                Username
              </label>
              <input
                {...register('username', { required: 'Username is required' })}
                type="text"
                className="input"
                placeholder="Enter your username"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                {...register('password', { required: 'Password is required' })}
                type="password"
                className="input"
                placeholder="Enter your password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded text-primary-600" />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <a href="#" className="text-sm text-primary-600 hover:text-primary-700">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary py-3 disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            Demo credentials: admin / admin123
          </p>
        </div>
      </div>
    </div>
  );
}
