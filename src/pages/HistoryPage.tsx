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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl sm:text-2xl bg-gradient-to-r from-white via-cyan-100 to-sky-200 bg-clip-text text-transparent">
            Transaction Ledger
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Complete audit log of deposits, license purchases, referral commissions, and refunds.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search reference ID or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#10121a] border border-white/[0.1] rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* Tabs & Status Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-[#10121a] border border-white/[0.08] rounded-xl w-fit max-w-full overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold shadow-[0_2px_10px_rgba(244,63,94,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-3.5 h-3.5 text-cyan-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-[#10121a] border border-white/[0.1] rounded-xl text-xs text-slate-200 py-2 px-3 focus:outline-none focus:border-cyan-500"
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
            <div key={i} className="p-4 rounded-2xl bg-[#10121a] border border-white/[0.06] animate-pulse h-20" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#10121a] border border-white/[0.08] text-center space-y-3">
          <div className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto">
            <HistoryIcon className="w-5 h-5" />
          </div>
          <h4 className="font-display font-bold text-base text-white">
            No Transactions Recorded
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Your ledger entries will appear here once you complete a deposit or license purchase.
          </p>
        </div>
      ) : (
        <div className="bg-[#10121a] border border-white/[0.08] rounded-2xl divide-y divide-white/[0.06] overflow-hidden shadow-xl">
          {transactions.map(tx => {
            const isPositive = tx.amount > 0;

            return (
              <div
                key={tx.id}
                className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      isPositive
                        ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400'
                        : 'bg-rose-500/15 border-rose-500/35 text-rose-400'
                    }`}
                  >
                    {isPositive ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-xs sm:text-sm font-semibold text-white truncate">
                        {tx.description}
                      </div>
                      {(tx.purchaseSource ||
                        tx.type === 'PURCHASE' ||
                        String(tx.description || '').toLowerCase().includes('purchased') ||
                        String(tx.description || '').toLowerCase().includes('buyed by')) && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide border ${
                            tx.purchaseSource === 'API' ||
                            String(tx.description || '').includes('Buyed by API') ||
                            String(tx.description || '').includes('Outbound API')
                              ? 'bg-purple-500/15 text-purple-300 border-purple-500/35'
                              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                          }`}
                        >
                          {tx.purchaseSourceLabel ||
                            (tx.purchaseSource === 'API' ||
                            String(tx.description || '').includes('Buyed by API') ||
                            String(tx.description || '').includes('Outbound API')
                              ? 'Buy from API'
                              : 'Buy from Website')}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                      <span className={isPositive ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                        {tx.type}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{new Date(tx.createdAt).toLocaleString()}</span>
                      <span aria-hidden="true">·</span>
                      <button
                        onClick={() => copyTxnId(tx.id)}
                        className="text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1 font-mono cursor-pointer"
                        title="Copy Transaction ID"
                      >
                        <span>{tx.id}</span>
                        {copiedId === tx.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3 opacity-80" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Amount & Semantic Status */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-white/[0.05] shrink-0">
                  <div
                    className={`font-mono text-sm sm:text-base font-bold tabular-nums ${
                      isPositive ? 'text-emerald-400' : 'text-rose-300'
                    }`}
                  >
                    {isPositive ? `+₹${tx.amount.toFixed(2)}` : `-₹${Math.abs(tx.amount).toFixed(2)}`}
                  </div>

                  <div className="flex items-center gap-1 text-xs mt-0.5">
                    {tx.status === 'SUCCESS' ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed</span>
                      </span>
                    ) : tx.status === 'PENDING' ? (
                      <span className="text-amber-400 font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pending</span>
                      </span>
                    ) : (
                      <span className="text-rose-400 font-semibold flex items-center gap-1">
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
