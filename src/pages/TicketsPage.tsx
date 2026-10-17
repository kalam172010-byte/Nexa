import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  Plus,
  X,
  Send,
  MessageSquare,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { api } from '../services/api.js';
import { SupportTicket } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';

export const TicketsPage: React.FC = () => {
  const { user } = useAuth();
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
      await api.replyTicket(activeTicket.id, replyText);
      showToastSuccess('Reply sent');
      setReplyText('');
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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl sm:text-2xl bg-gradient-to-r from-white via-violet-100 to-rose-200 bg-clip-text text-transparent">
            Support Desk
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Direct technical and payment resolution center.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-violet-600 hover:from-rose-500 hover:to-violet-500 text-white text-xs font-bold shadow-[0_4px_20px_rgba(244,63,94,0.3)] transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Ticket</span>
        </button>
      </div>

      {/* Main Content */}
      {activeTicket ? (
        <div className="rounded-2xl bg-gradient-to-b from-[#131622] to-[#0e1018] border border-violet-500/25 overflow-hidden flex flex-col h-[620px] shadow-xl">
          {/* Conversation Header */}
          <div className="p-4 bg-[#0b0d14] border-b border-white/[0.08] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setActiveTicket(null)}
                className="p-2 rounded-lg bg-violet-500/15 text-violet-300 hover:text-white border border-violet-500/30 transition-colors cursor-pointer"
                aria-label="Back to ticket list"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-rose-400 font-bold">{activeTicket.id}</span>
                  <span className="text-xs sm:text-sm font-semibold text-white truncate">
                    {activeTicket.subject}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                  <span className="text-violet-300 font-medium">{activeTicket.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-300 font-medium">{activeTicket.priority} Priority</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span
                className={`text-xs font-bold flex items-center gap-1 ${
                  activeTicket.status === 'OPEN'
                    ? 'text-rose-400'
                    : activeTicket.status === 'PENDING'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {activeTicket.status === 'CLOSED' ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
                <span>{activeTicket.status}</span>
              </span>

              {activeTicket.status !== 'CLOSED' && (
                <button
                  onClick={handleCloseTicket}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Mark Resolved
                </button>
              )}
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {activeTicket.messages?.map(msg => {
              const isAdmin = msg.senderRole === 'ADMIN' || msg.senderRole === 'SUPER ADMIN';
              const isCurrentUser = msg.senderId === user?.id;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isCurrentUser && !isAdmin ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                    {isAdmin ? (
                      <span className="text-rose-400 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Support Staff</span>
                      </span>
                    ) : (
                      <span className="text-cyan-300 font-medium">@{msg.senderName}</span>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={`p-3.5 rounded-xl max-w-md text-xs leading-relaxed ${
                      isAdmin
                        ? 'bg-gradient-to-br from-rose-950/60 to-[#0c0e15] border border-rose-500/35 text-slate-100'
                        : isCurrentUser
                        ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md shadow-rose-950/50'
                        : 'bg-[#090a0f] border border-white/[0.08] text-slate-200'
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
            <form onSubmit={handleSendReply} className="p-4 bg-[#0b0d14] border-t border-white/[0.08] flex gap-2.5">
              <input
                type="text"
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Write a message..."
                className="flex-1 px-4 py-2.5 bg-[#10121a] border border-white/[0.1] rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
              />
              <button
                type="submit"
                disabled={isSendingReply || !replyText.trim()}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {isSendingReply ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          ) : (
            <div className="p-3.5 bg-[#0b0d14] border-t border-white/[0.08] text-center text-xs text-slate-400">
              This ticket is resolved. Open a new ticket if you require further assistance.
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-4 rounded-2xl bg-[#10121a] border border-white/[0.06] animate-pulse h-20" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-12 rounded-2xl bg-gradient-to-b from-[#131622] to-[#0e1018] border border-violet-500/25 text-center space-y-3 shadow-lg">
              <div className="w-12 h-12 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-400 flex items-center justify-center mx-auto">
                <LifeBuoy className="w-6 h-6" />
              </div>
              <h4 className="font-display font-bold text-base text-white">
                No Support Tickets
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Open a ticket if you need assistance with deposits, license activation, or account inquiries.
              </p>
              <button
                onClick={() => setIsCreating(true)}
                className="mt-1 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-violet-600 hover:from-rose-500 hover:to-violet-500 text-white text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Ticket</span>
              </button>
            </div>
          ) : (
            <div className="bg-gradient-to-b from-[#131622] to-[#0e1018] border border-white/[0.08] rounded-2xl divide-y divide-white/[0.06] overflow-hidden shadow-lg">
              {tickets.map(ticket => (
                <div
                  key={ticket.id}
                  onClick={() => handleOpenTicketDetails(ticket.id)}
                  className="p-4 sm:px-5 hover:bg-white/[0.03] transition-colors cursor-pointer flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-400 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-rose-400">{ticket.id}</span>
                        <h4 className="font-semibold text-xs sm:text-sm text-white truncate">{ticket.subject}</h4>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                        <span className="text-violet-300 font-medium">{ticket.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">Updated {new Date(ticket.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-xs font-bold ${
                        ticket.status === 'OPEN'
                          ? 'text-rose-400'
                          : ticket.status === 'PENDING'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {ticket.status}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Ticket Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setIsCreating(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          />

          <div className="relative w-full max-w-md bg-[#111420] border border-violet-500/30 rounded-2xl p-6 shadow-2xl z-10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <h3 className="font-display font-bold text-base bg-gradient-to-r from-white via-violet-100 to-rose-200 bg-clip-text text-transparent">
                Open Support Ticket
              </h3>
              <button
                onClick={() => setIsCreating(false)}
                className="p-1.5 rounded-lg bg-white/[0.05] text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              <div>
                <label className="text-xs font-semibold text-violet-300 block mb-1.5">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Brief summary of your issue"
                  required
                  className="w-full px-3.5 py-2.5 bg-[#090a0f] border border-white/15 rounded-xl text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-cyan-300 block mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-[#090a0f] border border-white/15 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                  >
                    {categories.map(c => (
                      <option key={c} value={c} className="bg-[#10121a]">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-amber-300 block mb-1.5">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-[#090a0f] border border-white/15 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Low" className="bg-[#10121a]">Low</option>
                    <option value="Medium" className="bg-[#10121a]">Medium</option>
                    <option value="High" className="bg-[#10121a]">High</option>
                    <option value="Urgent" className="bg-[#10121a]">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-rose-300 block mb-1.5">
                  Message Details
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Include your order reference, key code, or UTR number if applicable..."
                  required
                  className="w-full px-3.5 py-2.5 bg-[#090a0f] border border-white/15 rounded-xl text-white focus:outline-none focus:border-rose-500 resize-none leading-relaxed"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-violet-600 hover:from-rose-500 hover:to-violet-500 text-white font-bold flex items-center justify-center gap-2 cursor-pointer"
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
