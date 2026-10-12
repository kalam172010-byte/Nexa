import React, { useState, useEffect } from 'react';
import {
  Share2,
  Copy,
  Check,
  Users,
  Award,
  CreditCard,
  Gift,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api.js';
import { ReferralData } from '../types/index.js';
import { useToast } from '../context/ToastContext.js';

export const ReferPage: React.FC = () => {
  const { success: showToastSuccess } = useToast();
  const [data, setData] = useState<ReferralData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    const fetchReferral = async () => {
      try {
        setIsLoading(true);
        const res = await api.getReferrals();
        if (res) setData(res);
      } catch (err) {
        console.error('Failed to load referral data', err);
      } finally {
        setIsLoading(false);
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
    <div className="space-y-6 pb-24 md:pb-12 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#181108] via-[#0f0d14] to-[#070709] border border-amber-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Gift className="w-3.5 h-3.5" />
            <span>5% LIFETIME PASSIVE COMMISSION</span>
          </div>

          <h2 className="font-display font-black text-2xl sm:text-3xl text-white uppercase tracking-wide">
            REFER FRIENDS & EARN REWARDS
          </h2>

          <p className="text-xs text-slate-300 leading-relaxed">
            Invite players or reseller partners to Kalam FF Panel. Earn an automated 5% instant cash reward into your wallet on every single digital key purchase they make, lifetime!
          </p>
        </div>
      </div>

      {/* Referral Link & Code Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* REFERRAL LINK */}
        <div className="p-5 rounded-2xl bg-[#0d0d14] border border-white/5 space-y-3 shadow-lg">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            YOUR REFERRAL LINK
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs">
            <span className="font-mono text-slate-200 truncate mr-2">
              {data?.referralLink || 'Loading...'}
            </span>
            <button
              onClick={() => data?.referralLink && handleCopy(data.referralLink, true)}
              className="p-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 transition-colors shrink-0"
              title="Copy Link"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Share this link on Telegram, WhatsApp, Discord, or YouTube description.
          </p>
        </div>

        {/* REFERRAL CODE */}
        <div className="p-5 rounded-2xl bg-[#0d0d14] border border-white/5 space-y-3 shadow-lg">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            REFERRAL CODE
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs">
            <span className="font-mono font-black text-rose-400 text-base tracking-widest uppercase">
              {data?.referralCode || 'XXXXXXXX'}
            </span>
            <button
              onClick={() => data?.referralCode && handleCopy(data.referralCode, false)}
              className="p-2 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 transition-colors shrink-0"
              title="Copy Code"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Users can enter this code during registration for instant VIP account tagging.
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* TOTAL REFERRALS */}
        <div className="p-5 rounded-2xl bg-[#0d0d14] border border-white/5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold tracking-wider uppercase text-[10px]">TOTAL REFERRALS</span>
            <Users className="w-4 h-4 text-rose-400" />
          </div>
          <div className="font-mono text-3xl font-black text-white tabular-nums mt-2">
            {data?.totalReferrals || 0}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">Users registered with code</div>
        </div>

        {/* SUCCESSFUL REFERRALS */}
        <div className="p-5 rounded-2xl bg-[#0d0d14] border border-white/5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold tracking-wider uppercase text-[10px]">SUCCESSFUL ORDERS</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-mono text-3xl font-black text-emerald-400 tabular-nums mt-2">
            {data?.successfulReferrals || 0}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">Referred active buyers</div>
        </div>

        {/* TOTAL EARNINGS */}
        <div className="p-5 rounded-2xl bg-[#0d0d14] border border-white/5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold tracking-wider uppercase text-[10px]">TOTAL EARNINGS</span>
            <CreditCard className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-mono text-3xl font-black text-amber-400 tabular-nums mt-2">
            ₹{(data?.totalEarnings || 0).toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">Credited straight to wallet</div>
        </div>
      </div>

      {/* Referral History Table */}
      <div className="space-y-3">
        <h3 className="font-display font-black text-base text-white uppercase tracking-wider">
          REFERRAL HISTORY
        </h3>

        {!data?.referrals || data.referrals.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#0d0d14] border border-white/5 text-center text-xs text-slate-400">
            No referrals yet. Share your referral link above to start earning passive income!
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0d0d14]">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] border-b border-white/5 text-[10px] font-mono text-slate-400 uppercase">
                <tr>
                  <th className="p-3.5">Referred User</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Commission Earned</th>
                  <th className="p-3.5">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.referrals.map(ref => (
                  <tr key={ref.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3.5 font-bold text-white">@{ref.referredUsername}</td>
                    <td className="p-3.5">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                          ref.hasPurchased
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border-white/5'
                        }`}
                      >
                        {ref.hasPurchased ? 'ACTIVE BUYER' : 'REGISTERED'}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-amber-400">
                      ₹{ref.rewardEarned.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-slate-400 font-mono">
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
