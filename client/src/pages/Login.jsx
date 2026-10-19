import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import BackgroundOrbs from '../components/common/BackgroundOrbs';
import {
  Wallet,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Globe,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Server,
  RefreshCw,
} from 'lucide-react';

export const Login = () => {
  const { login } = useAuth();
  const { t, lang, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [serverStatus, setServerStatus] = useState('checking'); // 'online' | 'offline' | 'checking'
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState(() => localStorage.getItem('fintrack_api_url') || '');

  const checkServer = async () => {
    setServerStatus('checking');
    try {
      const res = await fetch('/api/health');
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        const data = await res.json();
        if (data.status === 'online') {
          setServerStatus('online');
          return true;
        }
      }
      setServerStatus('offline');
      return false;
    } catch {
      setServerStatus('offline');
      return false;
    }
  };

  useEffect(() => {
    checkServer();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role) => {
    setError('');
    const targetEmail = role === 'owner' ? 'owner@fintrack.com' : 'agent@fintrack.com';
    const targetPass = role === 'owner' ? 'admin123' : 'agent123';
    setEmail(targetEmail);
    setPassword(targetPass);

    try {
      setLoading(true);
      await login(targetEmail, targetPass);
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Blurred Floating Sky Orbs */}
      <BackgroundOrbs />

      {/* Top right language & theme toggle */}
      <div className="absolute top-4 right-4 flex items-center space-x-2 z-20">
        <button
          onClick={toggleLanguage}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl glass border border-sky-200/60 dark:border-sky-800/60 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-sky-400 transition active:scale-95 shadow-sm"
        >
          <Globe className="w-3.5 h-3.5 text-sky-500" />
          <span>{lang === 'ta' ? 'English' : 'தமிழ்'}</span>
        </button>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl glass border border-sky-200/60 dark:border-sky-800/60 text-slate-700 dark:text-slate-200 hover:text-amber-500 transition active:scale-95 shadow-sm"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-600" />}
        </button>
      </div>

      <div className="max-w-md w-full glass rounded-3xl p-6 sm:p-8 border border-white/80 dark:border-sky-800/50 shadow-2xl space-y-5 relative z-10">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-sky-400 via-sky-500 to-sky-600 shadow-xl shadow-sky-500/25 border border-white/60">
            <Wallet className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-sky-600 to-sky-500 dark:from-sky-300 dark:to-sky-400 bg-clip-text text-transparent">
            VK BANKER'S & FINANCE
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {lang === 'ta'
              ? 'வி.கே. பேங்கர்ஸ் & பைனான்ஸ் கடன் மேலாண்மை செயலி'
              : "VK Banker's Private Finance & Lending Management"}
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-red-100/90 dark:bg-red-950/70 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold leading-relaxed">
            <div className="font-bold text-red-800 dark:text-red-200 mb-0.5">⚠️ Authentication / Connection Error:</div>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Email Address / மின்னஞ்சல்
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-sky-500" />
              <input
                type="email"
                required
                placeholder="owner@fintrack.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 h-12 rounded-2xl glass border border-sky-200/80 dark:border-sky-800/60 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-sky-400 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Password / கடவுச்சொல்
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-sky-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-11 h-12 rounded-2xl glass border border-sky-200/80 dark:border-sky-800/60 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-sky-400 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-sky-600 transition"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 btn-sky-primary text-sm font-black shadow-lg shadow-sky-500/25 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span>Signing in...</span>
            ) : (
              <>
                <span>Sign In / உள்நுழைக</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Authorized Persons (2 Authorized Credentials) */}
        <div className="pt-4 border-t border-sky-100 dark:border-sky-900/40 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
              {lang === 'ta' ? 'அங்கீகரிக்கப்பட்ட நபர்கள் (2 நபர்)' : 'Authorized Logins (2 Persons)'}
            </p>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold">
              1-Tap Fill
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Person 1: Owner */}
            <button
              type="button"
              onClick={() => handleQuickLogin('owner')}
              className="p-3 rounded-2xl glass border border-emerald-200/80 dark:border-emerald-800/60 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40 text-left transition active:scale-[0.98] group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="inline-flex items-center space-x-1 text-xs font-black text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>1. Owner</span>
                </span>
                <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded font-bold">
                  Admin
                </span>
              </div>
              <p className="text-[11px] font-mono font-medium text-slate-700 dark:text-slate-200 truncate">owner@fintrack.com</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Password: <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-black">admin123</strong>
              </p>
            </button>

            {/* Person 2: Collection Agent */}
            <button
              type="button"
              onClick={() => handleQuickLogin('agent')}
              className="p-3 rounded-2xl glass border border-sky-200/80 dark:border-sky-800/60 hover:bg-sky-50/60 dark:hover:bg-sky-950/40 text-left transition active:scale-[0.98] group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="inline-flex items-center space-x-1 text-xs font-black text-sky-700 dark:text-sky-300">
                  <UserCheck className="w-3.5 h-3.5 text-sky-500" />
                  <span>2. Agent</span>
                </span>
                <span className="text-[9px] font-mono text-sky-600 dark:text-sky-400 bg-sky-100/80 dark:bg-sky-900/40 px-1.5 py-0.5 rounded font-bold">
                  Dues
                </span>
              </div>
              <p className="text-[11px] font-mono font-medium text-slate-700 dark:text-slate-200 truncate">agent@fintrack.com</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Password: <strong className="font-mono text-sky-600 dark:text-sky-400 font-black">agent123</strong>
              </p>
            </button>
          </div>
        </div>

        {/* Server Status & Config Toggle */}
        <div className="pt-2 border-t border-sky-100/60 dark:border-sky-900/30 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center space-x-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  serverStatus === 'online'
                    ? 'bg-emerald-500 ring-2 ring-emerald-500/30'
                    : serverStatus === 'checking'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-red-500 ring-2 ring-red-500/30'
                }`}
              />
              <span className={serverStatus === 'online' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500'}>
                {serverStatus === 'online'
                  ? 'API: Online (Port 5000)'
                  : serverStatus === 'checking'
                  ? 'Checking server...'
                  : 'API: Unreachable (Offline)'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={checkServer}
                title="Refresh server status"
                className="p-1 hover:text-sky-500 transition active:scale-90"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setShowServerConfig(!showServerConfig)}
                className="text-sky-600 dark:text-sky-400 hover:underline font-bold text-[11px] flex items-center space-x-1"
              >
                <Server className="w-3 h-3" />
                <span>{showServerConfig ? 'Close' : 'Server Config'}</span>
              </button>
            </div>
          </div>

          {showServerConfig && (
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                Backend API URL (Leave blank for default <code className="font-mono text-sky-600">http://localhost:5000</code>):
              </p>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="http://localhost:5000"
                  value={customApiUrl}
                  onChange={(e) => setCustomApiUrl(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono outline-none focus:ring-2 focus:ring-sky-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customApiUrl.trim()) {
                      localStorage.setItem('fintrack_api_url', customApiUrl.trim());
                    } else {
                      localStorage.removeItem('fintrack_api_url');
                    }
                    checkServer();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-700 active:scale-95 transition"
                >
                  Save & Ping
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
