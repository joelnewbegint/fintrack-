import React, { useState, useEffect, useCallback } from 'react';
import { WifiOff, RefreshCw, ShieldAlert } from 'lucide-react';

export const OnlineOnlyGate = ({ children }) => {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine !== false : true
  );
  const [checking, setChecking] = useState(false);

  const verifyConnectivity = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setIsOnline(false);
      return false;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      try {
        controller.abort(new Error('Connectivity check timed out'));
      } catch {
        controller.abort();
      }
    }, 5000);

    try {
      const res = await fetch(`/manifest.webmanifest?online_check=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });
      const ok = Boolean(res && res.ok);
      setIsOnline(ok);
      return ok;
    } catch {
      setIsOnline(false);
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    verifyConnectivity();

    const handleOffline = () => setIsOnline(false);
    const handleOnline = () => verifyConnectivity();
    const handleResume = () => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setIsOnline(false);
      } else {
        verifyConnectivity();
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    window.addEventListener('focus', handleResume);
    window.addEventListener('pageshow', handleResume);
    document.addEventListener('visibilitychange', handleResume);

    const pollId = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setIsOnline(false);
      } else if (!isOnline) {
        verifyConnectivity();
      }
    }, 8000);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('focus', handleResume);
      window.removeEventListener('pageshow', handleResume);
      document.removeEventListener('visibilitychange', handleResume);
      clearInterval(pollId);
    };
  }, [verifyConnectivity, isOnline]);

  const handleManualRetry = async () => {
    setChecking(true);
    try {
      await verifyConnectivity();
    } finally {
      setChecking(false);
    }
  };

  if (!isOnline) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          backgroundColor: '#F3F9FF',
          backgroundImage:
            'radial-gradient(circle at 90% 10%, rgba(85, 184, 245, 0.42) 0%, transparent 45%), linear-gradient(165deg, #F3F9FF 0%, #EAF5FF 48%, #D5E9FA 100%)',
        }}
      >
        <div className="max-w-md w-full rounded-[24px] p-7 sm:p-8 bg-white/90 backdrop-blur-xl border border-[#D5E9FA] shadow-2xl text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
            <WifiOff className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-[#183653] tracking-tight">
              VK BANKER'S &amp; FINANCE
            </h1>
            <p className="text-xs font-extrabold text-rose-600 uppercase tracking-wider flex items-center justify-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Internet Connection Required / இணைய இணைப்பு தேவை</span>
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F3F9FF] border border-[#D5E9FA] space-y-2 text-xs leading-relaxed">
            <p className="font-bold text-[#183653]">
              This app cannot be opened or used offline. Please turn on mobile data or Wi-Fi and try again.
            </p>
            <p className="font-semibold text-[#0878D1]">
              இணைய இணைப்பு இல்லாமல் இந்த செயலியை திறக்கவோ பயன்படுத்தவோ முடியாது. இணையத்தை இயக்கி மீண்டும் முயற்சிக்கவும்.
            </p>
          </div>

          <button
            type="button"
            onClick={handleManualRetry}
            disabled={checking}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-[#0878D1] to-[#064B8E] hover:brightness-105 text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            <span>
              {checking
                ? 'Checking connection... / இணைப்பை சரிபார்க்கிறது...'
                : 'Retry Connection / மீண்டும் முயற்சி'}
            </span>
          </button>
        </div>
      </div>
    );
  }

  return children;
};

export default OnlineOnlyGate;

