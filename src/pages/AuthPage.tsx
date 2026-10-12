import React, { useState, useEffect } from 'react';
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
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Send,
  Key,
  ArrowRight,
  Inbox,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { useSite } from '../context/SiteContext.js';

interface AuthPageProps {
  onSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess }) => {
  const { login, register, resetPassword, loginWithGoogle, sendOtp, loginWithOtp } = useAuth();
  const { success: showToastSuccess, error: showToastError } = useToast();
  const { siteConfig } = useSite();

  // Form states
  const [mode, setMode] = useState<'login' | 'register' | 'otp' | 'reset'>('login');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Email OTP Login states
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpSending, setIsOtpSending] = useState(false);
  const [isOtpVerifying, setIsOtpVerifying] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [previewOtp, setPreviewOtp] = useState<string | null>(null);
  const [otpFeedback, setOtpFeedback] = useState<string>('');

  // Countdown timer effect
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  // How to use site modal
  const [showGuideModal, setShowGuideModal] = useState(false);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const email = otpEmail.trim();
    if (!email || !email.includes('@')) {
      showToastError('Validation Error', 'Please enter a valid email address.');
      return;
    }

    setIsOtpSending(true);
    setPreviewOtp(null);
    try {
      const res = await sendOtp(email);
      setIsOtpSent(true);
      setOtpCountdown(60);
      setOtpFeedback(res.message || `Verification OTP sent to ${email}`);
      if (res.code) {
        setPreviewOtp(res.code);
      }
      showToastSuccess('OTP Code Sent', res.message || `Check your inbox at ${email}`);
    } catch (err: any) {
      showToastError('OTP Delivery Error', err.message || 'Could not send OTP to email.');
    } finally {
      setIsOtpSending(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const email = otpEmail.trim();
    const code = otpCode.trim();

    if (!email) {
      showToastError('Validation Error', 'Please enter your email.');
      return;
    }
    if (!code || code.length < 4) {
      showToastError('Validation Error', 'Please enter the 6-digit verification code.');
      return;
    }

    setIsOtpVerifying(true);
    try {
      await loginWithOtp(email, code);
      showToastSuccess('Login Successful', `Welcome to ${siteConfig.siteTitle || 'Kalam FF Panel'}!`);
      onSuccess();
    } catch (err: any) {
      showToastError('Verification Failed', err.message || 'Invalid or expired OTP code.');
    } finally {
      setIsOtpVerifying(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      showToastSuccess('Google Sign-In Successful', `Welcome to ${siteConfig.siteTitle || 'Kalam FF Panel'}.`);
      onSuccess();
    } catch (err: any) {
      showToastError('Google Sign-In Notice', err.message || 'Could not authenticate with Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        const identifier = loginIdentifier.trim();
        if (!identifier) {
          showToastError('Validation Error', 'Please enter your username or email.');
          return;
        }
        if (!password) {
          showToastError('Validation Error', 'Please enter your password.');
          return;
        }
        await login(identifier, password);
        showToastSuccess('Welcome Back!', 'Logged in successfully.');
        onSuccess();
      } else if (mode === 'register') {
        const u = regUsername.trim();
        const em = regEmail.trim();
        if (!u || !em) {
          showToastError('Validation Error', 'Username and email are required.');
          return;
        }
        if (password.length < 6) {
          showToastError('Validation Error', 'Password must be at least 6 characters.');
          return;
        }
        await register(u, em, password, referralCode.trim() || undefined);
        showToastSuccess('Account Created!', `Welcome to ${siteConfig.siteTitle || 'Kalam FF Panel'}.`);
        onSuccess();
      } else if (mode === 'reset') {
        const identifier = loginIdentifier.trim();
        if (!identifier) {
          showToastError('Validation Error', 'Please enter your username or registered email.');
          return;
        }
        if (password.length < 6) {
          showToastError('Validation Error', 'New password must be at least 6 characters.');
          return;
        }
        if (password !== confirmPassword) {
          showToastError('Validation Error', 'Passwords do not match.');
          return;
        }
        await resetPassword(identifier, password);
        showToastSuccess('Password Reset Successful', 'You have been logged into your account.');
        onSuccess();
      }
    } catch (err: any) {
      showToastError('Authentication Error', err.message || 'Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 sm:py-12 relative overflow-hidden bg-[#070709] text-slate-100 font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-rose-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-sm sm:max-w-md space-y-4 relative z-10">
        {/* Main Auth Card */}
        <div className="p-5 sm:p-8 rounded-3xl bg-[#0d0d14]/90 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-rose-950/20 space-y-5">
          {/* Top Brand Emblem */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-rose-500/20 to-red-600/30 border border-rose-500/40 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
              <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7 text-rose-400" />
            </div>
            <h1 className="font-display font-black text-xl sm:text-2xl tracking-wider text-white uppercase">
              {siteConfig.siteTitle || 'KALAM FF PANEL'}
            </h1>
            <p className="text-[11px] text-slate-400 font-mono tracking-wider uppercase">
              {mode === 'login'
                ? 'SIGN IN TO YOUR ACCOUNT'
                : mode === 'otp'
                ? 'SIGN IN WITH EMAIL OTP'
                : mode === 'register'
                ? 'CREATE GAMING ACCOUNT'
                : 'RESET ACCOUNT PASSWORD'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-3 p-1 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] font-bold font-display">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              LOGIN
            </button>
            <button
              type="button"
              onClick={() => setMode('otp')}
              className={`py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                mode === 'otp'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mail className="w-3 h-3 text-rose-300" />
              <span>EMAIL OTP</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`py-2 rounded-lg transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              REGISTER
            </button>
          </div>

          {/* EMAIL OTP LOGIN INTERFACE */}
          {mode === 'otp' && (
            <div className="space-y-4 text-xs">
              {!isOtpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-3.5">
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] flex items-start gap-2.5">
                    <Mail className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <span>
                      Enter your email address. A 6-digit OTP will be dispatched from our mail server directly to your inbox for instant login.
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      YOUR EMAIL ADDRESS
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-rose-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={otpEmail}
                        onChange={e => setOtpEmail(e.target.value)}
                        placeholder="e.g. kalamkalam1234kd@gmail.com"
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/10 focus:border-rose-500 rounded-xl text-white font-medium focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isOtpSending}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-[0.98] text-white font-display font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-rose-950/40 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isOtpSending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>SEND LOGIN OTP</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                  <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Code sent to:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsOtpSent(false);
                          setPreviewOtp(null);
                        }}
                        className="text-rose-400 hover:underline font-bold"
                      >
                        Change Email
                      </button>
                    </div>
                    <div className="font-mono text-white font-bold text-xs truncate">
                      {otpEmail}
                    </div>
                  </div>

                  {previewOtp && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <span>
                          Preview OTP: <strong className="font-mono text-white text-sm tracking-wider">{previewOtp}</strong>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOtpCode(previewOtp)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold transition-all cursor-pointer"
                      >
                        Auto-Fill
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      ENTER 6-DIGIT OTP CODE
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-rose-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        required
                        autoFocus
                        className="w-full pl-10 pr-4 py-3 bg-white/[0.04] border border-white/10 focus:border-rose-500 rounded-xl text-white font-mono font-black text-center text-xl tracking-[0.4em] focus:outline-none transition-all placeholder:tracking-normal"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isOtpVerifying || otpCode.length < 4}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-[0.98] text-white font-display font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-rose-950/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isOtpVerifying ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>VERIFY & SIGN IN</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <button
                      type="button"
                      disabled={otpCountdown > 0 || isOtpSending}
                      onClick={() => handleSendOtp()}
                      className="text-slate-400 hover:text-white font-semibold transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {otpCountdown > 0 ? (
                        <span>Resend code in {otpCountdown}s</span>
                      ) : (
                        <span className="text-rose-400 font-bold hover:underline">Resend OTP Code</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-slate-400 hover:text-white font-semibold transition-colors cursor-pointer"
                    >
                      Login with Password
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Form */}
          {mode !== 'otp' && (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {mode === 'register' && (
              <>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    USERNAME
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-rose-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={regUsername}
                      onChange={e => setRegUsername(e.target.value)}
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
                      value={regEmail}
                      onChange={e => setRegEmail(e.target.value)}
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
            )}

            {mode === 'login' && (
              <>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    USERNAME OR EMAIL
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-rose-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={loginIdentifier}
                      onChange={e => setLoginIdentifier(e.target.value)}
                      placeholder="Enter username or email"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/10 focus:border-rose-500 rounded-xl text-white font-medium focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      PASSWORD
                    </label>
                    <button
                      type="button"
                      onClick={() => setMode('reset')}
                      className="text-[10px] text-rose-400 hover:text-rose-300 font-bold transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
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

            {mode === 'reset' && (
              <>
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-slate-300 text-[11px] flex items-start gap-2">
                  <KeyRound className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>
                    Enter your username or email and choose a new password to reset your account and log in immediately.
                  </span>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    USERNAME OR REGISTERED EMAIL
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-rose-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={loginIdentifier}
                      onChange={e => setLoginIdentifier(e.target.value)}
                      placeholder="Enter username or email"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/10 focus:border-rose-500 rounded-xl text-white font-medium focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    NEW PASSWORD
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-rose-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
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

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    CONFIRM NEW PASSWORD
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-rose-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Re-type new password"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/10 focus:border-rose-500 rounded-xl text-white font-medium focus:outline-none transition-all"
                    />
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
                <span>
                  {mode === 'login'
                    ? 'SIGN IN NOW'
                    : mode === 'register'
                    ? 'CREATE ACCOUNT'
                    : 'RESET PASSWORD & SIGN IN'}
                </span>
              )}
            </button>

            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full py-2 text-slate-400 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Login</span>
              </button>
            )}
          </form>
          )}

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

          {/* Guide Link */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => setShowGuideModal(true)}
              className="text-xs text-rose-400 hover:text-rose-300 font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>How to use this site?</span>
              <Play className="w-3 h-3 fill-rose-400" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] font-mono text-slate-500 font-semibold tracking-wider">
          © {new Date().getFullYear()} {siteConfig.siteTitle ? siteConfig.siteTitle.toUpperCase() : 'KALAM FF PANEL'}. ALL RIGHTS RESERVED.
        </div>
      </div>

      {/* Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0d0d14] border border-white/10 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
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
                className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
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
