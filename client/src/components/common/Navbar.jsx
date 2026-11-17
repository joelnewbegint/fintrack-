import React, { useState, useEffect, useRef } from 'react';
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
  Menu,
  Search,
  Bell,
  Download,
  FileText,
  Smartphone,
  CheckCircle2,
  RefreshCw,
  Plus,
  ChevronDown,
  MoreHorizontal,
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
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const moreMenuRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleStatus = (e) => {
      if (e.detail) setSyncState(e.detail);
    };
    window.addEventListener('fintrack:sync-status', handleStatus);
    return () => window.removeEventListener('fintrack:sync-status', handleStatus);
  }, []);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setShowMoreMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleSyncClick = async () => {
    setIsManualSyncing(true);
    try {
      if (api.flushOfflineQueue) {
        const res = await api.flushOfflineQueue();
        if (res && res.remaining > 0) {
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

  const cappedNotificationBadge =
    unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount;

  // -------------------------------------------------------------------------
  // MOBILE TOP BAR
  // -------------------------------------------------------------------------
  if (isMobile) {
    return (
      <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors pt-safe">
        <div className="px-3 h-14 flex items-center justify-between gap-2 max-w-full">
          {/* Left: Menu toggle + Logo + Title */}
          <div className="flex items-center space-x-2 shrink-0 min-w-0">
            {onToggleMobileMenu && (
              <button
                onClick={onToggleMobileMenu}
                className="p-1.5 -ml-1 text-slate-600 dark:text-slate-300"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              </button>
            )}
            <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white font-black text-xs shadow-md shrink-0">
              VK
            </div>
            <span className="font-black text-sm text-slate-900 dark:text-white truncate">
              VK Banker's & Finance
            </span>
          </div>

          {/* Right: Quick Enter + Sync Pill + Bell + Avatar */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              onClick={onAddPayment}
              className="px-2.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-sm flex items-center space-x-1 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Quick Enter</span>
            </button>

            <button
              onClick={handleSyncClick}
              className="flex items-center space-x-1 px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="hidden xs:inline">Synced</span>
            </button>

            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 active:scale-95"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                  {cappedNotificationBadge}
                </span>
              )}
            </button>

            <button
              onClick={onOpenMoreSheet}
              className="w-8 h-8 rounded-full bg-sky-500 text-white font-bold text-xs flex items-center justify-center shadow-sm"
            >
              {user?.name ? user.name[0].toUpperCase() : 'J'}
            </button>
          </div>
        </div>
      </header>
    );
  }

  // -------------------------------------------------------------------------
  // DESKTOP & TABLET TOP BAR (Matches Exact Mockup)
  // -------------------------------------------------------------------------
  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left: Sidebar Toggle + VK Logo Circle + Name */}
        <div className="flex items-center space-x-3 shrink-0">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95"
              title="Toggle Sidebar (M)"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-full bg-sky-500 flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0">
              VK
            </div>
            <span className="font-black text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
              VK Banker's & Finance
            </span>
          </div>
        </div>

        {/* Center: Search input "Search customer, loan #, phone... ( / to focus )" */}
        <div className="flex-1 max-w-lg mx-4">
          <button
            onClick={onOpenSearch}
            className="w-full h-10 flex items-center justify-between px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-400 hover:border-sky-400 hover:text-slate-600 dark:hover:text-slate-200 transition shadow-xs"
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate">Search customer, loan #, phone... ( / to focus )</span>
            </div>
          </button>
        </div>

        {/* Right: + Quick Enter + Synced Pill + Bell with 99+ + ⋯ More ▾ + Profile Avatar J */}
        <div className="flex items-center space-x-2.5 shrink-0">
          {/* + Quick Enter Button */}
          <button
            onClick={onAddPayment}
            className="h-10 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-md shadow-sky-500/20 flex items-center space-x-1.5 active:scale-95 transition"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Quick Enter</span>
          </button>

          {/* ● Synced Pill */}
          <button
            onClick={handleSyncClick}
            className="h-9 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center space-x-1.5 transition active:scale-95"
            title="Cloud Sync Status"
          >
            {isManualSyncing || syncState.status === 'syncing' ? (
              <RefreshCw className="w-3 h-3 text-sky-500 animate-spin" />
            ) : syncState.status === 'synced' ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
            )}
            <span>{syncState.status === 'synced' ? 'Synced' : 'Offline'}</span>
          </button>

          {/* Notification Bell with 99+ Badge */}
          <button
            onClick={onOpenNotifications}
            className="relative h-10 w-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center transition active:scale-95"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute 1 top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                {cappedNotificationBadge}
              </span>
            )}
          </button>

          {/* ⋯ More ▾ Dropdown */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="h-10 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center space-x-1.5 transition active:scale-95"
              aria-label="More options"
            >
              <span>⋯ More</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-60 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800 p-2 z-50 text-xs space-y-1">
                {/* Device Switcher */}
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Layout Mode
                  </p>
                  <DisplayModeSwitcher />
                </div>

                {/* WhatsApp Web Hub */}
                {onOpenWhatsAppHub && !isClient && (
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      onOpenWhatsAppHub();
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 transition"
                  >
                    <Smartphone className="w-4 h-4 text-emerald-500" />
                    <span>WhatsApp Web Hub</span>
                  </button>
                )}

                {/* Blank Loan Form */}
                {onOpenLoanForm && (
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      onOpenLoanForm();
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-600 transition"
                  >
                    <FileText className="w-4 h-4 text-sky-500" />
                    <span>Loan Application Form</span>
                  </button>
                )}

                {/* PWA Install */}
                {!isInstalled && promptInstall && (
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      promptInstall();
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-600 transition"
                  >
                    <Download className="w-4 h-4 text-sky-500" />
                    <span>Install App (PWA)</span>
                  </button>
                )}

                {/* Language Toggle */}
                <button
                  onClick={toggleLanguage}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <div className="flex items-center space-x-2.5">
                    <Globe className="w-4 h-4 text-slate-500" />
                    <span>Language / மொழி</span>
                  </div>
                  <span className="font-bold text-[11px] text-sky-600 dark:text-sky-400 uppercase">
                    {lang === 'ta' ? 'தமிழ்' : 'EN'}
                  </span>
                </button>

                {/* Dark Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <div className="flex items-center space-x-2.5">
                    {theme === 'dark' ? (
                      <Sun className="w-4 h-4 text-amber-500" />
                    ) : (
                      <Moon className="w-4 h-4 text-slate-500" />
                    )}
                    <span>Theme</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium capitalize">
                    {theme}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* User Profile Avatar J with Logout */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-10 h-10 rounded-full bg-sky-500 hover:bg-sky-600 text-white font-bold text-sm flex items-center justify-center shadow-sm transition active:scale-95 ring-2 ring-white dark:ring-slate-900"
              title={user?.name || 'User Profile'}
            >
              {user?.name ? user.name[0].toUpperCase() : 'J'}
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-56 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800 p-3 z-50 text-xs space-y-2">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                  <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {user?.name || 'Administrator'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.phone || user?.role}</p>
                </div>

                <button
                  onClick={logout}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout / வெளியேறு</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
