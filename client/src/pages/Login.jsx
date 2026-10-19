import React, { useState } from 'react';
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
} from 'lucide-react';

export const Login = () => {
  const { login } = useAuth();
  const { t, lang, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleQuickLogin = (role) => {
    if (role === 'owner') {
      setEmail('owner@fintrack.com');
      setPassword('admin123');
    } else {
      setEmail('agent@fintrack.com');
      setPassword('agent123');
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

      <div className="max-w-md w-full glass rounded-3xl p-8 border border-white/80 dark:border-sky-800/50 shadow-2xl space-y-6 relative z-10">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-sky-400 via-sky-500 to-sky-600 shadow-xl shadow-sky-500/25 border border-white/60">
            <Wallet className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-sky-600 to-sky-500 dark:from-sky-300 dark:to-sky-400 bg-clip-text text-transparent">
            FinTrack
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {lang === 'ta'
              ? 'தமிழ்நாடு தவணை நிதி மேலாண்மை செயலி'
              : 'Private Lending & Microfinance Management'}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs text-center font-bold">
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
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 h-12 rounded-2xl glass border border-sky-200/80 dark:border-sky-800/60 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-sky-400 transition"
              />
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

        {/* 1-Tap Quick Test Login Helper */}
        <div className="pt-4 border-t border-sky-100 dark:border-sky-900/40 space-y-2.5">
          <p className="text-[11px] text-slate-400 font-bold text-center uppercase tracking-wider">
            {t('quickFill')}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('owner')}
              className="py-2.5 px-3 min-h-[44px] rounded-xl glass border border-sky-200/60 dark:border-sky-800/60 hover:bg-sky-50 text-xs font-bold flex items-center justify-center space-x-1.5 transition active:scale-95 text-slate-800 dark:text-slate-200"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Owner (உரிமையாளர்)</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('agent')}
              className="py-2.5 px-3 min-h-[44px] rounded-xl glass border border-sky-200/60 dark:border-sky-800/60 hover:bg-sky-50 text-xs font-bold flex items-center justify-center space-x-1.5 transition active:scale-95 text-slate-800 dark:text-slate-200"
            >
              <UserCheck className="w-4 h-4 text-sky-500" />
              <span>Agent (முகவர்)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
