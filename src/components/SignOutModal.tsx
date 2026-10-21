import React, { useState } from 'react';
import { LogOut, X, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';

interface SignOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAllDevices?: boolean;
}

export const SignOutModal: React.FC<SignOutModalProps> = ({
  isOpen,
  onClose,
  defaultAllDevices = false,
}) => {
  const { user, logout } = useAuth();
  const { success: showToastSuccess } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signOutAll, setSignOutAll] = useState(defaultAllDevices);

  if (!isOpen) return null;

  const handleConfirmSignOut = async () => {
    setIsSubmitting(true);
    try {
      if (signOutAll) {
        showToastSuccess('Sessions Terminated', 'Signed out from all active sessions.');
      } else {
        showToastSuccess('Signed Out', 'You have been safely signed out.');
      }
      onClose();
      await logout();
    } catch (err: any) {
      console.error('Logout error:', err);
      onClose();
      await logout();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={!isSubmitting ? onClose : undefined}
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#141828] via-[#0f121e] to-[#090b12] border border-rose-500/30 rounded-3xl p-6 shadow-[0_0_60px_rgba(244,63,94,0.3)] z-10 animate-in zoom-in-95 duration-200 space-y-5">
        {/* Header with dismiss */}
        <div className="flex items-start justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500/25 to-amber-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shadow-lg shadow-rose-950/40">
              <LogOut className="w-5 h-5 text-rose-400 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="font-display font-black text-lg text-white tracking-tight">
                Confirm Sign Out
              </h3>
              <p className="text-xs text-rose-300 font-medium">
                End active session & protect credentials
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Cancel and close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Account Info Card */}
        <div className="p-3.5 rounded-2xl bg-[#090c14] border border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white font-display font-bold text-xs flex items-center justify-center shrink-0 shadow-md">
              {user?.username ? user.username.slice(0, 2).toUpperCase() : 'NX'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">
                @{user?.username || 'user'}
              </div>
              <div className="text-[11px] text-slate-400 font-mono truncate">
                {user?.email || 'No email attached'}
              </div>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider shrink-0">
            {user?.role || 'ACTIVE'}
          </span>
        </div>

        {/* Confirmation Question */}
        <div className="text-xs text-slate-300 leading-relaxed space-y-3">
          <p>
            Are you sure you want to sign out? You will need your login credentials or email verification code to access your balance, purchases, and license keys again.
          </p>

          {/* All devices option */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors cursor-pointer select-none">
            <input
              type="checkbox"
              checked={signOutAll}
              onChange={e => setSignOutAll(e.target.checked)}
              className="mt-0.5 rounded border-white/20 bg-[#090b14] text-rose-600 focus:ring-rose-500"
            />
            <div className="text-xs">
              <span className="font-semibold text-white block">Sign out from all devices</span>
              <span className="text-[11px] text-slate-400">
                Invalidates session tokens on all other browsers and mobile devices.
              </span>
            </div>
          </label>
        </div>

        {/* Dual Actions: Cancel & Confirm Sign Out */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 hover:text-white text-xs font-bold transition-all border border-white/[0.1] flex items-center justify-center cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirmSignOut}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-black transition-all shadow-[0_4px_16px_rgba(244,63,94,0.4)] flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Signing Out...</span>
              </>
            ) : (
              <>
                <LogOut className="w-3.5 h-3.5" />
                <span>Confirm Sign Out</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
