import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';

export default function Settings() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', name: 'Profile' },
    { id: 'notifications', name: 'Notifications' },
    { id: 'security', name: 'Security' },
    { id: 'api', name: 'API Keys' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
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
              <form className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="label">First Name</label>
                    <input
                      type="text"
                      defaultValue={user?.first_name}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Last Name</label>
                    <input
                      type="text"
                      defaultValue={user?.last_name}
                      className="input"
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    defaultValue={user?.email}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Role</label>
                  <input
                    type="text"
                    defaultValue={user?.role?.replace('_', ' ')}
                    className="input bg-gray-50"
                    disabled
                  />
                </div>
                <div>
                  <label className="label">Department</label>
                  <input
                    type="text"
                    defaultValue={user?.department}
                    className="input"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => toast.success('Profile updated')}
                  className="btn-primary"
                >
                  Save Changes
                </button>
              </form>
            </div>
          </div>

          <div>
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
                  <span className="text-gray-600">Role</span>
                  <span className="text-gray-900 capitalize">
                    {user?.role?.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Available</span>
                  <span className={user?.is_available ? 'text-green-600' : 'text-gray-500'}>
                    {user?.is_available ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
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
              { id: 'new_application', label: 'New application assigned' },
              { id: 'workflow_complete', label: 'Workflow completed' },
              { id: 'review_required', label: 'Human review required' },
              { id: 'bias_flag', label: 'Bias flag detected' },
              { id: 'daily_summary', label: 'Daily summary email' },
            ].map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3 border-b">
                <span className="text-gray-700">{item.label}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="card max-w-2xl">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Security Settings
          </h2>
          <form className="space-y-6">
            <div>
              <label className="label">Current Password</label>
              <input type="password" className="input" />
            </div>
            <div>
              <label className="label">New Password</label>
              <input type="password" className="input" />
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input type="password" className="input" />
            </div>
            <button
              type="button"
              onClick={() => toast.success('Password updated')}
              className="btn-primary"
            >
              Update Password
            </button>
          </form>
        </div>
      )}

      {/* API Keys Tab */}
      {activeTab === 'api' && (
        <div className="card max-w-2xl">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            API Configuration
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">OpenAI API</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                  Connected
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Used for LLM inference in underwriting agents
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">ChromaDB</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                  Connected
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Vector database for RAG policy retrieval
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">MCP Server</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                  Running
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Model Context Protocol server for tool execution
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
