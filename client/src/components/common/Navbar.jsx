import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useDeviceMode } from '../../context/DeviceModeContext';
import { usePWA } from '../../context/PWAContext';
import DisplayModeSwitcher from './DisplayModeSwitcher';
import {
  Sun,
  Moon,
  Globe,
  LogOut,
  ShieldCheck,
  UserCheck,
  Wallet,
  Menu,
  Search,
  Bell,
  User,
  Download,
  FileText,
  Smartphone,
  PanelLeftClose,
  PanelLeftOpen,
  CheckCircle2,
  RefreshCw,
  CloudOff,
} from 'lucide-react';

export const Navbar = ({
  onToggleMobileMenu,
  onOpenSearch,
  onAddPayment,
  onOpenMoreSheet,
  onOpenNotifications,
  onOpenLoanForm,
  onOpenWhatsAppHub,
  unreadNotificationsCount = 0,
  isSidebarCollapsed = false,
  onToggleSidebar,
}) => {
  const { user, logout, isOwner } = useAuth();
  const { lang, toggleLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { isLaptop, isTablet, isMobile } = useDeviceMode();
  const { isInstalled, promptInstall } = usePWA();

  const [syncState, setSyncState] = useState(() => api.getSyncStatus?.() || { status: 'synced', pendingCount: 0 });
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  useEffect(() => {
    const handleStatus = (e) => {
      if (e.detail) setSyncState(e.detail);
    };
    window.addEventListener('fintrack:sync-status', handleStatus);
    return () => window.removeEventListener('fintrack:sync-status', handleStatus);
  }, []);

  const handleSyncClick = async () => {
    setIsManualSyncing(true);
    try {
      if (api.flushOfflineQueue) {
        const res = await api.flushOfflineQueue();
        if (res && res.remaining > 0) {
          // If queue could not flush due to stale/conflicting local mutations, purge them to unblock UI
          if (api.clearSyncQueue) {
            await api.clearSyncQueue();
          }
        }
      }
      window.dispatchEvent(new CustomEvent('fintrack:force-sync'));
    } catch (err) {
      console.warn('Manual sync trigger:', err);
    } finally {
      setTimeout(() => setIsManualSyncing(false), 600);
    }
  };

  // ----------------------------------------------------
  // MOBILE HEADER (Max 56px, glass, safe-area-inset-top)
  // ----------------------------------------------------
  if (isMobile) {
    return (
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/60 dark:border-sky-800/40 transition-colors pt-safe">
        <div className="px-3 h-14 flex items-center justify-between gap-2 max-w-full">
          {/* Left: Logo Icon + "VK BANKER'S" title only */}
          <div className="flex items-center space-x-2.5 shrink-0 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-400 via-sky-500 to-sky-600 flex items-center justify-center text-white shadow-md shadow-sky-500/25 border border-white/60 shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="font-black text-base tracking-tight bg-gradient-to-r from-sky-600 to-sky-500 dark:from-sky-300 dark:to-sky-400 bg-clip-text text-transparent truncate">
              VK BANKER'S
            </span>
          </div>

          {/* Right: Install (if applicable) + Bell + Avatar Button */}
          <div className="flex items-center space-x-1.5 shrink-0">
            {/* Mobile Cloud Sync Indicator */}
            <button
              onClick={handleSyncClick}
              className={`p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl glass border transition active:scale-95 shadow-sm ${
                isManualSyncing || syncState.status === 'syncing'
                  ? 'border-sky-300/80 dark:border-sky-700/60 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/30'
                  : syncState.status === 'synced'
                  ? 'border-emerald-300/80 dark:border-emerald-700/60 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
                  : 'border-amber-300/80 dark:border-amber-700/60 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/30'
              }`}
              title="Cloud Sync Status (Tap to sync or clear)"
              aria-label="Cloud Sync"
            >
              {(isManualSyncing || syncState.status === 'syncing') && <RefreshCw className="w-4 h-4 text-sky-500 animate-spin" />}
              {!isManualSyncing && syncState.status === 'synced' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              {!isManualSyncing && syncState.status === 'offline' && <CloudOff className="w-4 h-4 text-amber-500" />}
            </button>

            {/* WhatsApp Hub Button */}
            <button
              onClick={onOpenWhatsAppHub}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl glass border border-emerald-300/80 dark:border-emerald-700/60 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 active:scale-95 transition shadow-sm"
              aria-label="WhatsApp"
              title={lang === 'ta' ? 'வாட்ஸ்அப் லாகின் & நேரடி செய்தி' : 'WhatsApp Web & Quick Send'}
            >
              <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </button>

            {/* Loan Application Form Button */}
            <button
              onClick={onOpenLoanForm}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl glass border border-sky-300/70 dark:border-sky-700/60 text-sky-600 dark:text-sky-400 active:scale-95 transition"
              aria-label="Loan Form"
              title={lang === 'ta' ? 'கடன் விண்ணப்பப் படிவம்' : 'Download Loan Application Form'}
            >
              <FileText className="w-4 h-4 text-sky-500" />
            </button>

            {!isInstalled && (
              <button
                onClick={promptInstall}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl glass border border-amber-300/70 dark:border-amber-700/60 text-amber-600 dark:text-amber-400 active:scale-95 transition"
                aria-label="Install App"
                title={lang === 'ta' ? 'செயலியை நிறுவுக' : 'Install VK BANKER\'S App'}
              >
                <Download className="w-4 h-4 text-amber-500" />
              </button>
            )}

            {/* Bell / Notification Button */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl glass border border-sky-200/60 dark:border-sky-800/60 text-slate-700 dark:text-slate-300 active:scale-95 transition"
              aria-label="Notifications"
              title="Notifications / அறிவிப்புகள்"
            >
              <Bell className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              {unreadNotificationsCount > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse">
                  {unreadNotificationsCount}
                </span>
              ) : (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-sky-400 ring-2 ring-white dark:ring-slate-900" />
              )}
            </button>

            {/* Avatar Button -> Opens Slide-in More Sheet */}
            <button
              onClick={onOpenMoreSheet}
              className="p-1 min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95 transition"
              aria-label="User profile and settings"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-sky-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-sky-500/25 border border-white/80 ring-2 ring-sky-300/60 dark:ring-sky-700/60">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
            </button>
          </div>
        </div>
      </header>
    );
  }

  // ----------------------------------------------------
  // DESKTOP & TABLET HEADER
  // ----------------------------------------------------
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/60 dark:border-sky-800/40 transition-colors">
      <div className={`mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 ${isTablet ? 'max-w-6xl' : 'w-full max-w-[1720px] 2xl:max-w-[1920px]'}`}>
        {/* Brand / Logo + Navigation Minimizer Toggle */}
        <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            </button>
          )}

          {/* Desktop & Tablet Navigation Minimizer Button */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="hidden md:flex p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/60 border border-transparent hover:border-sky-200/80 dark:hover:border-sky-800/80 transition active:scale-95 shadow-xs"
              title={
                isSidebarCollapsed
                  ? 'Expand Navigation (M) / வழிசெலுத்தல் விரிவாக்கு'
                  : 'Minimize Navigation (M) / வழிசெலுத்தல் சுருக்கு'
              }
              aria-label="Toggle Navigation"
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              ) : (
                <PanelLeftClose className="w-5 h-5" />
              )}
            </button>
          )}

          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-400 via-sky-500 to-sky-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/30 border border-white/60">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <span className="font-black text-lg sm:text-xl tracking-tight bg-gradient-to-r from-sky-600 to-sky-500 dark:from-sky-300 dark:to-sky-400 bg-clip-text text-transparent">
                  VK BANKER'S & FINANCE
                </span>
                <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-700/60">
                  {lang === 'ta' ? 'வி.கே. பேங்கர்ஸ்' : "VK BANKER'S"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-none hidden sm:block">
                {t('appSubtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Laptop Mode Search Bar with '/' Shortcut */}
        {isLaptop && (
          <div className="hidden lg:flex items-center flex-1 max-w-xs mx-4">
            <button
              onClick={onOpenSearch}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-2xl glass border border-sky-200/60 dark:border-sky-800/60 text-xs text-slate-400 hover:border-sky-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all shadow-sm"
              title="Search loans and customers (Press /)"
            >
              <div className="flex items-center space-x-2">
                <Search className="w-3.5 h-3.5 text-sky-500" />
                <span>தேடல் / Search...</span>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 font-mono text-[10px] font-bold border border-sky-200/60 dark:border-sky-700/60">
                /
              </kbd>
            </button>
          </div>
        )}

        {/* Action Controls & Device Switcher */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5">
          {/* Cloud Sync Status Pill */}
          <button
            onClick={handleSyncClick}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border whitespace-nowrap transition active:scale-95 shadow-xs ${
              isManualSyncing || syncState.status === 'syncing'
                ? 'bg-sky-50/80 dark:bg-sky-950/50 border-sky-300/80 dark:border-sky-700/60 text-sky-700 dark:text-sky-300'
                : syncState.status === 'synced'
                ? 'bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-300/80 dark:border-emerald-700/60 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-50/80 dark:bg-amber-950/50 border-amber-300/80 dark:border-amber-700/60 text-amber-700 dark:text-amber-300'
            }`}
            title="MongoDB Atlas Cloud Sync (Click to sync or clear stuck items)"
          >
            {(isManualSyncing || syncState.status === 'syncing') && (
              <RefreshCw className="w-3.5 h-3.5 text-sky-600 animate-spin shrink-0" />
            )}
            {!isManualSyncing && syncState.status === 'synced' && (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            )}
            {!isManualSyncing && syncState.status === 'offline' && (
              <CloudOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            )}
            <span className="hidden md:inline whitespace-nowrap">
              {isManualSyncing || syncState.status === 'syncing'
                ? lang === 'ta' ? 'ஒத்திசைக்கிறது...' : 'Syncing...'
                : syncState.status === 'synced'
                ? lang === 'ta' ? 'இணைக்கப்பட்டது' : 'Synced'
                : syncState.pendingCount > 0
                ? `${lang === 'ta' ? 'ஆஃப்லைன்' : 'Offline'} (${syncState.pendingCount})`
                : lang === 'ta' ? 'ஆஃப்லைன்' : 'Offline'}
            </span>
          </button>

          {/* Display Mode Switcher (Mobile / Tablet / Laptop / Auto) */}
          <DisplayModeSwitcher compact={false} />

          {/* Desktop Notification Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl glass border border-sky-200/60 dark:border-sky-800/60 text-slate-700 dark:text-slate-200 hover:border-sky-400 hover:text-sky-600 transition shadow-sm active:scale-95"
            title="Notifications & Alerts / அறிவிப்புகள்"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 text-sky-500" />
            {unreadNotificationsCount > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse">
                {unreadNotificationsCount}
              </span>
            ) : (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-sky-400 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          {/* WhatsApp Web & Messenger Button */}
          <button
            onClick={onOpenWhatsAppHub}
            className="flex items-center space-x-1.5 px-3 py-1.5 min-h-[40px] rounded-xl glass border border-emerald-300/80 dark:border-emerald-600/60 bg-gradient-to-r from-emerald-500/15 to-green-500/15 text-slate-800 dark:text-slate-100 text-xs font-bold hover:border-emerald-500 hover:shadow-md transition active:scale-95 shadow-sm"
            title={lang === 'ta' ? 'வாட்ஸ்அப் லாகின் & செய்தி அனுப்ப' : 'WhatsApp Web Login & Quick Send'}
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="hidden sm:inline font-bold text-emerald-700 dark:text-emerald-300">
              WhatsApp
            </span>
          </button>

          {/* Loan Application Form Button */}
          <button
            onClick={onOpenLoanForm}
            className="flex items-center space-x-1.5 px-3 py-1.5 min-h-[40px] rounded-xl glass border border-sky-300/70 dark:border-sky-600/50 bg-gradient-to-r from-sky-500/10 to-indigo-500/10 text-slate-800 dark:text-slate-100 text-xs font-bold hover:border-sky-400 hover:shadow-md transition active:scale-95 shadow-sm"
            title={lang === 'ta' ? 'கடன் விண்ணப்பப் படிவத்தை அச்சிட / பதிவிறக்க' : 'Print or Download Loan Application Form'}
          >
            <FileText className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            <span className="hidden sm:inline font-bold text-sky-700 dark:text-sky-300">
              {lang === 'ta' ? 'கடன் படிவம்' : 'Loan Form'}
            </span>
          </button>

          {/* Desktop Install App Button */}
          {!isInstalled && (
            <button
              onClick={promptInstall}
              className="flex items-center space-x-1.5 px-3 py-1.5 min-h-[40px] rounded-xl glass border border-amber-300/70 dark:border-amber-600/50 bg-gradient-to-r from-amber-500/10 to-sky-500/10 text-slate-800 dark:text-slate-100 text-xs font-bold hover:border-amber-400 hover:shadow-md transition active:scale-95 shadow-sm"
              title={lang === 'ta' ? "VK BANKER'S செயலியை உங்கள் சாதனத்தில் நிறுவுக" : "Install VK BANKER'S App on your device"}
            >
              <Download className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="hidden sm:inline font-bold text-amber-600 dark:text-amber-400">
                {lang === 'ta' ? 'நிறுவுக' : 'Install'}
              </span>
            </button>
          )}

          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 min-h-[40px] rounded-xl glass border border-sky-200/60 dark:border-sky-800/60 text-slate-700 dark:text-slate-200 text-xs font-bold hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition active:scale-95 shadow-sm"
            title="Toggle Language / மொழி மாற்றம்"
          >
            <Globe className="w-3.5 h-3.5 text-sky-500" />
            <span className="hidden sm:inline">{lang === 'ta' ? 'English' : 'தமிழ்'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl glass border border-sky-200/60 dark:border-sky-800/60 text-slate-700 dark:text-slate-200 hover:text-amber-500 hover:border-sky-400 transition shadow-sm active:scale-95"
            title="Toggle Dark / Light Theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-sky-600" />
            )}
          </button>

          {/* User Role Badge */}
          {user && (
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-xl glass border border-sky-200/60 dark:border-sky-800/60 text-xs font-medium">
              {isOwner ? (
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              ) : (
                <UserCheck className="w-4 h-4 text-sky-500" />
              )}
              <div className="flex flex-col text-left">
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[100px]">
                  {(user?.name || user?.email || 'User').split(' ')[0]}
                </span>
                <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold capitalize">
                  {user?.role || 'User'}
                </span>
              </div>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition active:scale-95"
            title={t('logout')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
