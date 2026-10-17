import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  User,
  Lock,
  Mail,
  RefreshCw,
  Eye,
  EyeOff,
  X,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Send,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { useSite } from '../context/SiteContext.js';

interface AuthPageProps {
  onSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess }) => {
  const { login, register, sendPasswordReset, loginWithGoogle, sendOtp, loginWithOtp } = useAuth();
  const { success: showToastSuccess, error: showToastError } = useToast();
  const { siteConfig } = useSite();

  // Form states
  const [mode, setMode] = useState<'login' | 'register' | 'otp' | 'reset'>('login');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [password, setPassword] = useState('');
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

  // Forgot Password (Email sent reset method only) states
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [isResetSent, setIsResetSent] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(0);
  const [resetTargetEmail, setResetTargetEmail] = useState('');
  const [previewResetToken, setPreviewResetToken] = useState<string | null>(null);

  // Countdown timer effects
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  useEffect(() => {
    if (resetCountdown > 0) {
      const timer = setTimeout(() => setResetCountdown(resetCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resetCountdown]);

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
      if (res.code) {
        setPreviewOtp(res.code);
      }
      // No notification popup at the top to preserve complete privacy & prevent sender email exposure
    } catch (err: any) {
      showToastError('Verification Error', 'Failed to send verification code. Please check your email and try again.');
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
      showToastSuccess('Login Successful', `Welcome to ${siteConfig.siteTitle || 'Nexa Panel'}!`);
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
      showToastSuccess('Google Sign-In Successful', `Welcome to ${siteConfig.siteTitle || 'Nexa Panel'}.`);
      onSuccess();
    } catch (err: any) {
      showToastError('Google Sign-In Notice', err.message || 'Could not authenticate with Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSendResetEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const identifier = (resetIdentifier || loginIdentifier).trim();
    if (!identifier) {
      showToastError('Validation Error', 'Please enter your registered email address or username.');
      return;
    }

    setIsSubmitting(true);
    setPreviewResetToken(null);
    try {
      const res = await sendPasswordReset(identifier);
      setIsResetSent(true);
      const targetEmail = res.email || identifier;
      setResetTargetEmail(targetEmail);
      setResetCountdown(60);
      if (res.resetToken) {
        setPreviewResetToken(res.resetToken);
      }
      showToastSuccess('Reset Instructions Sent', 'Please check your inbox to reset your password.');
    } catch (err: any) {
      showToastError('Reset Error', 'Could not send password reset instructions. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'reset') {
      await handleSendResetEmail(e);
      return;
    }

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
        showToastSuccess('Welcome Back!', 'Signed in successfully.');
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
        showToastSuccess('Account Created!', `Welcome to ${siteConfig.siteTitle || 'Nexa Panel'}.`);
        onSuccess();
      }
    } catch (err: any) {
      showToastError('Authentication Error', err.message || 'Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-10 bg-[#090a0f] text-slate-100 font-sans">
      <div className="w-full max-w-md space-y-5">
        {/* Main Auth Container */}
        <div className="p-6 sm:p-8 rounded-2xl bg-[#10121a] border border-white/[0.07] space-y-6">
          {/* Brand Header */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 mb-1">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="font-display font-bold text-xl sm:text-2xl tracking-tight text-white">
              {siteConfig.siteTitle || 'Nexa Panel'}
            </h1>
            <p className="text-xs text-slate-400">
              {mode === 'login'
                ? 'Sign in to access your reseller workspace'
                : mode === 'otp'
                ? 'Sign in with a one-time email verification code'
                : mode === 'register'
                ? 'Create a new account to purchase digital licenses'
                : 'Recover your account via email reset link'}
            </p>
          </div>

          {/* Segmented Control Tabs */}
          {mode !== 'reset' && (
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#090a0f] border border-white/[0.06] text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setIsResetSent(false);
                }}
                className={`py-2 px-3 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mode === 'login'
                    ? 'bg-[#181b26] text-white font-semibold border border-white/[0.08]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('otp');
                  setIsResetSent(false);
                }}
                className={`py-2 px-3 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mode === 'otp'
                    ? 'bg-[#181b26] text-white font-semibold border border-white/[0.08]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Email OTP
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setIsResetSent(false);
                }}
                className={`py-2 px-3 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mode === 'register'
                    ? 'bg-[#181b26] text-white font-semibold border border-white/[0.08]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Register
              </button>
            </div>
          )}

          {/* EMAIL OTP LOGIN INTERFACE */}
          {mode === 'otp' && (
            <div className="space-y-4 text-xs">
              {!isOtpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <p className="text-slate-400 leading-relaxed">
                    Enter your registered email address to receive a 6-digit verification code for passwordless sign-in.
                  </p>

                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={otpEmail}
                        onChange={e => setOtpEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-[#090a0f] border border-white/10 focus:border-rose-500 rounded-xl text-white focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isOtpSending}
                    className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {isOtpSending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Verification Code</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="p-3 rounded-xl bg-[#090a0f] border border-white/[0.06] flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-[11px] text-slate-400">Verification code sent to</div>
                      <div className="font-mono text-white font-semibold text-xs truncate mt-0.5">
                        {otpEmail}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsOtpSent(false);
                        setPreviewOtp(null);
                      }}
                      className="text-rose-400 hover:text-rose-300 font-medium text-xs shrink-0 ml-3 cursor-pointer"
                    >
                      Change
                    </button>
                  </div>

                  {previewOtp && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs flex items-center justify-between">
                      <span>
                        Code: <strong className="font-mono text-white text-sm tracking-wider tabular-nums">{previewOtp}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setOtpCode(previewOtp)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-xs font-medium transition-colors cursor-pointer"
                      >
                        Fill Code
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1.5">
                      6-Digit Verification Code
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        required
                        autoFocus
                        className="w-full pl-10 pr-4 py-2.5 bg-[#090a0f] border border-white/10 focus:border-rose-500 rounded-xl text-white font-mono font-bold text-center text-lg tracking-[0.35em] tabular-nums focus:outline-none transition-colors placeholder:tracking-normal"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isOtpVerifying || otpCode.length < 4}
                    className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
                  >
                    {isOtpVerifying ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <span>Verify & Sign In</span>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      disabled={otpCountdown > 0 || isOtpSending}
                      onClick={() => handleSendOtp()}
                      className="text-slate-400 hover:text-white font-medium transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {otpCountdown > 0 ? (
                        <span className="tabular-nums">Resend in {otpCountdown}s</span>
                      ) : (
                        <span className="text-rose-400 hover:underline">Resend Code</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-slate-400 hover:text-white font-medium transition-colors cursor-pointer"
                    >
                      Use Password
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Login and Register Form */}
          {mode !== 'otp' && mode !== 'reset' && (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1.5">
                      Username
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={regUsername}
                        onChange={e => setRegUsername(e.target.value)}
                        placeholder="Choose a username"
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-[#090a0f] border border-white/10 focus:border-rose-500 rounded-xl text-white focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={regEmail}
                        onChange={e => setRegEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-[#090a0f] border border-white/10 focus:border-rose-500 rounded-xl text-white focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        required
                        className="w-full pl-10 pr-10 py-2.5 bg-[#090a0f] border border-white/10 focus:border-rose-500 rounded-xl text-white focus:outline-none transition-colors"
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
                    <label className="text-xs font-medium text-slate-300 block mb-1.5">
                      Referral Code <span className="text-slate-500 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={referralCode}
                      onChange={e => setReferralCode(e.target.value)}
                      placeholder="Enter partner referral code"
                      className="w-full px-3.5 py-2.5 bg-[#090a0f] border border-white/10 focus:border-rose-500 rounded-xl text-white font-mono focus:outline-none uppercase transition-colors"
                    />
                  </div>
                </>
              )}

              {mode === 'login' && (
                <>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1.5">
                      Username or Email
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={loginIdentifier}
                        onChange={e => setLoginIdentifier(e.target.value)}
                        placeholder="Enter username or email"
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-[#090a0f] border border-white/10 focus:border-rose-500 rounded-xl text-white focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-slate-300">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setMode('reset');
                          setIsResetSent(false);
                          setResetIdentifier(loginIdentifier);
                        }}
                        className="text-xs text-rose-400 hover:text-rose-300 font-medium transition-colors cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Enter password"
                        required
                        className="w-full pl-10 pr-10 py-2.5 bg-[#090a0f] border border-white/10 focus:border-rose-500 rounded-xl text-white focus:outline-none transition-colors"
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

              {/* Submit Action */}
              <button
                type="submit"
                disabled={isSubmitting || isGoogleLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <span>
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                  </span>
                )}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD - EMAIL SENT RESET METHOD ONLY (NO NEW PASSWORD / NO RE-TYPE PASSWORD) */}
          {mode === 'reset' && (
            <div className="space-y-4 text-xs">
              {!isResetSent ? (
                <form onSubmit={handleSendResetEmail} className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-[#090a0f] border border-white/[0.06] text-slate-300 leading-relaxed">
                    Enter your registered email address or username. We will send a password reset link directly to your email inbox.
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1.5">
                      Registered Email or Username
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={resetIdentifier}
                        onChange={e => setResetIdentifier(e.target.value)}
                        placeholder="you@example.com or username"
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-[#090a0f] border border-white/10 focus:border-rose-500 rounded-xl text-white focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Reset Email</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setIsResetSent(false);
                    }}
                    className="w-full py-2 text-slate-400 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Sign In</span>
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-center space-y-2">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-sm text-white">
                        Password Reset Email Sent
                      </h3>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        Reset instructions have been sent to{' '}
                        <strong className="text-white font-mono break-all">{resetTargetEmail}</strong>.
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Open the link in your email inbox to complete your password reset.
                    </p>
                  </div>

                  {previewResetToken && (
                    <div className="p-3 rounded-xl bg-[#090a0f] border border-white/[0.08] text-slate-300 text-xs space-y-1">
                      <div className="font-medium text-slate-400 text-[11px]">
                        Preview Reset Token
                      </div>
                      <div className="font-mono text-amber-300 select-all break-all">
                        {previewResetToken}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setIsResetSent(false);
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold flex items-center justify-center gap-2 border border-white/[0.08] transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Return to Sign In</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting || resetCountdown > 0}
                      onClick={handleSendResetEmail}
                      className="w-full py-2 text-rose-400 hover:text-rose-300 disabled:text-slate-500 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                      <span className="tabular-nums">
                        {resetCountdown > 0
                          ? `Resend email in ${resetCountdown}s`
                          : 'Resend reset email'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Divider & Google Sign-In */}
          {mode !== 'reset' && (
            <>
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-white/[0.06]" />
                <span className="flex-shrink mx-3 text-[11px] text-slate-500">
                  or continue with
                </span>
                <div className="flex-grow border-t border-white/[0.06]" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-[#090a0f] hover:bg-white/[0.04] border border-white/10 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2.5 cursor-pointer whitespace-nowrap shrink-0"
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
                <span>Continue with Google</span>
              </button>
            </>
          )}

          {/* Quick Platform Guide */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => setShowGuideModal(true)}
              className="text-xs text-slate-400 hover:text-white font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-rose-400" />
              <span>Platform Guide & Onboarding</span>
            </button>
          </div>
        </div>

        {/* Quiet Copyright Footer */}
        <div className="text-center text-xs text-slate-500">
          © {new Date().getFullYear()} {siteConfig.siteTitle || 'Nexa Panel'}. All rights reserved.
        </div>
      </div>

      {/* Platform Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#10121a] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <div className="text-rose-400 text-xs font-medium">
                Quick Start Guide
              </div>
              <h3 className="font-display font-bold text-lg text-white">
                Getting Started with {siteConfig.siteTitle || 'Nexa Panel'}
              </h3>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="p-3.5 rounded-xl bg-[#090a0f] border border-white/[0.06]">
                <div className="font-semibold text-white mb-0.5">01. Create Your Account</div>
                <p className="text-slate-400">Sign in using your username, Email OTP, or Google account for instant access.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#090a0f] border border-white/[0.06]">
                <div className="font-semibold text-white mb-0.5">02. Add Wallet Balance</div>
                <p className="text-slate-400">Open the Add Funds section and scan the zero-fee UPI QR code for automated balance credit.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#090a0f] border border-white/[0.06]">
                <div className="font-semibold text-white mb-0.5">03. Instant License Delivery</div>
                <p className="text-slate-400">Choose your software duration in the catalog to generate and copy your key immediately.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              Continue to Sign In
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
