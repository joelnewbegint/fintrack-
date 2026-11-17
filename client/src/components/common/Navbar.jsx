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
  Wallet,
  Menu,
  Search,
  Bell,
  Download,
  FileText,
  Smartphone,
  PanelLeftClose,
  PanelLeftOpen,
  CheckCircle2,
  RefreshCw,
  CloudOff,
  Zap,
  MoreHorizontal,
  ChevronDown,
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
  // MOBILE TOP BAR (Streamlined & Clean)
  // -------------------------------------------------------------------------
  if (isMobile) {
    return (
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/60 dark:border-sky-800/40 transition-colors pt-safe">
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
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-400 via-sky-500 to-sky-600 flex items-center justify-center text-white shadow-md shadow-sky-500/25 shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="font-black text-sm sm:text-base tracking-tight bg-gradient-to-r from-sky-600 to-sky-500 dark:from-sky-300 dark:to-sky-400 bg-clip-text text-transparent truncate">
              VK BANKER'S
            </span>
          </div>

          {/* Right: Quick Enter + Sync Pill + Bell + Avatar */}
          <div className="flex items-center space-x-1.5 shrink-0">
            {/* Quick Enter button */}
            <button
              onClick={onAddPayment}
              className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-[11px] shadow-sm active:scale-95 flex items-center space-x-1"
              title="Quick Collection Entry"
            >
              <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
              <span>Quick Enter</span>
            </button>

            {/* Sync Status: Small Dot + Status */}
            <button
              onClick={handleSyncClick}
              className="flex items-center space-x-1 px-2 py-1 rounded-xl glass border border-slate-200/60 dark:border-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 active:scale-95"
              title="Cloud Sync Status"
            >
              {isManualSyncing || syncState.status === 'syncing' ? (
                <RefreshCw className="w-2.5 h-2.5 text-sky-500 animate-spin" />
              ) : syncState.status === 'synced' ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
              )}
              <span className="hidden xs:inline">
                {syncState.status === 'synced' ? 'Synced' : 'Offline'}
              </span>
            </button>

            {/* Notification Bell (Capped at 99+) */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 rounded-xl glass text-slate-700 dark:text-slate-300 active:scale-95"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                  {cappedNotificationBadge}
                </span>
              )}
            </button>

            {/* Avatar / More Sheet */}
            <button
              onClick={onOpenMoreSheet}
              className="p-0.5 active:scale-95"
              aria-label="Profile and menu"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-sky-600 text-white font-bold text-xs flex items-center justify-center shadow-md shadow-sky-500/25">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
            </button>
          </div>
        </div>
      </header>
    );
  }

  // -------------------------------------------------------------------------
  // DESKTOP & TABLET TOP BAR (Simplified & Cleaned)
  // -------------------------------------------------------------------------
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/60 dark:border-sky-800/40 transition-colors">
      <div
        className={`mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 ${
          isTablet ? 'max-w-6xl' : 'w-full max-w-[1720px] 2xl:max-w-[1920px]'
        }`}
      >
        {/* Left: Sidebar Toggle + Logo & Brand */}
        <div className="flex items-center space-x-3 shrink-0">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/60 border border-transparent hover:border-sky-200/80 dark:hover:border-sky-800/80 transition active:scale-95 shadow-xs"
              title={isSidebarCollapsed ? 'Expand Navigation (M)' : 'Minimize Navigation (M)'}
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
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-sky-400 via-sky-500 to-sky-600 flex items-center justify-center text-white shadow-md shadow-sky-500/30 border border-white/60">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-lg tracking-tight bg-gradient-to-r from-sky-600 to-sky-500 dark:from-sky-300 dark:to-sky-400 bg-clip-text text-transparent">
                  VK BANKER'S & FINANCE
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300">
                  {lang === 'ta' ? 'வி.கே. பேங்கர்ஸ்' : 'FINANCE'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: ONE Global Search */}
        <div className="flex-1 max-w-md mx-2 sm:mx-6">
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl glass border border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-400 hover:border-sky-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all shadow-xs"
            title="Search loans and customers (Press /)"
          >
            <div className="flex items-center space-x-2">
              <Search className="w-3.5 h-3.5 text-sky-500" />
              <span>Search loans, customers, phone... / தேடல்...</span>
            </div>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px] font-bold border border-slate-200 dark:border-slate-700">
              /
            </kbd>
          </button>
        </div>

        {/* Right: Quick Enter + Sync Status + Bell + "⋯ More" Dropdown + Profile */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Quick Enter Button */}
          <button
            onClick={onAddPayment}
            className="flex items-center space-x-1.5 px-3 py-1.5 min-h-[38px] rounded-xl bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 text-white text-xs font-bold shadow-md shadow-sky-500/20 hover:shadow-lg active:scale-95 transition"
            title="Quick Payment / Collection Entry"
          >
            <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300 shrink-0" />
            <span>Quick Enter</span>
          </button>

          {/* Sync Status: Small Green Dot + "Synced" */}
          <button
            onClick={handleSyncClick}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 min-h-[38px] rounded-xl text-xs font-bold glass border border-slate-200/80 dark:border-slate-800/80 text-slate-700 dark:text-slate-200 transition active:scale-95"
            title="Cloud Sync Status (Click to sync)"
          >
            {isManualSyncing || syncState.status === 'syncing' ? (
              <RefreshCw className="w-3.5 h-3.5 text-sky-500 animate-spin" />
            ) : syncState.status === 'synced' ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-xs" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
            )}
            <span className="text-[11px] font-semibold">
              {isManualSyncing || syncState.status === 'syncing'
                ? 'Syncing...'
                : syncState.status === 'synced'
                ? 'Synced'
                : `Offline (${syncState.pendingCount || 0})`}
            </span>
          </button>

          {/* Notification Bell (Single Badge, Capped at 99+) */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl glass border border-slate-200/80 dark:border-slate-800/80 text-slate-700 dark:text-slate-200 hover:border-sky-400 transition active:scale-95"
            title="Notifications & Alerts"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 text-sky-500" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-sm">
                {cappedNotificationBadge}
              </span>
            )}
          </button>

          {/* "⋯ More" Dropdown (Consolidates Device, WhatsApp, Loan Form, Install, Lang, Theme) */}
          <div ref={moreMenuRef} className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="flex items-center space-x-1 px-2.5 py-1.5 min-h-[38px] rounded-xl glass border border-slate-200/80 dark:border-slate-800/80 text-slate-700 dark:text-slate-200 hover:border-sky-400 transition active:scale-95 text-xs font-bold"
              title="More Utilities & Settings"
              aria-label="More options"
            >
              <MoreHorizontal className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <span className="text-[11px] hidden xl:inline">More</span>
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 animate-in fade-in slide-in-from-top-1 divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {/* Section A: Device Layout Switcher */}
                <div className="p-1.5 pb-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">
                    Display Layout
                  </div>
                  <DisplayModeSwitcher compact={false} />
                </div>

                {/* Section B: External Actions */}
                <div className="p-1.5 space-y-1">
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      if (onOpenWhatsAppHub) onOpenWhatsAppHub();
                    }}
                    className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 transition text-left font-medium"
                  >
                    <Smartphone className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>WhatsApp Web & Quick Send</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      if (onOpenLoanForm) onOpenLoanForm();
                    }}
                    className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-600 transition text-left font-medium"
                  >
                    <FileText className="w-4 h-4 text-sky-500 shrink-0" />
                    <span>Print Loan Application Form</span>
                  </button>

                  {!isInstalled && (
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        promptInstall();
                      }}
                      className="w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-700 transition text-left font-medium"
                    >
                      <Download className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Install App on Device</span>
                    </button>
                  )}
                </div>

                {/* Section C: Language & Theme Toggles */}
                <div className="p-1.5 pt-2 flex items-center justify-between">
                  <button
                    onClick={toggleLanguage}
                    className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition font-bold"
                  >
                    <Globe className="w-3.5 h-3.5 text-sky-500" />
                    <span>{lang === 'ta' ? 'English' : 'தமிழ்'}</span>
                  </button>

                  <button
                    onClick={toggleTheme}
                    className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition font-bold"
                  >
                    {theme === 'dark' ? (
                      <>
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span>Light</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-3.5 h-3.5 text-sky-600" />
                        <span>Dark</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile / Menu Dropdown */}
          <div ref={userMenuRef} className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-1 rounded-xl glass border border-slate-200/80 dark:border-slate-800/80 hover:border-sky-400 transition"
              aria-label="User Profile"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-1" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-52 p-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 animate-in fade-in slide-in-from-top-1 space-y-1.5">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {user?.name || user?.email || 'Admin User'}
                  </p>
                  <p className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold uppercase mt-0.5">
                    {user?.role || 'Staff'} • {isOwner ? 'Proprietor' : 'Staff'}
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t('logout')} / வெளியேறு</span>
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
