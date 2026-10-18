import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught uncaught UI error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.hash = 'dashboard';
    window.location.reload();
  };

  private handleResetSession = () => {
    try {
      localStorage.removeItem('nexa_auth_token');
      localStorage.removeItem('nexa_user_data');
    } catch {}
    window.location.hash = 'dashboard';
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#08090f] text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#10121a] border border-rose-500/30 rounded-2xl p-6 sm:p-8 space-y-5 text-center shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-950/50">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="font-display font-bold text-lg text-white">Something went wrong</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                A rendering issue occurred while displaying this page. The system caught the error to protect your session.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left bg-black/50 border border-white/5 rounded-xl p-3 font-mono text-[11px] text-rose-300 overflow-x-auto max-h-32">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Page</span>
              </button>

              <button
                onClick={this.handleGoHome}
                className="w-full py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 text-xs font-semibold border border-white/10 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Return to Dashboard</span>
              </button>

              <button
                onClick={this.handleResetSession}
                className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors mt-1 cursor-pointer"
              >
                Clear Cache & Re-login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
