import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import {
  Cloud,
  CloudOff,
  CloudRain,
  Database,
  Server,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Download,
  Upload,
  ExternalLink,
  Laptop,
  Smartphone,
  Share2,
  Check,
  Copy,
  Zap,
  Globe,
} from 'lucide-react';

export const CloudSyncSection = () => {
  const { lang } = useLanguage();

  const [apiUrl, setApiUrl] = useState('');
  const [healthStatus, setHealthStatus] = useState(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [counts, setCounts] = useState({ customers: 0, loans: 0, payments: 0 });

  // Backup / Restore states
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(null);
  const [copiedBackup, setCopiedBackup] = useState(false);

  // Initialize active URL and check status
  useEffect(() => {
    const current = api.getApiBaseUrl();
    setApiUrl(current || '');
    setCounts(api.getLocalCounts());
    performHealthCheck(current);
  }, []);

  const performHealthCheck = async (targetUrl) => {
    try {
      setChecking(true);
      const res = await api.checkBackendHealth(targetUrl);
      setHealthStatus(res);
    } catch (e) {
      setHealthStatus({ online: false, reason: e.message });
    } finally {
      setChecking(false);
    }
  };

  const handleSaveUrl = async (e) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      api.setApiBaseUrl(apiUrl);
      await performHealthCheck(apiUrl);
    } finally {
      setSaving(false);
    }
  };

  const handleResetToLocal = async () => {
    setApiUrl('');
    api.setApiBaseUrl('');
    await performHealthCheck('');
  };

  const handleSyncToCloud = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      const res = await api.syncLocalDataToCloud();
      setSyncResult({
        success: true,
        message: `Successfully uploaded ${res.synced?.customers || 0} customers, ${res.synced?.loans || 0} loans, and ${res.synced?.payments || 0} payments to MongoDB Atlas!`,
      });
      setCounts(api.getLocalCounts());
    } catch (err) {
      setSyncResult({
        success: false,
        message: err.message || 'Sync to cloud failed',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const blob = await api.downloadBackup();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VK_Bankers_FullBackup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download backup: ' + err.message);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setImporting(true);
        const text = evt.target.result;
        const res = await api.restoreBackup(text);
        setImportSuccess(
          `Backup restored successfully! Loaded ${res.imported?.customers || 0} customers, ${res.imported?.loans || 0} loans, ${res.imported?.payments || 0} payments.`
        );
        setCounts(api.getLocalCounts());
        setTimeout(() => window.location.reload(), 1500);
      } catch (err) {
        alert('Could not restore backup file: ' + err.message);
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
  };

  const isOnline = healthStatus?.online;

  return (
    <div className="space-y-6">
      
      {/* 1. Master Cloud Connection Status Card */}
      <div
        className={`glass-card rounded-3xl p-6 border transition-all shadow-md ${
          isOnline
            ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent'
            : 'border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg ${
                isOnline
                  ? 'bg-emerald-600 shadow-emerald-500/25'
                  : 'bg-amber-600 shadow-amber-500/25'
              }`}
            >
              {isOnline ? <Database className="w-6 h-6" /> : <CloudOff className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                  {isOnline
                    ? 'Cloud Database Connected (MongoDB Atlas)'
                    : 'Local Device Storage Mode (ஒரே சாதனத்தில் மட்டும்)'}
                </h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                    isOnline
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                  }`}
                >
                  {isOnline ? 'Multi-Device Sync Active' : 'Single Device Only'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                {isOnline
                  ? `இணைக்கப்பட்டுள்ளது: ${healthStatus?.url} • தாமதம்: ${healthStatus?.latency || 0}ms • அனைத்து சாதனங்களிலும் ஒரே நேரத்தில் தரவு தெரியும்.`
                  : 'தற்போது இந்த போன்/உலாவியில் மட்டுமே தரவு சேமிக்கப்படுகிறது. பிற சாதனங்களில் தரவு தெரிய கீழே உள்ள Cloud Server-ஐ இணைக்கவும்.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => performHealthCheck(apiUrl)}
            disabled={checking}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 active:scale-95 transition flex items-center justify-center space-x-1.5 self-start sm:self-auto shrink-0 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-500 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Checking...' : 'Refresh Status'}</span>
          </button>
        </div>

        {/* Diagnostic details */}
        {healthStatus && (
          <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800 text-[11px] font-mono grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-600 dark:text-slate-400">
            <div>
              Status:{' '}
              <strong className={isOnline ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                {isOnline ? 'ONLINE (MongoDB Atlas)' : 'OFFLINE / LOCAL'}
              </strong>
            </div>
            <div className="truncate">
              Target URL:{' '}
              <strong>{apiUrl || '(Local Storage / Offline)'}</strong>
            </div>
            <div>
              Latency: <strong>{healthStatus.latency ? `${healthStatus.latency}ms` : '-'}</strong>
            </div>
          </div>
        )}
      </div>

      {/* 2. Configure Backend Server URL */}
      <div className="glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-md space-y-4">
        <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Server className="w-5 h-5 text-sky-500" />
          <div>
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Backend Cloud Server Connection (சர்வர் முகவரி)
            </h4>
            <p className="text-[11px] text-slate-500">
              Enter your live cloud backend URL to sync all mobile phones, tablets, and laptops to MongoDB Atlas.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveUrl} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Backend Server URL (e.g. Render, Railway, or local IP)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://fintrack-backend.onrender.com or http://localhost:5000"
                className="flex-1 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-sky-500"
              />

              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => performHealthCheck(apiUrl)}
                  disabled={checking}
                  className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition active:scale-95"
                >
                  Test Connection
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-black text-xs shadow-md shadow-sky-500/25 transition active:scale-95"
                >
                  {saving ? 'Saving...' : 'Save & Connect'}
                </button>
              </div>
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Quick Presets:</span>
            <button
              type="button"
              onClick={() => setApiUrl('http://localhost:5000')}
              className="px-2.5 py-1 rounded-lg glass border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 hover:border-sky-400"
            >
              http://localhost:5000 (Local PC)
            </button>

            <button
              type="button"
              onClick={handleResetToLocal}
              className="px-2.5 py-1 rounded-lg glass border border-amber-200 dark:border-amber-800 text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-50"
            >
              Reset to Local Storage Only
            </button>
          </div>
        </form>
      </div>

      {/* 3. Free 1-Click Render Cloud Deployment Box */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/30 dark:border-indigo-500/20 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Free Permanent Cloud Backend (Render 1-Click)
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                கணினியை ஆன் செய்து வைத்திருக்காமல் 24 மணி நேரமும் அனைத்து போன், டேப்லெட், லேப்டாப்பில் தரவு தெரிய Render-ல் இலவசமாக ஹோஸ்ட் செய்யலாம்.
              </p>
            </div>
          </div>

          <a
            href="https://render.com/deploy?repo=https://github.com/joelnewbegint/fintrack-"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-black shadow-lg shadow-indigo-500/25 active:scale-95 transition flex items-center justify-center space-x-1.5 shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>1-Click Deploy to Render</span>
          </a>
        </div>

        <div className="p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-indigo-200/60 dark:border-indigo-800/40 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
          <p>
            <strong>எளிய வழிமுறை:</strong> மேலே உள்ள பட்டனை கிளிக் செய்யவும் → Render-ல் உங்கள் GitHub-ஐ லாகின் செய்யவும் → <strong>"Apply"</strong> கொடுத்தால் 2 நிமிடத்தில் உங்கள் சர்வர் தயாராகிவிடும்.
          </p>
          <p>
            அதில் வரும் URL-ஐ (e.g. <code className="font-mono text-indigo-600 font-bold">https://fintrack-backend.onrender.com</code>) உங்கள் அனைத்து போன் & உலாவிகளிலும் உள்ளிட்டால் போதுமானது!
          </p>
        </div>
      </div>

      {/* 4. Local to Cloud Data Push */}
      {isOnline && (
        <div className="glass-card rounded-3xl p-6 border border-emerald-300/80 dark:border-emerald-700/60 shadow-md space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center space-x-1.5">
                <Cloud className="w-4 h-4 text-emerald-600" />
                <span>Push Local Records to MongoDB Atlas (கிளவுடில் பதிவேற்ற)</span>
              </h4>
              <p className="text-xs text-slate-500">
                You have {counts.customers} customers and {counts.loans} loans stored locally. Click to push any un-synced records directly to MongoDB Atlas.
              </p>
            </div>

            <button
              onClick={handleSyncToCloud}
              disabled={syncing}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition flex items-center justify-center space-x-1.5 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Uploading...' : 'Sync All to Cloud'}</span>
            </button>
          </div>

          {syncResult && (
            <div
              className={`p-3 rounded-xl text-xs font-bold ${
                syncResult.success
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                  : 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300'
              }`}
            >
              {syncResult.message}
            </div>
          )}
        </div>
      )}

      {/* 5. Zero-Loss Cross-Device Backup & Restore (Universal) */}
      <div className="glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-md space-y-4">
        <div className="flex items-center space-x-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Download className="w-5 h-5 text-emerald-600" />
          <div>
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Instant Cross-Device Backup & Transfer (முழு தரவு பேக்அப் & மீட்டல்)
            </h4>
            <p className="text-[11px] text-slate-500">
              Download your full database file and open/restore it on any other phone, tablet, or PC with zero data loss.
            </p>
          </div>
        </div>

        {importSuccess && (
          <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{importSuccess}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Download Backup */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2.5">
            <p className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
              1. Download Backup File (.json)
            </p>
            <p className="text-[11px] text-slate-500">
              Exports all {counts.customers} customers, {counts.loans} loans, {counts.payments} payment receipts, and settings.
            </p>
            <button
              onClick={handleDownloadBackup}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition flex items-center justify-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Full Backup (JSON)</span>
            </button>
          </div>

          {/* Restore / Import on This Device */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2.5">
            <p className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
              2. Restore Backup on This Device
            </p>
            <p className="text-[11px] text-slate-500">
              Select the downloaded backup file to load all records into this device immediately.
            </p>
            <label className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-sky-400 dark:border-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-bold text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95 text-center">
              <Upload className="w-3.5 h-3.5 text-sky-500" />
              <span>{importing ? 'Restoring...' : 'Upload & Restore Backup (.json)'}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                disabled={importing}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

    </div>
  );
};

export default CloudSyncSection;

