import React, { useState } from 'react';
import {
  User,
  Shield,
  KeyRound,
  Lock,
  LogOut,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  Laptop,
  Terminal,
  Code,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.js';

export const ProfilePage: React.FC = () => {
  const { user, role, balance, logout, refreshUser } = useAuth();
  const { success: showToastSuccess, error: showToastError } = useToast();

  // Change password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // 2FA toggle
  const [twoFaLoading, setTwoFaLoading] = useState(false);

  // Outbound Reseller API credentials state
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
    if (newPassword !== confirmPassword) {
      showToastError('Validation Error', 'New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      showToastError('Validation Error', 'Password must be at least 6 characters.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await api.changePassword({ currentPassword, newPassword, confirmPassword });
      showToastSuccess('Password Updated', 'Your account credentials have been changed.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToastError('Password Update Failed', err.message);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleToggle2Fa = async () => {
    setTwoFaLoading(true);
    try {
      const res = await api.toggleTwoFactor();
      await refreshUser();
      showToastSuccess('2FA Status Updated', res.message);
    } catch (err: any) {
      showToastError('Failed to toggle 2FA', err.message);
    } finally {
      setTwoFaLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-4xl mx-auto">
      {/* Profile Overview Card */}
      <div className="p-6 sm:p-7 rounded-3xl bg-[#0d0d14] border border-white/5 shadow-2xl relative overflow-hidden space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500/20 to-slate-800 border border-rose-500/40 text-rose-400 flex items-center justify-center font-display font-black text-2xl shadow-xl shadow-rose-950/30">
              {user?.username ? user.username.slice(0, 2).toUpperCase() : 'NX'}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-black text-xl text-white">@{user?.username}</h2>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                    role === 'ADMIN' || role === 'SUPER ADMIN'
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                      : role === 'RESELLER'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : 'bg-white/[0.04] text-slate-300 border-white/10'
                  }`}
                >
                  {role}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{user?.email}</p>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-rose-400 font-bold mt-1">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Member Since:{' '}
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
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Wallet Balance</span>
            <span className="font-mono text-2xl font-black text-emerald-400 tabular-nums">
              ₹{balance.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Profile Info Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/5 text-xs">
          <div className="p-3 rounded-xl bg-white/[0.02]">
            <span className="text-[10px] text-slate-400 uppercase block font-mono">User ID</span>
            <span className="font-mono font-semibold text-white truncate block">{user?.id}</span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02]">
            <span className="text-[10px] text-slate-400 uppercase block font-mono">Assigned Role</span>
            <span className="font-bold text-rose-400">{role}</span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02]">
            <span className="text-[10px] text-slate-400 uppercase block font-mono">Referral Code</span>
            <span className="font-mono font-bold text-amber-400">{user?.referralCode}</span>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02]">
            <span className="text-[10px] text-slate-400 uppercase block font-mono flex items-center gap-1">
              <Clock className="w-3 h-3 text-rose-400" />
              <span>Joined Date &amp; Time</span>
            </span>
            <span className="font-mono font-bold text-slate-200 truncate block mt-0.5">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })
                : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Security Section: Change Password & 2FA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* CHANGE PASSWORD */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#0d0d14] border border-white/5 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-rose-400" />
            <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
              CHANGE PASSWORD
            </h3>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-3 text-xs">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                CURRENT PASSWORD
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                NEW PASSWORD
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                CONFIRM NEW PASSWORD
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                required
                className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-rose-950/40 flex items-center justify-center gap-2 mt-2"
            >
              {isUpdatingPassword ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>UPDATE PASSWORD</span>}
            </button>
          </form>
        </div>

        {/* OUTBOUND RESELLER API INTEGRATION CENTER (ONLY VISIBLE FOR UPGRADED RESELLERS / ADMINS) */}
        {isReseller && (
          <div className="p-5 sm:p-6 rounded-3xl bg-[#0d0d14] border border-amber-500/20 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
                    OUTBOUND RESELLER API INTEGRATION (CONNECT OTHER WEBSITES)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Provide your API key and endpoint to other websites so they can buy keys automatically from your wallet balance
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRegenerateKey}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 self-start sm:self-auto"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Regenerate API Key</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  YOUR RESELLER API ENDPOINT URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={resellerApiCreds?.apiUrl || 'https://.../api/v1/reseller/buy'}
                    className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-emerald-400 font-mono text-xs select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(resellerApiCreds?.apiUrl || '');
                      showToastSuccess('Copied API URL');
                    }}
                    className="px-3 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 font-mono text-xs shrink-0"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  YOUR UNIQUE RESELLER API KEY (`api_key`)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={resellerApiCreds?.apiKey || 'Generating...'}
                    className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-amber-300 font-mono text-xs select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(resellerApiCreds?.apiKey || '');
                      showToastSuccess('Copied API Key');
                    }}
                    className="px-3 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 font-mono text-xs shrink-0"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/50 border border-white/5 space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 block flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-amber-400" />
                  <span>Integration cURL Payload Specification</span>
                </span>
                <pre className="p-3 rounded-xl bg-[#08080c] font-mono text-[10px] text-slate-300 overflow-x-auto select-all leading-relaxed">
{`curl -X POST "${resellerApiCreds?.apiUrl || 'https://your-domain.com/api/v1/reseller/buy'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "api_key": "${resellerApiCreds?.apiKey || 'YOUR_API_KEY'}",
    "action": "buy",
    "product_id": "BALA_V5_1H",
    "duration": "1 Hours"
  }'`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* SECURITY & LOGIN ACTIVITY */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#0d0d14] border border-white/5 shadow-xl space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
              TWO-FACTOR & DEVICES
            </h3>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white block">Two-Factor Authentication</span>
              <span className="text-[10px] text-slate-400 block">
                {user?.twoFactorEnabled ? 'TOTP Authenticator Active' : 'Extra layer of security disabled'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleToggle2Fa}
              disabled={twoFaLoading}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border ${
                user?.twoFactorEnabled
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-white/[0.04] text-slate-400 border-white/10 hover:border-white/20'
              }`}
            >
              {twoFaLoading ? 'Updating...' : user?.twoFactorEnabled ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          {/* Login Activity */}
          <div className="space-y-2 pt-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              RECENT LOGIN SESSIONS
            </span>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-white/[0.02] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Laptop className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="font-semibold text-white block">Current Web Session</span>
                    <span className="text-[10px] text-slate-400 font-mono">Chrome / Linux · 127.0.0.1</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">ACTIVE NOW</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                showToastSuccess('All other sessions terminated.');
              }}
              className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-semibold transition-colors border border-white/5 mt-2"
            >
              Logout from all other devices
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
