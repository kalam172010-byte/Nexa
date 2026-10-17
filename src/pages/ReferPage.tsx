import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  Users,
  CreditCard,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api.js';
import { ReferralData } from '../types/index.js';
import { useToast } from '../context/ToastContext.js';

export const ReferPage: React.FC = () => {
  const { success: showToastSuccess } = useToast();
  const [data, setData] = useState<ReferralData | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    const fetchReferral = async () => {
      try {
        const res = await api.getReferrals();
        if (res) setData(res);
      } catch (err) {
        console.error('Failed to load referral data', err);
      }
    };
    fetchReferral();
  }, []);

  const handleCopy = (text: string, isLink: boolean) => {
    navigator.clipboard.writeText(text);
    if (isLink) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
    showToastSuccess('Copied to clipboard');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Partner Banner */}
      <div className="rounded-2xl bg-gradient-to-br from-rose-950/60 via-[#121422] to-amber-950/50 border border-rose-500/30 p-6 sm:p-8 space-y-2 shadow-[0_8px_30px_rgba(244,63,94,0.12)]">
        <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Partner Referral Program</span>
          <span aria-hidden="true">·</span>
          <span className="text-emerald-400">5% Lifetime Commission</span>
        </div>

        <h2 className="font-display font-bold text-xl sm:text-2xl bg-gradient-to-r from-white via-rose-100 to-amber-200 bg-clip-text text-transparent">
          Refer Friends & Earn Instant Wallet Rewards
        </h2>

        <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
          Invite players or resellers using your personal referral link or code. You automatically earn a 5% commission credited straight to your wallet on every digital license purchase they complete.
        </p>
      </div>

      {/* Referral Link & Code Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-b from-[#131622] to-[#0f111a] border border-rose-500/25 space-y-3">
          <div className="text-xs font-semibold text-rose-300">
            Personal Referral Link
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#090a0f] border border-white/[0.08] text-xs">
            <span className="font-mono text-cyan-300 truncate mr-2 select-all">
              {data?.referralLink || 'Loading...'}
            </span>
            <button
              onClick={() => data?.referralLink && handleCopy(data.referralLink, true)}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Share directly on Telegram, WhatsApp, or Discord communities.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-b from-[#131622] to-[#0f111a] border border-amber-500/25 space-y-3">
          <div className="text-xs font-semibold text-amber-300">
            Partner Referral Code
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#090a0f] border border-white/[0.08] text-xs">
            <span className="font-mono font-bold text-amber-400 text-sm tracking-wider uppercase select-all">
              {data?.referralCode || '--------'}
            </span>
            <button
              onClick={() => data?.referralCode && handleCopy(data.referralCode, false)}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-400">
            New members can enter this code when registering their account.
          </p>
        </div>
      </div>

      {/* Statistics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-500/12 via-[#10121a] to-[#10121a] border border-cyan-500/25 space-y-1.5">
          <div className="flex items-center justify-between text-cyan-300 text-xs font-semibold">
            <span>Total Referrals</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold text-cyan-400 tabular-nums">
            {data?.totalReferrals || 0}
          </div>
          <div className="text-xs text-slate-400">Registered accounts</div>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/12 via-[#10121a] to-[#10121a] border border-emerald-500/25 space-y-1.5">
          <div className="flex items-center justify-between text-emerald-300 text-xs font-semibold">
            <span>Active Buyers</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold text-emerald-400 tabular-nums">
            {data?.successfulReferrals || 0}
          </div>
          <div className="text-xs text-slate-400">Completed orders</div>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/12 via-[#10121a] to-[#10121a] border border-amber-500/25 space-y-1.5">
          <div className="flex items-center justify-between text-amber-300 text-xs font-semibold">
            <span>Total Commission</span>
            <CreditCard className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold text-amber-400 tabular-nums">
            ₹{(data?.totalEarnings || 0).toFixed(2)}
          </div>
          <div className="text-xs text-slate-400">Credited to wallet</div>
        </div>
      </div>

      {/* Referral History Table */}
      <div className="space-y-3">
        <h3 className="font-display font-bold text-base text-white">
          Referred Members
        </h3>

        {!data?.referrals || data.referrals.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#10121a] border border-white/[0.06] text-center text-xs text-slate-400">
            No referrals recorded yet. Share your partner link above to begin earning commissions.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#10121a]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0b0d14] border-b border-white/[0.08] text-slate-300 font-semibold">
                <tr>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Activity Status</th>
                  <th className="py-3 px-4 text-right">Commission Earned</th>
                  <th className="py-3 px-4 text-right">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {data.referrals.map(ref => (
                  <tr key={ref.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">@{ref.referredUsername}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs font-semibold ${
                          ref.hasPurchased ? 'text-emerald-400' : 'text-cyan-400'
                        }`}
                      >
                        {ref.hasPurchased ? 'Active Buyer' : 'Registered'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-400 tabular-nums">
                      ₹{ref.rewardEarned.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 font-mono tabular-nums">
                      {new Date(ref.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
