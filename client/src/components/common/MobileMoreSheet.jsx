import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useDeviceMode } from '../../context/DeviceModeContext';
import { usePWA } from '../../context/PWAContext';
import DisplayModeSwitcher from './DisplayModeSwitcher';
import {
  X,
  User,
  ShieldCheck,
  UserCheck,
  Globe,
  Sun,
  Moon,
  RefreshCw,
  LogOut,
  TrendingUp,
  FileSpreadsheet,
  CalendarDays,
  Settings as SettingsIcon,
  ChevronRight,
  Sparkles,
  Bell,
  Wallet,
  Download,
} from 'lucide-react';

export const MobileMoreSheet = ({
  isOpen,
  onClose,
  onSelectTab,
  onOpenNotifications,
  unreadNotificationsCount = 0,
}) => {
  const { user, logout, isOwner } = useAuth();
  const { lang, toggleLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { isRealPhone } = useDeviceMode();
  const { isInstalled, promptInstall } = usePWA();

  if (!isOpen) return null;

  const handleNav = (tabId) => {
    if (onSelectTab) onSelectTab(tabId);
    onClose();
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      {/* Backdrop tap to close */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Slide-up sheet (responsive on all phone sizes) */}
      <div className="relative glass-panel rounded-t-3xl p-5 border-t border-white/80 dark:border-sky-700/60 shadow-2xl max-w-lg w-full mx-auto max-h-[90vh] overflow-y-auto space-y-4 pb-safe">
        {/* Drag handle */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-sky-800/80 mx-auto" />

        {/* Sheet Header: User Profile */}
        <div className="flex items-center justify-between pb-3 border-b border-sky-100 dark:border-sky-900/60">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-400 to-sky-600 text-white font-black text-base flex items-center justify-center shadow-lg shadow-sky-500/25 shrink-0 border border-white/60">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-1.5">
                <h3 className="font-black text-sm text-slate-900 dark:text-white truncate">
                  {user?.name || 'FinTrack User'}
                </h3>
                {isOwner ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <UserCheck className="w-4 h-4 text-sky-500 shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-sky-600 dark:text-sky-400 font-bold capitalize">
                {user?.role === 'owner' ? 'Owner / நிர்வாகி' : 'Collection Agent / முகவர்'}
              </p>
              <p className="text-[10px] text-slate-400 font-mono truncate">
                {user?.phone ? `+91 ${user.phone}` : user?.email}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl glass hover:bg-sky-100 text-slate-400 hover:text-slate-600 transition"
            aria-label="Close sheet"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Preferences: Language & Theme Toggles */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="p-3 rounded-2xl glass border border-sky-200/60 dark:border-sky-800/60 flex items-center space-x-2.5 text-left active:scale-95 transition"
          >
            <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 uppercase font-black">Language</p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {lang === 'ta' ? 'தமிழ்' : 'English'}
              </p>
            </div>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-3 rounded-2xl glass border border-sky-200/60 dark:border-sky-800/60 flex items-center space-x-2.5 text-left active:scale-95 transition"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-500 shrink-0">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-sky-600" />}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 uppercase font-black">Theme</p>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize">
                {theme} Mode
              </p>
            </div>
          </button>
        </div>

        {/* Preview Device Switcher (Desktop browsers only, hidden on real phones) */}
        {!isRealPhone && (
          <div className="p-3 rounded-2xl glass border border-sky-200/60 dark:border-sky-800/60 space-y-2">
            <p className="text-[10px] font-black uppercase text-slate-400">
              Preview Mode (Desktop Testing)
            </p>
            <DisplayModeSwitcher showLabel={true} />
          </div>
        )}

        {/* Navigation Sections */}
        <div className="space-y-1.5 pt-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">
            Finance Operations
          </p>

          <button
            onClick={() => {
              onClose();
              if (onOpenNotifications) onOpenNotifications();
            }}
            className="w-full min-h-[48px] p-3 rounded-2xl glass hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 flex items-center justify-between text-left active:scale-98 transition"
          >
            <div className="flex items-center space-x-3">
              <div className="relative w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-600">
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {lang === 'ta' ? 'அறிவிப்புகள்' : 'Notifications & Alerts'}
                  </p>
                  {unreadNotificationsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-extrabold text-[10px]">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">Overdue alerts & scheduled dues</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {isOwner && (
            <button
              onClick={() => handleNav('investments')}
              className="w-full min-h-[48px] p-3 rounded-2xl glass hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 flex items-center justify-between text-left active:scale-98 transition"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {lang === 'ta' ? 'முதலீடு / சேமிப்பு' : 'Capital Investments'}
                  </p>
                  <p className="text-[10px] text-slate-400">Owner equity & partner capital</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          )}

          <button
            onClick={() => handleNav('expenses')}
            className="w-full min-h-[48px] p-3 rounded-2xl glass hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 flex items-center justify-between text-left active:scale-98 transition"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-600">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {lang === 'ta' ? 'அலுவலக & இதர செலவுகள்' : 'Expenses & Outflow'}
                </p>
                <p className="text-[10px] text-slate-400">Tea, fuel, rent & office expenses</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={() => handleNav('dailyClosing')}
            className="w-full min-h-[48px] p-3 rounded-2xl glass hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 flex items-center justify-between text-left active:scale-98 transition"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950 flex items-center justify-center text-sky-600">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {lang === 'ta' ? 'தினசரி கணக்கு முடிவு' : 'Daily Cash Closing Register'}
                </p>
                <p className="text-[10px] text-slate-400">Daily thandal, weekly & monthly tally</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={() => handleNav('calendar')}
            className="w-full min-h-[48px] p-3 rounded-2xl glass hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 flex items-center justify-between text-left active:scale-98 transition"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {lang === 'ta' ? 'தவணை நாட்காட்டி' : 'Repayment Calendar'}
                </p>
                <p className="text-[10px] text-slate-400">Due calendar & schedule view</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          <button
            onClick={() => handleNav('settings')}
            className="w-full min-h-[48px] p-3 rounded-2xl glass hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 flex items-center justify-between text-left active:scale-98 transition"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600">
                <SettingsIcon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {lang === 'ta' ? 'அமைப்புகள் & வாட்ஸ்அப்' : 'Settings & WhatsApp'}
                </p>
                <p className="text-[10px] text-slate-400">Pairing code, penalty & backup</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {!isInstalled && (
            <button
              onClick={() => {
                onClose();
                promptInstall();
              }}
              className="w-full min-h-[48px] p-3 rounded-2xl glass hover:bg-amber-50/50 dark:hover:bg-amber-950/20 border border-amber-300/70 dark:border-amber-600/40 bg-gradient-to-r from-amber-500/10 via-sky-500/5 to-transparent flex items-center justify-between text-left active:scale-98 transition shadow-sm"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-sky-600 flex items-center justify-center text-white shadow-sm">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {lang === 'ta' ? 'செயலியை நிறுவுக (Install App)' : 'Install VK BANKER\'S App'}
                  </p>
                  <p className="text-[10px] text-slate-400">Android, iPhone, iPad, PC & Mac</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-500" />
            </button>
          )}
        </div>

        {/* System Actions: Refresh & Logout */}
        <div className="pt-2 border-t border-sky-100 dark:border-sky-900/60 grid grid-cols-2 gap-2">
          <button
            onClick={handleRefresh}
            className="min-h-[48px] p-2.5 rounded-2xl glass hover:bg-sky-50 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center space-x-2 active:scale-95 transition"
          >
            <RefreshCw className="w-4 h-4 text-sky-500" />
            <span>Refresh App</span>
          </button>

          <button
            onClick={logout}
            className="min-h-[48px] p-2.5 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-bold text-xs flex items-center justify-center space-x-2 active:scale-95 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('logout')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileMoreSheet;
