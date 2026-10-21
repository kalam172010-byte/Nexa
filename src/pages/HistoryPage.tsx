import React, { useState, useEffect } from 'react';
import {
  History as HistoryIcon,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
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

  const tabs: { id: 'ALL' | 'DEPOSITS' | 'PURCHASES' | 'REFUNDS'; label: string }[] = [
    { id: 'ALL', label: 'All Activity' },
    { id: 'DEPOSITS', label: 'Deposits' },
    { id: 'PURCHASES', label: 'Purchases' },
    { id: 'REFUNDS', label: 'Refunds' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl sm:text-2xl text-white">
            Transaction Ledger
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Complete audit log of deposits, license purchases, referral commissions, and refunds.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search reference ID or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0c0e14] border border-white/[0.08] rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
          />
        </div>
      </div>

      {/* Financial Ledger Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-[#0e111a] to-[#0c0e14] border border-emerald-500/30 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-300">
            <span>Total Credits Inflow</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-400 tabular-nums">
            +₹{transactions.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0).toFixed(2)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-500/15 via-[#0e111a] to-[#0c0e14] border border-rose-500/30 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-300">
            <span>Total Debits Outflow</span>
            <ArrowUpRight className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-rose-400 tabular-nums">
            ₹{Math.abs(transactions.filter(t => t.amount < 0).reduce((acc, t) => acc + t.amount, 0)).toFixed(2)}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/15 via-[#0e111a] to-[#0c0e14] border border-cyan-500/30 space-y-1">
          <div className="flex items-center justify-between text-xs font-semibold text-cyan-300">
            <span>Total Events</span>
            <HistoryIcon className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-cyan-400 tabular-nums">
            {transactions.length} Records
          </div>
        </div>
      </div>

      {/* Tabs & Status Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-[#0c0e14] border border-white/[0.08] rounded-xl w-fit max-w-full overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 text-white font-bold shadow-[0_2px_12px_rgba(244,63,94,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-[#0c0e14] border border-white/[0.08] rounded-xl text-xs text-slate-200 py-2 px-3 focus:outline-none focus:border-rose-500"
          >
            <option value="ALL">All Status</option>
            <option value="SUCCESS">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      {isLoading ? (
        <div className="space-y-2.5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-4 rounded-2xl bg-[#0c0e14] border border-white/[0.08] animate-pulse h-20" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="p-12 rounded-2xl bg-gradient-to-b from-[#10131d] to-[#0a0c12] border border-rose-500/20 text-center space-y-3 shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-md">
            <HistoryIcon className="w-6 h-6" />
          </div>
          <h4 className="font-display font-bold text-base text-white">
            No Transactions Recorded
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Your ledger entries will appear here once you complete a deposit or license purchase.
          </p>
        </div>
      ) : (
        <div className="bg-[#0c0e14] border border-white/[0.1] rounded-2xl divide-y divide-white/[0.06] overflow-hidden shadow-xl">
          {transactions.map(tx => {
            const isPositive = tx.amount > 0;
            const isApiPurchase =
              tx.purchaseSource === 'API' ||
              String(tx.description || '').includes('Buyed by API') ||
              String(tx.description || '').includes('Outbound API');

            return (
              <div
                key={tx.id}
                className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      isPositive
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                    }`}
                  >
                    {isPositive ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <div className="text-xs sm:text-sm font-semibold text-white truncate">
                      {tx.description}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                      <span className={isPositive ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                        {tx.type}
                      </span>
                      {(tx.purchaseSource || tx.type === 'PURCHASE') && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-slate-300 font-medium">
                            {tx.purchaseSourceLabel || (isApiPurchase ? 'Buy from API' : 'Buy from Website')}
                          </span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {new Date(tx.createdAt).toLocaleString()}
                      </span>
                      <span aria-hidden="true">·</span>
                      <button
                        onClick={() => copyTxnId(tx.id)}
                        className="text-slate-300 hover:text-white transition-colors inline-flex items-center gap-1 font-mono cursor-pointer"
                        title="Copy Transaction ID"
                      >
                        <span>{tx.id}</span>
                        {copiedId === tx.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3 opacity-70" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Amount & Semantic Status */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-white/[0.05] shrink-0">
                  <div
                    className={`font-mono text-sm sm:text-base font-bold tabular-nums ${
                      isPositive ? 'text-emerald-400' : 'text-white'
                    }`}
                  >
                    {isPositive ? `+₹${tx.amount.toFixed(2)}` : `-₹${Math.abs(tx.amount).toFixed(2)}`}
                  </div>

                  <div className="flex items-center gap-1 text-xs mt-0.5">
                    {tx.status === 'SUCCESS' ? (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed</span>
                      </span>
                    ) : tx.status === 'PENDING' ? (
                      <span className="text-amber-400 font-medium flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pending</span>
                      </span>
                    ) : (
                      <span className="text-rose-400 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{tx.status}</span>
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
