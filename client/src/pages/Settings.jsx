import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { formatDate } from '../utils/currency';
import WhatsAppConnect from '../components/common/WhatsAppConnect';
import ComfortSettings from '../components/common/ComfortSettings';
import {
  Settings as SettingsIcon,
  Shield,
  Download,
  Save,
  Globe,
  Moon,
  Sun,
  FileText,
  UserCheck,
  CheckCircle,
  Smartphone,
  Building,
  Sliders,
} from 'lucide-react';

export const Settings = () => {
  const { t, lang, toggleLanguage } = useLanguage();
  const { isOwner, user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [activeSection, setActiveSection] = useState('whatsapp');

  const [settings, setSettings] = useState({
    businessName: "VK BANKER'S & FINANCE",
    businessNameTamil: 'வி.கே. பேங்கர்ஸ் & பைனான்ஸ்',
    ownerName: 'K. Subramanian',
    phone: '+91 98421 12345',
    address: '45, Cross Cut Road, Gandhipuram, Coimbatore - 641012',
    defaultPenaltyPercent: 2,
    graceDays: 1,
    defaultLanguage: 'ta',
  });

  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const fetchSettingsAndLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getSettings();
      if (res.success && res.settings) {
        setSettings(res.settings);
      }

      if (isOwner) {
        const logsRes = await api.getAuditLogs();
        if (logsRes.success) {
          setAuditLogs(logsRes.logs || []);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndLogs();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res = await api.updateSettings(settings);
      if (res.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      alert(err.message || 'Failed to update settings');
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const blob = await api.downloadBackup();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FinTrack_FullBackup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Failed to download backup');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {t('settings')} / அமைப்புகள் & நிர்வாகம்
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configure business details, late penalty rules, backups, and audit history
        </p>
      </div>

      {/* Section Tabs */}
      {isOwner && (
        <div className="flex flex-wrap gap-2 pb-1">
          <button
            onClick={() => setActiveSection('appearance')}
            className={`flex items-center space-x-2 h-11 px-4 rounded-xl text-xs font-bold transition shadow-sm active:scale-95 ${
              activeSection === 'appearance'
                ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-sky-500/25 ring-2 ring-sky-400/40'
                : 'glass text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-sky-100/60 dark:border-sky-900/40'
            }`}
          >
            <Sliders className="w-4 h-4 text-sky-400" />
            <span>Appearance & Comfort (பார்வை & வசதிகள்)</span>
          </button>

          <button
            onClick={() => setActiveSection('whatsapp')}
            className={`flex items-center space-x-2 h-11 px-4 rounded-xl text-xs font-bold transition shadow-sm active:scale-95 ${
              activeSection === 'whatsapp'
                ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-sky-500/25 ring-2 ring-sky-400/40'
                : 'glass text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-sky-100/60 dark:border-sky-900/40'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-500" />
            <span>WhatsApp Connect (வாட்ஸ்அப்)</span>
          </button>

          <button
            onClick={() => setActiveSection('business')}
            className={`flex items-center space-x-2 h-11 px-4 rounded-xl text-xs font-bold transition shadow-sm active:scale-95 ${
              activeSection === 'business'
                ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-sky-500/25 ring-2 ring-sky-400/40'
                : 'glass text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-sky-100/60 dark:border-sky-900/40'
            }`}
          >
            <Building className="w-4 h-4 text-sky-500" />
            <span>Business Profile (நிறுவன விவரங்கள்)</span>
          </button>

          <button
            onClick={() => setActiveSection('audit')}
            className={`flex items-center space-x-2 h-11 px-4 rounded-xl text-xs font-bold transition shadow-sm active:scale-95 ${
              activeSection === 'audit'
                ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-sky-500/25 ring-2 ring-sky-400/40'
                : 'glass text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-sky-100/60 dark:border-sky-900/40'
            }`}
          >
            <Shield className="w-4 h-4 text-indigo-400" />
            <span>Audit Trail & Backup (தணிக்கை & பேக்அப்)</span>
          </button>
        </div>
      )}

      {/* 0. Appearance & Comfort Tab */}
      {activeSection === 'appearance' && <ComfortSettings />}

      {/* 1. WhatsApp Connect Tab */}
      {activeSection === 'whatsapp' && <WhatsAppConnect />}

      {/* 2. Business Profile Tab */}
      {activeSection === 'business' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Business Settings Form */}
          <div className="lg:col-span-2 glass-card rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-md space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Business Profile / நிறுவன விவரங்கள்
              </h3>
              {savedSuccess && (
                <span className="flex items-center space-x-1 text-emerald-600 font-bold text-xs">
                  <CheckCircle className="w-4 h-4" />
                  <span>Saved successfully!</span>
                </span>
              )}
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Business Name (English)
                  </label>
                  <input
                    type="text"
                    disabled={!isOwner}
                    value={settings.businessName}
                    onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    நிறுவன பெயர் (Tamil)
                  </label>
                  <input
                    type="text"
                    disabled={!isOwner}
                    value={settings.businessNameTamil}
                    onChange={(e) => setSettings({ ...settings, businessNameTamil: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Financier / Owner Name
                  </label>
                  <input
                    type="text"
                    disabled={!isOwner}
                    value={settings.ownerName}
                    onChange={(e) => setSettings({ ...settings, ownerName: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Official Phone / Mobile
                  </label>
                  <input
                    type="text"
                    disabled={!isOwner}
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Office Address (Appears on Receipts)
                </label>
                <textarea
                  rows={2}
                  disabled={!isOwner}
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none resize-none"
                />
              </div>

              {/* Penalty & Grace Period Rules */}
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40 space-y-3">
                <h4 className="font-extrabold text-xs text-amber-800 dark:text-amber-300 uppercase">
                  Penalty & Grace Rules / அபராத விதிமுறைகள்
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      Late Overdue Penalty Rate (% per installment)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      disabled={!isOwner}
                      value={settings.defaultPenaltyPercent}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          defaultPenaltyPercent: Number(e.target.value),
                        })
                      }
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      Grace Period (Days before marking overdue)
                    </label>
                    <input
                      type="number"
                      min="0"
                      disabled={!isOwner}
                      value={settings.graceDays}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          graceDays: Number(e.target.value),
                        })
                      }
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold outline-none"
                    />
                  </div>
                </div>
              </div>

              {isOwner && (
                <button
                  type="submit"
                  className="py-3 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-blue-500/25 active:scale-95 transition flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Business Settings</span>
                </button>
              )}
            </form>
          </div>

          {/* Quick Preferences Card */}
          <div className="space-y-6">
            <div className="glass-card rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-md space-y-4">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                App Preferences
              </h3>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold">Language / மொழி</span>
                </div>
                <button
                  onClick={toggleLanguage}
                  className="btn-sky-primary py-1 px-3 text-xs font-bold active:scale-95"
                >
                  {lang === 'ta' ? 'தமிழ் (Current)' : 'English (Current)'}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center space-x-2">
                  {theme === 'dark' ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                  <span className="text-xs font-semibold">Appearance / தோற்றம்</span>
                </div>
                <button
                  onClick={toggleTheme}
                  className="py-1 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold capitalize active:scale-95"
                >
                  {theme} Mode
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Audit Trail & Backup Tab */}
      {activeSection === 'audit' && isOwner && (
        <div className="space-y-6">
          <div className="glass-card rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-md flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                Database Backup / தரவுத்தள சேமிப்பு
              </h3>
              <p className="text-xs text-slate-500">
                Download a complete, offline JSON snapshot of all customers, loans, and payments
              </p>
            </div>
            <button
              onClick={handleDownloadBackup}
              className="flex items-center space-x-2 py-3 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition"
            >
              <Download className="w-4 h-4" />
              <span>Download Full JSON Backup</span>
            </button>
          </div>

          <div className="glass-card rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                  Audit Trail & Activity Logs ({auditLogs.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">Immutable ledger of all financial mutations</span>
            </div>

            {auditLogs.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">No audit logs recorded yet.</p>
            ) : (
              <div className="overflow-x-auto max-h-[420px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">User</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Entity</th>
                      <th className="py-2.5 px-3">Summary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                    {auditLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 text-slate-500">{formatDate(log.timestamp)}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {log.userName}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{log.entity}</td>
                        <td className="py-2.5 px-3 text-slate-500 font-sans truncate max-w-xs">
                          {JSON.stringify(log.after || log.before || {})}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
