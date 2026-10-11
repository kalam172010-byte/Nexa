import React, { useState } from 'react';
import {
  ShieldCheck,
  User,
  Lock,
  Mail,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
  Play,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { useSite } from '../context/SiteContext.js';

interface AuthPageProps {
  onSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess }) => {
  const { login, loginWithGoogle, loginWithEmail, registerWithEmail } = useAuth();
  const { success: showToastSuccess, error: showToastError } = useToast();
  const { siteConfig } = useSite();

  // Form states
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // How to use site modal
  const [showGuideModal, setShowGuideModal] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      showToastSuccess('Google Sign-In Successful', `Welcome to ${siteConfig.siteTitle || 'Nexa Panel'}.`);
      onSuccess();
    } catch (err: any) {
      showToastError('Google Sign-In Failed', err.message || 'Could not authenticate with Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleQuickLogin = async (usr: string, pass: string, roleName: string) => {
    setIsSubmitting(true);
    try {
      await login(usr, pass);
      showToastSuccess(`Logged in as ${roleName}`, `Welcome back!`);
      onSuccess();
    } catch (err: any) {
      showToastError('Login Error', err.message || 'Quick login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        const emailOrUser = email || username;
        if (emailOrUser.includes('@')) {
          await loginWithEmail(emailOrUser, password);
        } else {
          await login(emailOrUser, password);
        }
        showToastSuccess('Welcome Back!', `Logged in to ${siteConfig.siteTitle || 'Nexa Panel'}.`);
      } else {
        await registerWithEmail(username, email, password, referralCode || undefined);
        showToastSuccess('Account Created!', `Welcome to ${siteConfig.siteTitle || 'Nexa Panel'}.`);
      }
      onSuccess();
    } catch (err: any) {
      showToastError('Authentication Error', err.message || 'Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden bg-[#070709] text-slate-100 font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-rose-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-sm sm:max-w-md space-y-5 relative z-10">
        {/* Main Auth Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#0d0d14]/90 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-rose-950/20 space-y-5">
          {/* Top Brand Emblem */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500/20 to-red-600/30 border border-rose-500/40 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
              <ShieldCheck className="w-7 h-7 text-rose-400" />
            </div>
            <h1 className="font-display font-black text-xl sm:text-2xl tracking-wider text-white uppercase">
              {siteConfig.siteTitle || 'NEXA PANEL'}
            </h1>
            <p className="text-[11px] text-slate-400 font-mono tracking-wider uppercase">
              {mode === 'login' ? 'SIGN IN TO YOUR ACCOUNT' : 'CREATE GAMING ACCOUNT'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-white/[0.03] border border-white/5 text-xs font-bold font-display">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`py-2 rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              LOGIN
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`py-2 rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              REGISTER
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {mode === 'register' ? (
              <>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    USERNAME
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-rose-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="e.g. pro_gamer99"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/10 focus:border-rose-500 rounded-xl text-white focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    EMAIL ADDRESS
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-rose-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="gamer@example.com"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/10 focus:border-rose-500 rounded-xl text-white focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    PASSWORD
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-rose-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      className="w-full pl-10 pr-10 py-2.5 bg-white/[0.04] border border-white/10 focus:border-rose-500 rounded-xl text-white focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    REFERRAL CODE (OPTIONAL)
                  </label>
                  <input
                    type="text"
                    value={referralCode}
                    onChange={e => setReferralCode(e.target.value)}
                    placeholder="e.g. APEXVIP77"
                    className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 focus:border-rose-500 rounded-xl text-white font-mono focus:outline-none uppercase transition-all"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    USERNAME OR EMAIL
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-rose-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={email || username}
                      onChange={e => {
                        const val = e.target.value;
                        if (val.includes('@')) {
                          setEmail(val);
                        } else {
                          setUsername(val);
                        }
                      }}
                      placeholder="Username or email"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/10 focus:border-rose-500 rounded-xl text-white font-medium focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    PASSWORD
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-rose-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                      className="w-full pl-10 pr-10 py-2.5 bg-white/[0.04] border border-white/10 focus:border-rose-500 rounded-xl text-white font-medium focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Action Button */}
            <button
              type="submit"
              disabled={isSubmitting || isGoogleLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-[0.98] text-white font-display font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-rose-950/40 flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <span>{mode === 'login' ? 'SIGN IN NOW' : 'CREATE ACCOUNT'}</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-white/10" />
            <span className="flex-shrink mx-3 text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500">
              OR CONTINUE WITH
            </span>
            <div className="flex-grow border-t border-white/10" />
          </div>

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isSubmitting}
            className="w-full py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-[0.98] border border-white/10 hover:border-rose-500/40 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 shadow-md group cursor-pointer"
          >
            {isGoogleLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-rose-400" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            )}
            <span>SIGN IN WITH GOOGLE</span>
          </button>

          {/* Quick Demo Sign-Ins */}
          <div className="pt-2">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider text-center mb-2">
              ⚡ Instant 1-Click Demo Login
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-[11px] font-bold font-mono">
              <button
                type="button"
                onClick={() => handleQuickLogin('user@example.com', 'user123', 'User')}
                className="py-2 px-1 rounded-xl bg-white/[0.03] hover:bg-rose-500/20 hover:border-rose-500/40 border border-white/10 text-slate-300 hover:text-white transition-all text-center"
              >
                👤 User
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('reseller@example.com', 'reseller123', 'Reseller')}
                className="py-2 px-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 hover:border-amber-500/40 border border-amber-500/30 text-amber-300 hover:text-amber-200 transition-all text-center"
              >
                👑 Reseller
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@example.com', 'admin123', 'Admin')}
                className="py-2 px-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 hover:border-rose-500/50 border border-rose-500/40 text-rose-300 hover:text-white transition-all text-center"
              >
                🛡️ Admin
              </button>
            </div>
          </div>

          {/* Guide Link */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => setShowGuideModal(true)}
              className="text-xs text-rose-400 hover:text-rose-300 font-bold inline-flex items-center gap-1 transition-colors"
            >
              <span>How to use this site?</span>
              <Play className="w-3 h-3 fill-rose-400" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] font-mono text-slate-400 font-semibold tracking-wider">
          © {new Date().getFullYear()} {siteConfig.siteTitle ? siteConfig.siteTitle.toUpperCase() : 'NEXA PANEL'}. ALL RIGHTS RESERVED.
        </div>
      </div>

      {/* Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0d0d14] border border-white/10 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="text-rose-400 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>USER GUIDE & INSTRUCTIONS</span>
              </div>
              <h3 className="font-display font-black text-lg text-white uppercase">
                HOW TO USE {siteConfig.siteTitle || 'THIS PANEL'}
              </h3>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed font-medium">
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center justify-center shrink-0">1</span>
                <span><strong>Create Account / Sign In:</strong> Register using username or Google Sign-In for instant access.</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center justify-center shrink-0">2</span>
                <span><strong>Deposit Funds:</strong> Navigate to DEPOSIT section and pay via instant UPI QR code.</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center justify-center shrink-0">3</span>
                <span><strong>Buy Keys:</strong> Select product duration option to receive license keys immediately.</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider transition-colors"
              >
                GOT IT, LET'S START!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

