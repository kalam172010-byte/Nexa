import React, { useState } from 'react';
import { Send, MessageSquare, Headphones, X, ExternalLink, LifeBuoy } from 'lucide-react';

interface FloatingSupportProps {
  onOpenTickets: () => void;
}

export const FloatingSupport: React.FC<FloatingSupportProps> = ({ onOpenTickets }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-600 to-sky-400 hover:from-cyan-500 hover:to-sky-300 text-white shadow-lg shadow-cyan-500/30 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 group border border-cyan-300/30"
          aria-label="Contact Gaming Support"
        >
          {isOpen ? (
            <X className="w-5 h-5 text-white transition-transform duration-200" />
          ) : (
            <>
              {/* Telegram-style chat send icon */}
              <Send className="w-5 h-5 text-white -rotate-12 translate-x-[-1px] group-hover:translate-x-0 transition-transform" />
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-[#070709] animate-pulse" />
            </>
          )}
        </button>
      </div>

      {/* Support Popover Menu */}
      {isOpen && (
        <div className="fixed bottom-36 md:bottom-24 right-4 md:right-8 z-40 w-72 bg-[#0d0d14]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl shadow-cyan-950/40 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Headphones className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-bold text-white uppercase tracking-wider">KALAM FF HELPDESK</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              24/7 ONLINE
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {/* Telegram Channel */}
            <a
              href="https://t.me"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Send className="w-3.5 h-3.5 -rotate-12" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white group-hover:text-cyan-300">Telegram Updates</div>
                  <div className="text-[10px] text-slate-400">@NexaOfficialChannel</div>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-300" />
            </a>

            {/* WhatsApp Support */}
            <a
              href="https://whatsapp.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white group-hover:text-emerald-300">WhatsApp VIP Desk</div>
                  <div className="text-[10px] text-slate-400">Direct admin chat</div>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-300" />
            </a>

            {/* In-App Support Ticket */}
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenTickets();
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 transition-all text-left group"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <LifeBuoy className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-rose-300 group-hover:text-rose-200">Open Support Ticket</div>
                  <div className="text-[10px] text-rose-400/80">Track order or key inquiry</div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-rose-400">TICKETS &rarr;</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
