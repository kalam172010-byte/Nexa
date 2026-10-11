import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  Plus,
  X,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ChevronRight,
  ShieldCheck,
  User,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api.js';
import { SupportTicket, SupportMessage } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';

export const TicketsPage: React.FC = () => {
  const { user, role } = useAuth();
  const { success: showToastSuccess, error: showToastError } = useToast();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // New ticket form
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportTicket['category']>('Key');
  const [priority, setPriority] = useState<SupportTicket['priority']>('Medium');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const res = await api.getTickets();
      if (res?.tickets) {
        setTickets(res.tickets);
      }
    } catch (err: any) {
      showToastError('Failed to load tickets', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleOpenTicketDetails = async (ticketId: string) => {
    try {
      const res = await api.getTicket(ticketId);
      if (res?.ticket) {
        setActiveTicket(res.ticket);
      }
    } catch (err: any) {
      showToastError('Failed to open ticket', err.message);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      showToastError('Required Fields', 'Subject and message are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createTicket({ subject, category, message, priority });
      showToastSuccess('Ticket Created', 'Our support team will respond shortly.');
      setIsCreating(false);
      setSubject('');
      setMessage('');
      fetchTickets();
      if (res?.ticket) {
        setActiveTicket(res.ticket);
      }
    } catch (err: any) {
      showToastError('Creation Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !replyText.trim()) return;

    setIsSendingReply(true);
    try {
      const res = await api.replyTicket(activeTicket.id, replyText);
      showToastSuccess('Reply sent');
      setReplyText('');
      // Reload ticket messages
      handleOpenTicketDetails(activeTicket.id);
      fetchTickets();
    } catch (err: any) {
      showToastError('Reply Failed', err.message);
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!activeTicket) return;
    try {
      await api.closeTicket(activeTicket.id);
      showToastSuccess('Ticket Closed');
      handleOpenTicketDetails(activeTicket.id);
      fetchTickets();
    } catch (err: any) {
      showToastError('Failed to close ticket', err.message);
    }
  };

  const categories: SupportTicket['category'][] = [
    'Payment',
    'Purchase',
    'Key',
    'Account',
    'Technical',
    'Other',
  ];

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-black text-xl sm:text-2xl text-white uppercase tracking-wider">
            SUPPORT CENTER
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            24/7 technical and payment resolution desk. Average response time: 5 minutes.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-95 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-rose-950/40 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>NEW TICKET</span>
        </button>
      </div>

      {/* Main Content: Tickets list OR Chat Conversation View */}
      {activeTicket ? (
        /* Chat-Style Conversation UI */
        <div className="rounded-3xl bg-[#0d0d14] border border-white/5 overflow-hidden shadow-2xl flex flex-col h-[650px]">
          {/* Conversation Header */}
          <div className="p-4 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTicket(null)}
                className="p-1.5 rounded-lg bg-white/[0.04] text-slate-400 hover:text-white transition-colors"
              >
                &larr;
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-rose-400 font-bold">{activeTicket.id}</span>
                  <span className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-md">
                    {activeTicket.subject}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Category: {activeTicket.category} · Priority: {activeTicket.priority}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                  activeTicket.status === 'OPEN'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    : activeTicket.status === 'PENDING'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {activeTicket.status}
              </span>

              {activeTicket.status !== 'CLOSED' && (
                <button
                  onClick={handleCloseTicket}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-rose-500/15 text-slate-400 hover:text-rose-300 text-[10px] font-mono border border-white/5 transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {activeTicket.messages?.map(msg => {
              const isAdmin = msg.senderRole === 'ADMIN' || msg.senderRole === 'SUPER ADMIN';
              const isCurrentUser = msg.senderId === user?.id;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isCurrentUser && !isAdmin ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mb-1">
                    {isAdmin ? (
                      <span className="text-rose-400 font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        NEXA SUPPORT
                      </span>
                    ) : (
                      <span>@{msg.senderName}</span>
                    )}
                    <span>·</span>
                    <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl max-w-md text-xs leading-relaxed ${
                      isAdmin
                        ? 'bg-rose-950/30 border border-rose-500/30 text-rose-100'
                        : isCurrentUser
                        ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg shadow-rose-950/30'
                        : 'bg-white/[0.05] border border-white/10 text-slate-200'
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reply Form */}
          {activeTicket.status !== 'CLOSED' ? (
            <form onSubmit={handleSendReply} className="p-3 sm:p-4 bg-white/[0.02] border-t border-white/5 flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Type your reply to support..."
                className="flex-1 px-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                disabled={isSendingReply || !replyText.trim()}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
              >
                {isSendingReply ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          ) : (
            <div className="p-3 bg-white/[0.02] border-t border-white/5 text-center text-xs text-slate-500 font-mono">
              This ticket is closed. You can open a new ticket if you need further help.
            </div>
          )}
        </div>
      ) : (
        /* Tickets Overview List */
        <div className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-4 rounded-2xl bg-[#0d0d14] border border-white/5 animate-pulse h-20" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-12 rounded-3xl bg-[#0d0d14] border border-white/5 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.03] text-slate-500 flex items-center justify-center mx-auto">
                <LifeBuoy className="w-6 h-6" />
              </div>
              <h4 className="font-display font-bold text-base text-white uppercase tracking-wider">
                NO TICKETS
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Create a ticket if you need help with payments, key activation, or account questions.
              </p>
              <button
                onClick={() => setIsCreating(true)}
                className="mt-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-2 shadow-lg shadow-rose-950/40"
              >
                <Plus className="w-4 h-4" />
                <span>Open First Ticket</span>
              </button>
            </div>
          ) : (
            tickets.map(ticket => (
              <div
                key={ticket.id}
                onClick={() => handleOpenTicketDetails(ticket.id)}
                className="p-4 sm:p-5 rounded-2xl bg-[#0d0d14] border border-white/5 hover:border-rose-500/30 transition-all cursor-pointer flex items-center justify-between gap-4 group shadow-lg"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-rose-400">{ticket.id}</span>
                      <h4 className="font-bold text-sm text-white truncate">{ticket.subject}</h4>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                      <span>Category: {ticket.category}</span>
                      <span>·</span>
                      <span>Updated: {new Date(ticket.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border uppercase ${
                      ticket.status === 'OPEN'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : ticket.status === 'PENDING'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {ticket.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 transition-colors" />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* New Ticket Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setIsCreating(false)}
            className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
          />

          <div className="relative w-full max-w-md bg-[#0d0d14] border border-white/10 rounded-2xl p-5 shadow-2xl z-10 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="font-display font-bold text-sm text-white uppercase">OPEN SUPPORT TICKET</h3>
              </div>
              <button
                onClick={() => setIsCreating(false)}
                className="p-1 rounded-lg bg-white/[0.04] text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  SUBJECT
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="e.g. Issue activating Free Fire panel on Android 14"
                  required
                  className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    CATEGORY
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white focus:outline-none focus:border-rose-500"
                  >
                    {categories.map(c => (
                      <option key={c} value={c} className="bg-[#0d0d14]">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    PRIORITY
                  </label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="Low" className="bg-[#0d0d14]">Low</option>
                    <option value="Medium" className="bg-[#0d0d14]">Medium</option>
                    <option value="High" className="bg-[#0d0d14]">High</option>
                    <option value="Urgent" className="bg-[#0d0d14]">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  MESSAGE
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Describe your issue with order number, key code, or transaction details..."
                  required
                  className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white focus:outline-none focus:border-rose-500 resize-none leading-relaxed"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-white/[0.04] text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40"
                >
                  {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Submit Ticket</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
