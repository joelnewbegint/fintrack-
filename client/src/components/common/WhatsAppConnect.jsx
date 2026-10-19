import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import {
  Smartphone,
  CheckCircle,
  AlertCircle,
  Clock,
  RotateCcw,
  LogOut,
  Copy,
  Check,
  Send,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export const WhatsAppConnect = () => {
  const { lang } = useLanguage();

  const [status, setStatus] = useState('not_linked'); // 'not_linked' | 'waiting_code' | 'connected'
  const [phoneNumber, setPhoneNumber] = useState('919842112345');
  const [pairingCode, setPairingCode] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('வணக்கம்! FinTrack WhatsApp இணைப்பு வெற்றிகரமாக முடிந்தது.');
  const [testSending, setTestSending] = useState(false);
  const [testSuccess, setTestSuccess] = useState(null);

  // Initialize Socket.io connection for real-time code and status updates
  useEffect(() => {
    // Connect to server socket
    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('Socket.io connected to server');
    });

    socket.on('whatsapp:status', (data) => {
      console.log('WhatsApp status update:', data);
      if (data.status) setStatus(data.status);
      if (data.phoneNumber) setPhoneNumber(data.phoneNumber);
      if (data.pairingCode) setPairingCode(data.pairingCode);
      if (data.expiresAt) setExpiresAt(data.expiresAt);
    });

    socket.on('whatsapp:code', (data) => {
      console.log('WhatsApp pairing code received:', data.code);
      setPairingCode(data.code);
      setExpiresAt(data.expiresAt);
      setStatus('waiting_code');
    });

    // Also fetch initial status via REST
    api.getWhatsAppStatus().then((res) => {
      if (res.success) {
        setStatus(res.status);
        if (res.phoneNumber) setPhoneNumber(res.phoneNumber);
        if (res.pairingCode) setPairingCode(res.pairingCode);
        if (res.expiresAt) setExpiresAt(res.expiresAt);
      }
    }).catch(console.warn);

    return () => {
      socket.disconnect();
    };
  }, []);

  // Countdown timer for pairing code expiration
  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);

      // Auto-refresh code if expired
      if (remaining === 0 && pairingCode && status === 'waiting_code') {
        setPairingCode(null);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, pairingCode, status]);

  const handleGenerateCode = async (e) => {
    if (e) e.preventDefault();
    try {
      setLoading(true);
      setPairingCode(null);
      setStatus('waiting_code');
      const res = await api.generateWhatsAppCode(phoneNumber);
      if (res.pairingCode) {
        setPairingCode(res.pairingCode);
        setExpiresAt(res.expiresAt);
      }
    } catch (err) {
      alert(err.message || 'Failed to generate pairing code');
      setStatus('not_linked');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out the WhatsApp session?')) {
      try {
        setLoading(true);
        await api.logoutWhatsApp();
        setStatus('not_linked');
        setPairingCode(null);
        setExpiresAt(null);
      } catch (err) {
        alert(err.message || 'Failed to logout WhatsApp');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleReconnect = async () => {
    try {
      setLoading(true);
      await api.reconnectWhatsApp();
    } catch (err) {
      alert(err.message || 'Failed to reconnect WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!pairingCode) return;
    navigator.clipboard.writeText(pairingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendTestMessage = async (e) => {
    e.preventDefault();
    if (!testPhone) return;
    try {
      setTestSending(true);
      setTestSuccess(null);
      const res = await api.sendWhatsAppReminder({
        phone: testPhone,
        text: testMessage,
        customerName: 'Test Recipient',
        loanNo: 'TEST',
        amount: 0,
      });
      if (res.success) {
        setTestSuccess('Message sent successfully via WhatsApp Web!');
        setTimeout(() => setTestSuccess(null), 4000);
      }
    } catch (err) {
      alert(err.message || 'Failed to send test message');
    } finally {
      setTestSending(false);
    }
  };

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Format code with space in middle for easy viewing (e.g. ABCD 1234)
  const displayCode = pairingCode
    ? pairingCode.length === 8
      ? `${pairingCode.slice(0, 4)} - ${pairingCode.slice(4)}`
      : pairingCode
    : null;

  return (
    <div className="glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-md space-y-6">
      {/* Top Header & Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center space-x-2">
              <span>WhatsApp Connect</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold uppercase tracking-wider">
                Pairing Code Mode
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'ta'
                ? 'QR கோடு இன்றி போன் எண் வழியாக நேரடியாக இணைக்கவும்'
                : 'Connect without QR code using phone number pairing code'}
            </p>
          </div>
        </div>

        {/* Status Indicator Badge */}
        <div className="flex items-center space-x-2">
          {status === 'connected' ? (
            <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Connected / இணைக்கப்பட்டுள்ளது</span>
            </div>
          ) : status === 'waiting_code' ? (
            <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-extrabold shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              <span>Waiting for Code / குறியீட்டை உள்ளிடவும்</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span>Not Linked / இணைக்கப்படவில்லை</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {status === 'connected' ? (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="font-extrabold text-sm text-slate-900 dark:text-white">
                  WhatsApp Session Active & Connected
                </p>
                <p className="text-xs text-slate-500 font-mono">
                  Linked Phone: +{phoneNumber} • Session cached in .wwebjs_auth
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleReconnect}
                disabled={loading}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition active:scale-95 flex items-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                <span>Reconnect</span>
              </button>

              <button
                onClick={handleLogout}
                disabled={loading}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-500/20 transition active:scale-95 flex items-center space-x-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout Session</span>
              </button>
            </div>
          </div>

          {/* Quick Test Message Form */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
              <Send className="w-3.5 h-3.5 text-emerald-600" />
              <span>Send Test Message / நேரடி சோதனை செய்தி</span>
            </h4>

            {testSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                {testSuccess}
              </div>
            )}

            <form onSubmit={handleSendTestMessage} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="tel"
                required
                placeholder="Mobile Number (e.g. 9842100000)"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono outline-none"
              />

              <input
                type="text"
                required
                placeholder="Message text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none"
              />

              <button
                type="submit"
                disabled={testSending}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition active:scale-95 flex items-center justify-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{testSending ? 'Sending...' : 'Send WhatsApp'}</span>
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Phone Input & Pairing Code Display */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Financier WhatsApp Mobile Number (Country code without +)
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  required
                  placeholder="919842112345"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1 p-3 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono font-bold text-sm outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleGenerateCode}
                  disabled={loading}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition active:scale-95 flex items-center space-x-1.5"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>{loading ? 'Generating...' : 'Generate Pairing Code'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Default: <code className="font-mono text-emerald-600 font-bold">WHATSAPP_NUMBER</code> in server/.env
              </p>
            </div>

            {/* Huge Pairing Code Display Card */}
            {pairingCode ? (
              <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-800/90 dark:to-slate-900 border-2 border-emerald-500 shadow-xl space-y-4 text-center">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    Your 8-Character Pairing Code
                  </span>
                  <div className="flex items-center space-x-1 text-slate-500 font-mono font-bold">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Expires in {formatTimer(timeLeft)}</span>
                  </div>
                </div>

                {/* The Code */}
                <div className="py-3 px-4 rounded-2xl bg-white dark:bg-slate-950 border border-emerald-300 dark:border-emerald-700/60 shadow-inner">
                  <span className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-emerald-600 dark:text-emerald-400 select-all">
                    {displayCode}
                  </span>
                </div>

                <div className="flex items-center justify-center space-x-3">
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center space-x-1.5 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Code Copied!' : 'Copy Code'}</span>
                  </button>

                  <button
                    onClick={handleGenerateCode}
                    className="py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-xs text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition"
                  >
                    Get New Code
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
                <Smartphone className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  No active pairing code.
                </p>
                <p className="text-[11px] text-slate-400">
                  Enter your WhatsApp phone number above and click <strong>"Generate Pairing Code"</strong>.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Step-by-Step Instructions */}
          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-3.5">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>How to Link Your WhatsApp / இணைக்கும் வழிமுறைகள்</span>
            </h4>

            <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  1
                </span>
                <p>
                  Open <strong>WhatsApp</strong> on your mobile phone.
                </p>
              </div>

              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  2
                </span>
                <p>
                  Tap <strong>Menu (⋮)</strong> or <strong>Settings</strong> &gt; tap <strong>Linked Devices</strong>.
                </p>
              </div>

              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  3
                </span>
                <p>
                  Tap the green <strong>"Link a Device"</strong> button.
                </p>
              </div>

              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  4
                </span>
                <p className="bg-amber-100/70 dark:bg-amber-950/60 p-2 rounded-xl text-amber-900 dark:text-amber-200 font-semibold border border-amber-300/40">
                  👉 At the bottom of the QR scanner screen, tap <strong>"Link with phone number instead"</strong>.
                </p>
              </div>

              <div className="flex items-start space-x-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                  5
                </span>
                <p>
                  Enter the <strong>8-character pairing code</strong> generated on this screen.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-500">
              💡 <strong>Session Persistence:</strong> Once linked, your session is saved in <code className="font-mono text-emerald-600">/server/.wwebjs_auth</code>. You will remain connected even when restarting the server.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppConnect;
