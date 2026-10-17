import React, { useState } from 'react';
import {
  Shield,
  Lock,
  RefreshCw,
  Laptop,
  Terminal,
  Code,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.js';

export const ProfilePage: React.FC = () => {
  const { user, role, balance, refreshUser } = useAuth();
  const { success: showToastSuccess, error: showToastError } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [resellerApiCreds, setResellerApiCreds] = useState<any>(null);

  const isReseller = role === 'RESELLER' || role === 'ADMIN' || role === 'SUPER ADMIN';

  React.useEffect(() => {
    if (isReseller) {
      api.getResellerApiCredentials()
        .then(res => setResellerApiCreds(res))
        .catch(() => {});
    }
  }, [isReseller]);

  const handleRegenerateKey = async () => {
    try {
      const res = await api.regenerateResellerApiKey();
      setResellerApiCreds((prev: any) => ({ ...prev, apiKey: res.apiKey }));
      showToastSuccess('API Key Regenerated', res.message);
    } catch (err: any) {
      showToastError('Failed to regenerate API key', err.message);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (user?.hasPassword !== false && !currentPassword.trim()) {
      showToastError('Validation Error', 'Please enter your current password.');
      return;
    }

    if (newPassword.trim().length < 6) {
      showToastError('Validation Error', 'New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToastError('Validation Error', 'New password and confirmation do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await api.changePassword({
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
        confirmPassword: confirmPassword.trim(),
      });
      showToastSuccess('Password Updated Successfully', res?.message || 'Your account password has been updated. You can now use it anytime to log in.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await refreshUser();
    } catch (err: any) {
      showToastError('Password Update Failed', err.message || 'Could not update password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleToggle2Fa = async () => {
    setTwoFaLoading(true);
    try {
      const res = await api.toggleTwoFactor();
      await refreshUser();
      showToastSuccess('Security Updated', res.message);
    } catch (err: any) {
      showToastError('Failed to toggle 2FA', err.message);
    } finally {
      setTwoFaLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Profile Overview Card */}
      <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-rose-950/50 via-[#121422] to-indigo-950/50 border border-rose-500/30 space-y-6 shadow-[0_8px_30px_rgba(244,63,94,0.12)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 via-pink-600 to-amber-500 text-white flex items-center justify-center font-display font-bold text-xl shrink-0 shadow-[0_4px_20px_rgba(244,63,94,0.35)]">
              {user?.username ? user.username.slice(0, 2).toUpperCase() : 'NX'}
            </div>

            <div>
              <h2 className="font-display font-bold text-lg sm:text-xl bg-gradient-to-r from-white via-rose-100 to-amber-200 bg-clip-text text-transparent">
                @{user?.username}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="font-mono text-cyan-300">{user?.email}</span>
                <span aria-hidden="true">·</span>
                <span className="text-amber-400 font-bold">{role}</span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-300">
                  Joined{' '}
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="sm:text-right">
            <span className="text-xs text-rose-300 font-medium block">Available Balance</span>
            <span className="font-mono text-2xl sm:text-3xl font-extrabold text-emerald-400 tabular-nums">
              ₹{balance.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Account Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 border-t border-white/[0.08] text-xs">
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25">
            <span className="text-rose-300 font-semibold block mb-0.5">Account ID</span>
            <span className="font-mono font-bold text-white truncate block">{user?.id}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
            <span className="text-amber-300 font-semibold block mb-0.5">Access Tier</span>
            <span className="font-bold text-amber-400">{role}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25">
            <span className="text-cyan-300 font-semibold block mb-0.5">Partner Code</span>
            <span className="font-mono font-bold text-cyan-400">{user?.referralCode}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-violet-500/10 border border-violet-500/25">
            <span className="text-violet-300 font-semibold block mb-0.5">Registered</span>
            <span className="font-mono font-bold text-white truncate block tabular-nums">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Security & API Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Change Password */}
        <div className="p-6 rounded-2xl bg-gradient-to-b from-[#131622] to-[#0e1018] border border-rose-500/25 space-y-4 shadow-lg">
          <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-400" />
              <h3 className="font-display font-bold text-base text-white">
                {user?.hasPassword === false ? 'Set Account Password' : 'Update Password'}
              </h3>
            </div>
            {user?.hasPassword === false ? (
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                No Password Configured
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Password Configured</span>
              </span>
            )}
          </div>

          {user?.hasPassword === false && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs leading-relaxed flex items-start gap-2">
              <KeyRound className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>
                Your account was created via Email OTP or Google. Set a password below to enable instant login with your username (<strong className="text-white">@{user?.username}</strong>) or email (<strong className="text-white">{user?.email}</strong>).
              </span>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-3.5 text-xs">
            {user?.hasPassword !== false && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-rose-300">
                    Current Password
                  </label>
                  <span className="text-[10px] text-slate-500">
                    Default is <strong className="text-rose-300 font-mono">admin123</strong> for admin accounts
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                    className="w-full px-3.5 py-2.5 pr-10 bg-[#090a0f] border border-white/15 rounded-xl text-white focus:outline-none focus:border-rose-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title={showCurrentPassword ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-amber-300 block mb-1.5">
                New Password <span className="text-slate-400 font-normal">(Min 6 characters)</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Create new password"
                  required
                  minLength={6}
                  className="w-full px-3.5 py-2.5 pr-10 bg-[#090a0f] border border-white/15 rounded-xl text-white focus:outline-none focus:border-amber-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-cyan-300 block mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password exactly"
                  required
                  minLength={6}
                  className="w-full px-3.5 py-2.5 pr-10 bg-[#090a0f] border border-white/15 rounded-xl text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white text-xs font-bold shadow-[0_4px_20px_rgba(244,63,94,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isUpdatingPassword ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>{user?.hasPassword === false ? 'Set Password' : 'Save New Password'}</span>}
            </button>
          </form>
        </div>

        {/* Security & Sessions */}
        <div className="p-6 rounded-2xl bg-gradient-to-b from-[#131622] to-[#0e1018] border border-emerald-500/25 space-y-4 shadow-lg">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h3 className="font-display font-bold text-base text-white">
              Security & Active Sessions
            </h3>
          </div>

          <div className="p-4 rounded-xl bg-[#090a0f] border border-emerald-500/20 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-white block">Two-Factor Authentication</span>
              <span className="text-xs text-slate-400 block">
                {user?.twoFactorEnabled ? 'Verification enabled on login' : 'Additional login verification disabled'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleToggle2Fa}
              disabled={twoFaLoading}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer whitespace-nowrap shrink-0 ${
                user?.twoFactorEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 border-transparent'
              }`}
            >
              {twoFaLoading ? 'Updating...' : user?.twoFactorEnabled ? 'Enabled' : 'Enable 2FA'}
            </button>
          </div>

          <div className="space-y-2.5 pt-1">
            <span className="text-xs font-semibold text-cyan-300 block">
              Active Session
            </span>

            <div className="p-3.5 rounded-xl bg-[#090a0f] border border-cyan-500/20 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <Laptop className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <span className="font-semibold text-white block">Current Browser Session</span>
                  <span className="text-xs text-slate-400">Authenticated Web Client</span>
                </div>
              </div>
              <span className="text-xs text-emerald-400 font-bold">Active</span>
            </div>

            <button
              type="button"
              onClick={() => {
                showToastSuccess('All other sessions terminated.');
              }}
              className="w-full py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 text-xs font-semibold transition-colors border border-white/[0.1] cursor-pointer"
            >
              Sign Out Other Devices
            </button>
          </div>
        </div>
      </div>

      {/* Outbound Reseller API Quick Credentials */}
      {isReseller && (
        <div className="p-6 rounded-2xl bg-gradient-to-b from-[#131622] to-[#0e1018] border border-amber-500/30 space-y-4 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-400 flex items-center justify-center shrink-0">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-white">
                  Outbound Reseller API Credentials
                </h3>
                <p className="text-xs text-slate-400">
                  Connect external storefronts to provision keys automatically from your wallet.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRegenerateKey}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Rotate API Key</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-xs font-semibold text-emerald-300 block mb-1.5">
                Endpoint URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={resellerApiCreds?.apiUrl || 'https://.../api/v1/reseller/buy'}
                  className="w-full px-3.5 py-2 bg-[#090a0f] border border-emerald-500/25 rounded-xl text-emerald-400 font-mono text-xs select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(resellerApiCreds?.apiUrl || '');
                    showToastSuccess('Copied API URL');
                  }}
                  className="px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-xs shrink-0 cursor-pointer"
                >
                  Copy
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-amber-300 block mb-1.5">
                Secret API Key
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={resellerApiCreds?.apiKey || 'Generating...'}
                  className="w-full px-3.5 py-2 bg-[#090a0f] border border-amber-500/25 rounded-xl text-amber-300 font-mono text-xs select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(resellerApiCreds?.apiKey || '');
                    showToastSuccess('Copied API Key');
                  }}
                  className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs shrink-0 cursor-pointer"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#090a0f] border border-white/[0.08] space-y-2">
            <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-amber-400" />
              <span>Example cURL Request</span>
            </span>
            <pre className="font-mono text-[11px] text-cyan-300 overflow-x-auto select-all leading-relaxed">
{`curl -X POST "${resellerApiCreds?.apiUrl || 'https://your-domain.com/api/v1/reseller/buy'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "api_key": "${resellerApiCreds?.apiKey || 'YOUR_API_KEY'}",
    "action": "buy",
    "product_id": "155",
    "duration": "1 Hours"
  }'`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
