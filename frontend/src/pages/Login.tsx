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

interface RegisterForm {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  first_name: string;
  last_name: string;
}

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const loginForm = useForm<LoginForm>();
  const registerForm = useForm<RegisterForm>();

  const onLogin = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const tokenResponse = await authAPI.login(data.username, data.password);
      const token = tokenResponse.access;
      const refreshToken = tokenResponse.refresh;

      // Temporarily set token to get user data
      useAuthStore.setState({ token, refreshToken });

      const user = await authAPI.getMe();
      login(user, token, refreshToken);

      toast.success('Welcome back!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const onRegister = async (data: RegisterForm) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.register({
        username: data.username,
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
      });

      toast.success('Registration successful! Please sign in.');
      setIsRegister(false);
      registerForm.reset();
    } catch (error: any) {
      const errorMsg = error.response?.data?.username?.[0] ||
                       error.response?.data?.email?.[0] ||
                       error.response?.data?.detail ||
                       'Registration failed';
      toast.error(errorMsg);
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

      {/* Right side - Login/Register form */}
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

          {!isRegister ? (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
                <p className="text-gray-600 mt-2">Sign in to your account to continue</p>
              </div>

              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-6">
                <div>
                  <label htmlFor="username" className="label">
                    Username
                  </label>
                  <input
                    {...loginForm.register('username', { required: 'Username is required' })}
                    type="text"
                    className="input"
                    placeholder="Enter your username"
                  />
                  {loginForm.formState.errors.username && (
                    <p className="mt-1 text-sm text-red-600">{loginForm.formState.errors.username.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="label">
                    Password
                  </label>
                  <input
                    {...loginForm.register('password', { required: 'Password is required' })}
                    type="password"
                    className="input"
                    placeholder="Enter your password"
                  />
                  {loginForm.formState.errors.password && (
                    <p className="mt-1 text-sm text-red-600">{loginForm.formState.errors.password.message}</p>
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

              <p className="mt-8 text-center text-sm text-gray-600">
                Don't have an account?{' '}
                <button
                  onClick={() => setIsRegister(true)}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Create account
                </button>
              </p>
            </>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Create account</h2>
                <p className="text-gray-600 mt-2">Register to get started with MortgageAI</p>
              </div>

              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">First Name</label>
                    <input
                      {...registerForm.register('first_name', { required: 'First name is required' })}
                      type="text"
                      className="input"
                      placeholder="John"
                    />
                    {registerForm.formState.errors.first_name && (
                      <p className="mt-1 text-sm text-red-600">{registerForm.formState.errors.first_name.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="label">Last Name</label>
                    <input
                      {...registerForm.register('last_name', { required: 'Last name is required' })}
                      type="text"
                      className="input"
                      placeholder="Doe"
                    />
                    {registerForm.formState.errors.last_name && (
                      <p className="mt-1 text-sm text-red-600">{registerForm.formState.errors.last_name.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="label">Username</label>
                  <input
                    {...registerForm.register('username', {
                      required: 'Username is required',
                      minLength: { value: 3, message: 'Username must be at least 3 characters' }
                    })}
                    type="text"
                    className="input"
                    placeholder="johndoe"
                  />
                  {registerForm.formState.errors.username && (
                    <p className="mt-1 text-sm text-red-600">{registerForm.formState.errors.username.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Email</label>
                  <input
                    {...registerForm.register('email', {
                      required: 'Email is required',
                      pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' }
                    })}
                    type="email"
                    className="input"
                    placeholder="john@example.com"
                  />
                  {registerForm.formState.errors.email && (
                    <p className="mt-1 text-sm text-red-600">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Password</label>
                  <input
                    {...registerForm.register('password', {
                      required: 'Password is required',
                      minLength: { value: 8, message: 'Password must be at least 8 characters' }
                    })}
                    type="password"
                    className="input"
                    placeholder="Create a password"
                  />
                  {registerForm.formState.errors.password && (
                    <p className="mt-1 text-sm text-red-600">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div>
                  <label className="label">Confirm Password</label>
                  <input
                    {...registerForm.register('confirmPassword', { required: 'Please confirm your password' })}
                    type="password"
                    className="input"
                    placeholder="Confirm your password"
                  />
                  {registerForm.formState.errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">{registerForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary py-3 disabled:opacity-50 mt-6"
                >
                  {isLoading ? 'Creating account...' : 'Create account'}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  onClick={() => setIsRegister(false)}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Sign in
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
