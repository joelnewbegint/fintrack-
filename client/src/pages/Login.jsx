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
  Server,
} from 'lucide-react';

export const Login = () => {
  const { login } = useAuth();
  const { lang, toggleLanguage } = useLanguage();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isWakingUp, setIsWakingUp] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsWakingUp(false);

    // If request takes longer than 4.5 seconds, notify user that backend server is spinning up (free-tier cold start)
    const wakeupTimer = setTimeout(() => {
      setIsWakingUp(true);
    }, 4500);

    try {
      setLoading(true);
      const loggedInUser = await login(identifier, password, rememberMe);
      clearTimeout(wakeupTimer);
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
      clearTimeout(wakeupTimer);
      setIsWakingUp(false);
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      clearTimeout(wakeupTimer);
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundColor: '#F4FAFF',
        backgroundImage:
          'radial-gradient(circle at 92% 8%, rgba(111, 180, 242, 0.45) 0%, transparent 45%), radial-gradient(circle at 8% 85%, rgba(142, 197, 245, 0.35) 0%, transparent 50%), linear-gradient(165deg, #F4FAFF 0%, #BFE3FA 48%, #8EC5F5 100%)',
      }}
    >
      {/* Top right language toggle */}
      <div className="absolute top-4 right-4 flex items-center space-x-2 z-20">
        <button
          onClick={toggleLanguage}
          type="button"
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-[#BFE3FA] text-xs font-bold text-ink hover:border-[#6FB4F2] hover:bg-white transition active:scale-95 shadow-ocean-sm"
        >
          <Globe className="w-3.5 h-3.5 text-[#1F6FC8]" />
          <span>{lang === 'ta' ? 'English' : 'தமிழ்'}</span>
        </button>
      </div>

      {/* Main Ocean Blue Glass Card */}
      <div className="max-w-md w-full rounded-[24px] p-6 sm:p-8 relative z-10 bg-white/75 backdrop-blur-md border border-white/95 shadow-ocean-lg space-y-5 text-ink">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3.5 rounded-2xl bg-gradient-to-br from-[#6FB4F2] to-[#8EC5F5] shadow-md shadow-[#1F6FC8]/20 border border-white text-ink">
            <Wallet className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-ink">
              VK BANKER'S & FINANCE
            </h1>
            <p className="text-xs text-[#1F6FC8] font-bold tracking-wide mt-0.5">
              வி.கே. பேங்கர்ஸ் & பைனான்ஸ்
            </p>
          </div>
          <p className="text-xs text-muted font-medium">
            {lang === 'ta'
              ? 'நிதி மற்றும் மாத தவணை மேலாண்மை - Staff & Agent Login'
              : 'Finance & Monthly EMI Management System'}
          </p>
        </div>

        {/* Cold-Start Waking Banner */}
        {isWakingUp && (
          <div className="p-3 rounded-2xl bg-[#BFE3FA]/70 border border-[#6FB4F2] text-ink text-xs font-semibold leading-relaxed flex items-center space-x-2.5 animate-pulse">
            <Server className="w-4 h-4 text-[#1F6FC8] shrink-0" />
            <span>
              {lang === 'ta'
                ? 'சர்வர் தொடங்குகிறது, ஒரு நிமிடம் காத்திருக்கவும்...'
                : 'Server waking up... please wait a moment.'}
            </span>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-[#FFD6D2] border border-[#9B2C2C]/20 text-[#9B2C2C] text-xs font-bold leading-relaxed">
            <div className="font-black flex items-center space-x-1.5 mb-0.5">
              <span>⚠️</span>
              <span>Authentication Error:</span>
            </div>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">
              Username or Email / பயனர்பெயர்
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-3.5 text-[#1F6FC8]" />
              <input
                type="text"
                required
                autoComplete="username"
                placeholder={lang === 'ta' ? 'பயனர்பெயர் அல்லது மின்னஞ்சல்' : 'Username or Email'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="input-ocean w-full pl-10 pr-4"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink mb-1.5">
              Password / கடவுச்சொல்
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-[#1F6FC8]" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-ocean w-full pl-10 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-muted hover:text-ink transition"
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
                    ? 'bg-[#6FB4F2] border-[#1F6FC8] text-ink'
                    : 'bg-white/90 border-[#BFE3FA] group-hover:border-[#6FB4F2] text-transparent'
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-ink transition">
                  {lang === 'ta' ? 'உள்நுழைந்தே இருக்கவும்' : 'Keep me signed in'}
                </span>
                <span className="text-[10px] text-muted font-medium">
                  {lang === 'ta' ? 'அடுத்த முறை தானாக திறக்கும்' : 'Stay signed in on this device'}
                </span>
              </div>
            </label>

            <span className="badge-paid px-2.5 py-0.5 rounded-full text-[10px] font-bold">
              Secure
            </span>
          </div>

          {/* Ocean Blue Primary Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-accent w-full h-12 text-sm font-bold shadow-ocean flex items-center justify-center space-x-2 active:scale-[0.98] transition cursor-pointer"
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
