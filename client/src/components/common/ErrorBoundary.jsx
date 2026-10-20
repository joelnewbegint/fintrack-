import React from 'react';
import { ArrowRight, RefreshCw, AlertTriangle, ShieldAlert } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('FinTrack UI ErrorBoundary caught error:', error, errorInfo);
  }

  handleTryAgain = () => {
    this.setState({ hasError: false, error: null });
  };

  handleResetAndLogin = () => {
    try {
      localStorage.removeItem('fintrack_token');
      localStorage.removeItem('fintrack_user');
      localStorage.removeItem('fintrack_dismissed_notifs');
      sessionStorage.clear();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (let registration of registrations) {
            registration.unregister();
          }
        });
      }
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
    } catch (e) {
      // ignore
    }
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-900 text-white font-sans">
          <div className="max-w-md w-full bg-slate-800/95 backdrop-blur-xl border border-sky-500/30 rounded-3xl p-6 sm:p-8 text-center shadow-2xl animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-amber-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-sky-500/25">
              <img src="/icon-192.png" alt="VK Banker's" className="w-10 h-10 object-contain rounded-xl" />
            </div>

            <h2 className="text-lg font-black text-white tracking-tight">
              VK BANKER'S & FINANCE
            </h2>
            <p className="text-xs text-sky-400 font-semibold mt-0.5">
              வி.கே. பேங்கர்ஸ் & பைனான்ஸ்
            </p>

            <div className="my-5 p-3.5 rounded-2xl bg-slate-900/70 border border-slate-700/60 text-left flex items-start space-x-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-200">
                  புதுப்பித்தல் தேவை / Update Ready
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Click below to open the main pages directly or refresh your session.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {/* Primary: Continue to Main Pages */}
              <button
                type="button"
                onClick={this.handleTryAgain}
                className="w-full h-12 btn-sky-primary text-xs font-black shadow-lg shadow-sky-500/25 flex items-center justify-center space-x-2 active:scale-95 transition"
              >
                <span>Go to Main Pages / முகப்பு பக்கத்திற்கு செல்க</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Secondary: Reset & Clean Login */}
              <button
                type="button"
                onClick={this.handleResetAndLogin}
                className="w-full h-11 rounded-2xl glass border border-slate-700 hover:bg-slate-700/50 text-slate-300 text-xs font-bold flex items-center justify-center space-x-2 active:scale-95 transition"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>Reset & Login Fresh / மீண்டும் உள்நுழைக</span>
              </button>
            </div>

            {this.state.error && (
              <details className="mt-4 text-left border-t border-slate-700/50 pt-3">
                <summary className="text-[10px] text-slate-500 cursor-pointer hover:underline font-mono">
                  Error Details: {this.state.error.message || 'Click for stack'}
                </summary>
                <pre className="mt-1.5 p-2 bg-black/60 rounded-xl text-[9px] text-red-300 font-mono overflow-x-auto max-h-24 whitespace-pre-wrap">
                  {this.state.error.stack || this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
