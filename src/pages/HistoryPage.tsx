import React, { useState, useEffect } from 'react';
import {
  History as HistoryIcon,
  Search,
  Wallet,
  ShoppingBag,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { api } from '../services/api.js';
import { Transaction } from '../types/index.js';
import { useToast } from '../context/ToastContext.js';

export const HistoryPage: React.FC = () => {
  const { success: showToastSuccess } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'DEPOSITS' | 'PURCHASES' | 'REFUNDS'>('ALL');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'PENDING' | 'FAILED'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const res = await api.getTransactions(activeTab, search, statusFilter);
      if (res?.transactions) {
        setTransactions(res.transactions);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [activeTab, search, statusFilter]);

  const copyTxnId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    showToastSuccess('Transaction ID copied');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const tabs: ('ALL' | 'DEPOSITS' | 'PURCHASES' | 'REFUNDS')[] = [
    'ALL',
    'DEPOSITS',
    'PURCHASES',
    'REFUNDS',
  ];

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-black text-xl sm:text-2xl text-white uppercase tracking-wider">
            TRANSACTION HISTORY
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit trail of all deposits, key purchases, referral bonuses, and refunds.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Txn ID or item..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#0d0d14] border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
          />
        </div>
      </div>

      {/* Tabs & Status Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Type Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all border ${
                activeTab === tab
                  ? 'bg-rose-500/15 border-rose-500 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                  : 'bg-[#0d0d14] border-white/5 text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Status Select */}
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-[#0d0d14] border border-white/10 rounded-xl text-xs text-slate-300 py-1.5 px-3 focus:outline-none focus:border-rose-500"
          >
            <option value="ALL">All Status</option>
            <option value="SUCCESS">Success</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-4 rounded-2xl bg-[#0d0d14] border border-white/5 animate-pulse h-20" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[#0d0d14] border border-white/5 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.03] text-slate-500 flex items-center justify-center mx-auto">
            <HistoryIcon className="w-6 h-6" />
          </div>
          <h4 className="font-display font-bold text-base text-white uppercase tracking-wider">
            NO TRANSACTIONS
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Your transaction history will appear here once you deposit or make a purchase.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {transactions.map(tx => {
            const isPositive = tx.amount > 0;
            const isDeposit = tx.type === 'DEPOSIT';
            const isPurchase = tx.type === 'PURCHASE';

            return (
              <div
                key={tx.id}
                className="p-4 rounded-2xl bg-[#0d0d14] border border-white/5 hover:border-white/15 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      isPositive
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                    }`}
                  >
                    {isPositive ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-white/[0.04] text-slate-300 uppercase">
                        {tx.type}
                      </span>
                      <span className="text-xs font-bold text-white truncate">{tx.description}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                      <span>{new Date(tx.createdAt).toLocaleString()}</span>
                      <span>·</span>
                      <button
                        onClick={() => copyTxnId(tx.id)}
                        className="hover:text-rose-400 transition-colors flex items-center gap-1"
                        title="Copy Txn ID"
                      >
                        <span>{tx.id}</span>
                        {copiedId === tx.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3 opacity-60" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Amount & Status */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
                  <div
                    className={`font-mono text-base font-black tabular-nums tracking-tight ${
                      isPositive ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isPositive ? `+₹${tx.amount.toFixed(2)}` : `-₹${Math.abs(tx.amount).toFixed(2)}`}
                  </div>

                  <div className="flex items-center gap-1 text-[10px] font-mono uppercase mt-0.5">
                    {tx.status === 'SUCCESS' ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        SUCCESS
                      </span>
                    ) : tx.status === 'PENDING' ? (
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        PENDING
                      </span>
                    ) : (
                      <span className="text-rose-400 font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {tx.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
