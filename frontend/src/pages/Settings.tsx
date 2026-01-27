import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import axios from 'axios';
import {
  UserCircleIcon,
  CameraIcon,
  KeyIcon,
  ShieldCheckIcon,
  BellIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';

interface ProfileForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department: string;
}

interface PasswordForm {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

interface NotificationPreferences {
  new_application: boolean;
  workflow_complete: boolean;
  review_required: boolean;
  bias_flag: boolean;
  daily_summary: boolean;
}

export default function Settings() {
  const { user, logout, token, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');

  const [notifications, setNotifications] = useState<NotificationPreferences>({
    new_application: true,
    workflow_complete: true,
    review_required: true,
    bias_flag: true,
    daily_summary: false,
  });

  const profileForm = useForm<ProfileForm>({
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      department: user?.department || '',
    },
  });

  const passwordForm = useForm<PasswordForm>();

  // Load notification preferences from user
  useEffect(() => {
    if (user?.notification_preferences) {
      setNotifications({
        ...notifications,
        ...user.notification_preferences,
      });
    }
  }, [user]);

  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserCircleIcon },
    { id: 'security', name: 'Security', icon: KeyIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'mfa', name: 'Two-Factor Auth', icon: ShieldCheckIcon },
  ];

  // Fetch current user data
  const { refetch: refetchUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const response = await axios.get('/api/v1/users/me/', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(response.data);
      return response.data;
    },
    enabled: !!token,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const response = await axios.patch('/api/v1/users/update_profile/', data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: (data) => {
      setUser(data);
      toast.success('Profile updated successfully');
    },
    onError: () => {
      toast.error('Failed to update profile');
    },
  });

  const uploadPictureMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('profile_picture', file);
      const response = await axios.post('/api/v1/users/upload_profile_picture/', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: (data) => {
      setUser(data);
      toast.success('Profile picture updated');
    },
    onError: () => {
      toast.error('Failed to upload profile picture');
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordForm) => {
      const response = await axios.post('/api/v1/users/change_password/', {
        current_password: data.current_password,
        new_password: data.new_password,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Password changed successfully');
      passwordForm.reset();
    },
    onError: () => {
      toast.error('Failed to change password. Check your current password.');
    },
  });

  const setupMfaMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post('/api/v1/users/setup_mfa/', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: (data) => {
      setMfaQrCode(data.qr_code);
      setMfaSecret(data.secret);
    },
    onError: () => {
      toast.error('Failed to setup MFA');
    },
  });

  const verifyMfaMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await axios.post('/api/v1/users/verify_mfa/', { code }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Two-factor authentication enabled');
      setMfaQrCode(null);
      setMfaSecret(null);
      setVerificationCode('');
      refetchUser();
    },
    onError: () => {
      toast.error('Invalid verification code');
    },
  });

  const disableMfaMutation = useMutation({
    mutationFn: async (password: string) => {
      const response = await axios.post('/api/v1/users/disable_mfa/', { password }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Two-factor authentication disabled');
      refetchUser();
    },
    onError: () => {
      toast.error('Invalid password');
    },
  });

  const saveNotificationsMutation = useMutation({
    mutationFn: async (preferences: NotificationPreferences) => {
      const response = await axios.post('/api/v1/users/save_notification_preferences/',
        { preferences },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success('Notification preferences saved');
      refetchUser();
    },
    onError: () => {
      toast.error('Failed to save preferences');
    },
  });

  const handleProfileSubmit = (data: ProfileForm) => {
    updateProfileMutation.mutate(data);
  };

  const handlePasswordSubmit = (data: PasswordForm) => {
    if (data.new_password !== data.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    if (data.new_password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    changePasswordMutation.mutate(data);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      uploadPictureMutation.mutate(file);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const handleDisableMfa = () => {
    const password = prompt('Enter your password to disable MFA:');
    if (password) {
      disableMfaMutation.mutate(password);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage your account settings and preferences
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
          Sign Out
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2',
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <tab.icon className="h-5 w-5" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Profile Information
              </h2>
              <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="label">First Name</label>
                    <input
                      {...profileForm.register('first_name', { required: true })}
                      type="text"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Last Name</label>
                    <input
                      {...profileForm.register('last_name', { required: true })}
                      type="text"
                      className="input"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    {...profileForm.register('email', { required: true })}
                    type="email"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    {...profileForm.register('phone')}
                    type="tel"
                    className="input"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <div>
                  <label className="label">Role</label>
                  <input
                    type="text"
                    defaultValue={user?.role?.replace('_', ' ')}
                    className="input bg-gray-50 capitalize"
                    disabled
                  />
                </div>
                <div>
                  <label className="label">Department</label>
                  <input
                    {...profileForm.register('department')}
                    type="text"
                    className="input"
                  />
                </div>
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="btn-primary"
                >
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          </div>

          <div className="space-y-6">
            {/* Profile Picture */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Profile Picture
              </h2>
              <div className="flex flex-col items-center">
                <div className="relative">
                  {user?.profile_picture_url ? (
                    <img
                      src={user.profile_picture_url}
                      alt="Profile"
                      className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                      {user?.first_name?.[0]}{user?.last_name?.[0]}
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadPictureMutation.isPending}
                    className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
                  >
                    <CameraIcon className="h-5 w-5 text-gray-600" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-4 text-center">
                  {uploadPictureMutation.isPending ? 'Uploading...' : 'Click the camera icon to upload a new photo.'}
                  <br />
                  Max size: 5MB
                </p>
              </div>
            </div>

            {/* Account Status */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Account Status
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Username</span>
                  <span className="text-gray-900">
                    {user?.username}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Role</span>
                  <span className="text-gray-900 capitalize">
                    {user?.role?.replace('_', ' ') || 'User'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">2FA</span>
                  <span className={user?.mfa_enabled ? 'text-green-600' : 'text-gray-500'}>
                    {user?.mfa_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Change Password
            </h2>
            <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-6">
              <div>
                <label className="label">Current Password</label>
                <input
                  {...passwordForm.register('current_password', { required: true })}
                  type="password"
                  className="input"
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <label className="label">New Password</label>
                <input
                  {...passwordForm.register('new_password', { required: true, minLength: 8 })}
                  type="password"
                  className="input"
                  placeholder="Enter new password"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
              </div>
              <div>
                <label className="label">Confirm New Password</label>
                <input
                  {...passwordForm.register('confirm_password', { required: true })}
                  type="password"
                  className="input"
                  placeholder="Confirm new password"
                />
              </div>
              <button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="btn-primary"
              >
                {changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Security Sessions
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Current Session</p>
                    <p className="text-sm text-gray-500">Active now</p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                    Active
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
              >
                Sign Out of All Sessions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="card max-w-2xl">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Notification Preferences
          </h2>
          <div className="space-y-4">
            {[
              { id: 'new_application', label: 'New application assigned', description: 'Get notified when a new application is assigned to you' },
              { id: 'workflow_complete', label: 'Workflow completed', description: 'Get notified when an AI workflow completes' },
              { id: 'review_required', label: 'Human review required', description: 'Get notified when manual review is needed' },
              { id: 'bias_flag', label: 'Bias flag detected', description: 'Get notified when potential bias is detected' },
              { id: 'daily_summary', label: 'Daily summary email', description: 'Receive a daily summary of your activities' },
            ].map((item) => (
              <div key={item.id} className="flex items-center justify-between py-4 border-b last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications[item.id as keyof NotificationPreferences]}
                    onChange={(e) => setNotifications({
                      ...notifications,
                      [item.id]: e.target.checked,
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            ))}
          </div>
          <button
            onClick={() => saveNotificationsMutation.mutate(notifications)}
            disabled={saveNotificationsMutation.isPending}
            className="btn-primary mt-6"
          >
            {saveNotificationsMutation.isPending ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      )}

      {/* MFA Tab */}
      {activeTab === 'mfa' && (
        <div className="card max-w-2xl">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Two-Factor Authentication
          </h2>

          {!user?.mfa_enabled && !mfaQrCode ? (
            <div className="text-center py-8">
              <ShieldCheckIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Secure Your Account
              </h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Add an extra layer of security to your account by enabling two-factor authentication.
              </p>
              <button
                onClick={() => setupMfaMutation.mutate()}
                disabled={setupMfaMutation.isPending}
                className="btn-primary"
              >
                {setupMfaMutation.isPending ? 'Setting up...' : 'Enable Two-Factor Auth'}
              </button>
            </div>
          ) : mfaQrCode ? (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Scan this QR code with your authenticator app
                </h3>
                <div className="inline-block p-4 bg-white border rounded-lg shadow-sm">
                  <img src={mfaQrCode} alt="MFA QR Code" className="w-48 h-48" />
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Or enter this code manually:
                </p>
                <code className="block p-2 bg-white border rounded text-center font-mono text-lg tracking-wider">
                  {mfaSecret}
                </code>
              </div>

              <div>
                <label className="label">Enter verification code from your app</label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                  className="input text-center text-2xl tracking-widest"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setMfaQrCode(null);
                    setMfaSecret(null);
                    setVerificationCode('');
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => verifyMfaMutation.mutate(verificationCode)}
                  disabled={verificationCode.length !== 6 || verifyMfaMutation.isPending}
                  className="btn-primary flex-1"
                >
                  {verifyMfaMutation.isPending ? 'Verifying...' : 'Verify & Enable'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
                <div className="flex items-center gap-3">
                  <ShieldCheckIcon className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Two-Factor Authentication is Enabled</p>
                    <p className="text-sm text-green-600">Your account is protected with 2FA</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900 mb-2">Authenticator App</p>
                  <p className="text-sm text-gray-500">
                    Use an authenticator app like Google Authenticator or Authy to generate verification codes.
                  </p>
                </div>

                <button
                  onClick={handleDisableMfa}
                  disabled={disableMfaMutation.isPending}
                  className="text-red-600 hover:text-red-700 font-medium"
                >
                  {disableMfaMutation.isPending ? 'Disabling...' : 'Disable Two-Factor Auth'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
