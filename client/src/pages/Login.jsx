import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Wallet,
  Lock,
  User,
  ArrowRight,
  Globe,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';

export const Login = () => {
  const { login } = useAuth();
  const { lang, toggleLanguage } = useLanguage();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      const loggedInUser = await login(identifier, password, rememberMe);
      const role = loggedInUser?.role;
      if (role === 'emi_agent') {
        try {
          window.history.pushState({}, '', '/emi');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } catch (e) {}
      } else {
        // Owner, Admin, Loan Agent go directly to main dashboard page (/)
        try {
          window.history.pushState({}, '', '/');
          window.dispatchEvent(new PopStateEvent('popstate'));
        } catch (e) {}
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #FFF7F2 0%, #FFF3EC 50%, #F5F9FD 100%)',
      }}
    >
      {/* Soft Sky-Blue & Peach Ambient Glass Orbs */}
      <div
        className="absolute -top-24 -left-24 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(186, 230, 253, 0.65) 0%, rgba(186, 230, 253, 0) 70%)',
          filter: 'blur(50px)',
        }}
      />
      <div
        className="absolute -bottom-28 -right-24 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(254, 215, 170, 0.7) 0%, rgba(254, 215, 170, 0) 70%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        className="absolute top-1/2 left-3/4 -translate-y-1/2 w-80 h-80 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(224, 242, 254, 0.5) 0%, rgba(224, 242, 254, 0) 70%)',
          filter: 'blur(45px)',
        }}
      />

      {/* Top right language toggle */}
      <div className="absolute top-4 right-4 flex items-center space-x-2 z-20">
        <button
          onClick={toggleLanguage}
          type="button"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur-md border border-orange-200/60 text-xs font-bold text-slate-700 hover:border-orange-400 hover:bg-white transition active:scale-95 shadow-sm"
        >
          <Globe className="w-3.5 h-3.5 text-orange-500" />
          <span>{lang === 'ta' ? 'English' : 'தமிழ்'}</span>
        </button>
      </div>

      {/* Main Peach + Sky Glass Card */}
      <div
        className="max-w-md w-full rounded-3xl p-6 sm:p-8 relative z-10 border space-y-5"
        style={{
          background: 'rgba(255, 255, 255, 0.78)',
          backdropFilter: 'blur(20px) saturate(140%)',
          borderColor: 'rgba(255, 255, 255, 0.95)',
          boxShadow: '0 20px 45px -12px rgba(249, 115, 22, 0.12), 0 4px 16px -2px rgba(186, 230, 253, 0.2)',
        }}
      >
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3.5 rounded-2xl bg-gradient-to-tr from-orange-400 via-amber-400 to-sky-400 shadow-lg shadow-orange-500/20 border border-white">
            <Wallet className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-800">
              VK BANKER'S & FINANCE
            </h1>
            <p className="text-xs text-orange-600 font-semibold tracking-wide mt-0.5">
              வி.கே. பேங்கர்ஸ் & பைனான்ஸ்
            </p>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {lang === 'ta'
              ? 'நிதி மற்றும் மாத தவணை மேலாண்மை - Staff & Agent Login'
              : 'Finance & Monthly EMI Management System'}
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-red-50/90 border border-red-200 text-red-700 text-xs font-semibold leading-relaxed animate-shake">
            <div className="font-bold text-red-800 flex items-center space-x-1.5 mb-0.5">
              <span>⚠️</span>
              <span>Authentication Error:</span>
            </div>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Username or Email / பயனர்பெயர்
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-3.5 text-orange-400" />
              <input
                type="text"
                required
                autoComplete="username"
                placeholder={lang === 'ta' ? 'பயனர்பெயர் அல்லது மின்னஞ்சல்' : 'Username or Email'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-10 pr-4 h-12 rounded-xl bg-white/90 border border-orange-200/80 text-slate-900 text-xs font-medium outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-300/40 transition placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Password / கடவுச்சொல்
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-orange-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-11 h-12 rounded-xl bg-white/90 border border-orange-200/80 text-slate-900 text-xs font-medium outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-300/40 transition placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-orange-500 transition"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Keep me signed in option */}
          <div className="flex items-center justify-between pt-1 pb-1">
            <label className="flex items-center space-x-2.5 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded-lg border flex items-center justify-center transition shadow-xs ${
                  rememberMe
                    ? 'bg-gradient-to-tr from-orange-500 to-amber-500 border-orange-500 text-white'
                    : 'bg-white/90 border-slate-300 group-hover:border-orange-400 text-transparent'
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition">
                  {lang === 'ta' ? 'உள்நுழைந்தே இருக்கவும்' : 'Keep me signed in'}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {lang === 'ta' ? 'அடுத்த முறை தானாக திறக்கும்' : 'Stay signed in on this device'}
                </span>
              </div>
            </label>

            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-xs">
              Secure
            </span>
          </div>

          {/* Peach Primary Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl font-bold text-sm text-white shadow-lg transition active:scale-[0.98] flex items-center justify-center space-x-2"
            style={{
              background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
              boxShadow: '0 8px 20px -4px rgba(249, 115, 22, 0.4)',
            }}
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
      </div>
    </div>
  );
};

export default Login;
