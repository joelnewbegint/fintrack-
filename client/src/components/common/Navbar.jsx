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
  Tablet,
  Laptop,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Sparkles,
  Layers,
  Wallet,
  Check,
  MessageSquare,
  RotateCcw,
  X,
} from 'lucide-react';
import SingleSwapChip from './SingleSwapChip';

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
  onSwitchToEMI,
}) => {
  const { user, logout, isOwner, isClient } = useAuth();
  const { lang, toggleLanguage, t } = useLanguage();
  const { theme, setTheme, toggleTheme } = useTheme();
  const { isLaptop, isTablet, isMobile, mode, setMode, resetToAuto, isOverride } = useDeviceMode();
  const { isInstalled, promptInstall } = usePWA();

  const [syncState, setSyncState] = useState(() => api.getSyncStatus?.() || { status: 'synced', pendingCount: 0 });
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [agentList, setAgentList] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('all');
  const moreMenuRef = useRef(null);
  const userMenuRef = useRef(null);

  const handleSwitchToEmi = () => {
    if (onSwitchToEMI) {
      onSwitchToEMI();
    } else {
      try {
        window.history.pushState({}, '', '/emi');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch (e) {}
    }
  };

  useEffect(() => {
    if (isOwner) {
      api.getAgents().then((res) => {
        if (Array.isArray(res)) setAgentList(res);
      }).catch(() => {});
    }
  }, [isOwner]);

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
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowMoreMenu(false);
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
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
                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition -ml-1"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              </button>
            )}
            <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 via-sky-600 to-blue-600 flex items-center justify-center text-white font-black text-xs shadow-sm shrink-0">
              <Wallet className="w-4 h-4" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1.5 ring-white dark:ring-slate-900" />
            </div>
            <div className="min-w-0">
              <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate block leading-tight">
                {lang === 'ta' ? 'வி.கே. பேங்கர்ஸ்' : "VK BANKER'S"}
              </span>
              <span className="text-[9px] text-slate-400 font-medium block truncate leading-none mt-0.5">
                {lang === 'ta' ? 'தவணை நிதி மேலாண்மை' : 'Finance Ledger'}
              </span>
            </div>
          </div>

          {/* Right: Sync Pill + Bell + Avatar */}
          <div className="flex items-center space-x-1.5 shrink-0">

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

        {/* Mobile (Owner Only): Single Swap Chip Toggle */}
        {isOwner && (
          <div className="flex items-center justify-center pb-2 px-3 pt-1 border-t border-slate-100 dark:border-slate-800">
            <SingleSwapChip
              activeMode="loans"
              onToggle={handleSwitchToEmi}
            />
          </div>
        )}
      </header>
    );
  }

  // -------------------------------------------------------------------------
  // DESKTOP & TABLET TOP BAR (Matches Exact Mockup)
  // -------------------------------------------------------------------------
  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="w-full px-3 sm:px-5 h-16 flex items-center justify-between gap-2.5">
        {/* Left: Sidebar Toggle + Luxury Wallet Monogram + VK BANKER'S & FINANCE */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95"
              title="Toggle Sidebar (M)"
              aria-label="Toggle Navigation Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Premium Fintech Brand Icon */}
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 via-sky-600 to-blue-600 text-white flex items-center justify-center shadow-md shadow-sky-500/25 shrink-0">
            <Wallet className="w-5 h-5 drop-shadow-xs" />
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900"
              title="System Online"
            />
          </div>

          {/* Brand Name & Tagline (Bilingual, Neat & Zero Redundant Text) */}
          <div className="flex flex-col justify-center min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-black text-sm sm:text-base text-slate-900 dark:text-white tracking-tight leading-tight">
                {lang === 'ta' ? 'வி.கே. பேங்கர்ஸ் & பைனான்ஸ்' : "VK BANKER'S & FINANCE"}
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/80 tracking-wide hidden md:inline-flex items-center">
                {lang === 'ta' ? "VK Banker's" : 'வி.கே.'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-400 font-medium tracking-normal leading-tight mt-0.5">
              {lang === 'ta' ? 'தவணை நிதி மேலாண்மை • கோவை' : 'Daily & Monthly Loan Ledger • Coimbatore'}
            </span>
          </div>
        </div>

        {/* Center: Search pill "தேடல் / Search... /" */}
        <div className="flex-1 max-w-xs sm:max-w-sm mx-1 sm:mx-2">
          <button
            onClick={onOpenSearch}
            className="w-full h-9 flex items-center justify-between px-3 rounded-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-400 hover:border-sky-400 hover:text-slate-600 dark:hover:text-slate-200 transition shadow-xs"
          >
            <div className="flex items-center space-x-2 min-w-0">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate text-[11px]">{lang === 'ta' ? 'தேடல் / Search...' : 'Search...'}</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200/60 dark:bg-slate-700 text-slate-500 font-bold shrink-0">
              /
            </span>
          </button>
        </div>

        {/* Center (Owner Only): Single Swap Chip Toggle */}
        {isOwner && (
          <div className="hidden md:flex items-center shrink-0">
            <SingleSwapChip
              activeMode="loans"
              onToggle={handleSwitchToEmi}
            />
          </div>
        )}

        {/* Right: Synced Pill + Bell + EN/Tamil + Theme + ⋯ More ▾ + Profile Avatar */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* ● Synced Pill */}
          <button
            onClick={handleSyncClick}
            className="h-9 px-3 rounded-full glass border border-sky-200/60 dark:border-sky-800/60 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-sky-50/60 dark:hover:bg-sky-950/40 flex items-center space-x-1.5 transition active:scale-95 shadow-xs"
            title="Cloud Sync Status"
          >
            {isManualSyncing || syncState.status === 'syncing' ? (
              <RefreshCw className="w-3 h-3 text-sky-500 animate-spin" />
            ) : syncState.status === 'synced' ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
            )}
            <span className="text-[11px] font-bold">{syncState.status === 'synced' ? 'Synced' : 'Offline'}</span>
          </button>

          {/* Notification Bell with 99+ Badge */}
          <button
            onClick={onOpenNotifications}
            className="relative h-9 w-9 rounded-xl glass border border-sky-200/60 dark:border-sky-800/60 hover:bg-sky-50/60 dark:hover:bg-sky-950/40 text-slate-600 dark:text-slate-300 flex items-center justify-center transition active:scale-95 shadow-xs"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute 1 top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white text-[8.5px] font-black flex items-center justify-center">
                {cappedNotificationBadge}
              </span>
            )}
          </button>

          {/* Quick EN/த Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="h-9 px-2.5 rounded-xl glass border border-sky-200/60 dark:border-sky-800/60 hover:bg-sky-50/60 dark:hover:bg-sky-950/40 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center space-x-1 transition active:scale-95 shadow-xs"
            title="Toggle Language / மொழி மாற்றம்"
          >
            <Globe className="w-3.5 h-3.5 text-sky-500" />
            <span className="text-[11px] font-black">{lang === 'ta' ? 'தமிழ்' : 'EN'}</span>
          </button>

          {/* Quick Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="h-9 w-9 rounded-xl glass border border-sky-200/60 dark:border-sky-800/60 hover:bg-sky-50/60 dark:hover:bg-sky-950/40 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center transition active:scale-95 shadow-xs"
            title="Cycle Theme (Lavender Glass / Classic Glass / Light / Dark)"
          >
            {theme === 'lavender-glass' ? (
              <Sparkles className="w-4 h-4 text-[#8B7BD0]" />
            ) : theme === 'glass' ? (
              <Layers className="w-4 h-4 text-sky-500" />
            ) : theme === 'dark' ? (
              <Moon className="w-4 h-4 text-sky-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
          </button>

          {/* ⋯ More ▾ Dropdown (Contains DisplayModeSwitcher, WhatsApp, Loan Form, PWA Install, Agent Filter) */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMoreMenu((prev) => !prev);
                setShowUserMenu(false);
              }}
              className={`h-9 px-3 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition active:scale-95 shadow-xs ${
                showMoreMenu
                  ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-400 dark:border-sky-600 text-sky-700 dark:text-sky-300 ring-2 ring-sky-400/20'
                  : 'glass border-sky-200/60 dark:border-sky-800/60 text-slate-700 dark:text-slate-200 hover:bg-sky-50/60 dark:hover:bg-sky-950/40'
              }`}
              title="More Options & Utilities"
              aria-label="More options"
            >
              <span className="font-bold">⋯ More</span>
              <ChevronDown
                className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${
                  showMoreMenu ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showMoreMenu && (
              <>
                {/* Click-outside dimmed backdrop with 15% black and light blur */}
                <div
                  className="fixed inset-0 bg-black/15 dark:bg-black/40 backdrop-blur-[2px] z-40 transition-opacity duration-150"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMoreMenu(false);
                  }}
                  aria-hidden="true"
                />

                {/* More Popup Panel: Desktop/Tablet dropdown (w-[340px], right-aligned) & Mobile bottom sheet */}
                <div
                  className="fixed inset-x-0 bottom-0 z-50 w-full max-w-md mx-auto rounded-t-[24px] rounded-b-none border-t border-x-0 border-b-0 p-3.5 pb-safe sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-2.5 sm:w-[340px] sm:max-w-none sm:rounded-[20px] sm:border bg-[#FCFDFE]/95 dark:bg-slate-900/95 backdrop-blur-[20px] shadow-2xl border-sky-200/80 dark:border-slate-800 p-3 text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-150 origin-top-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Small arrow notch pointing to the More button (Desktop & Tablet only) */}
                  <div className="hidden sm:block absolute right-8 -top-1.5 w-3 h-3 rotate-45 bg-[#FCFDFE] dark:bg-slate-900 border-t border-l border-sky-200/80 dark:border-slate-800 pointer-events-none" />

                  {/* Mobile Drag Handle & Header */}
                  <div className="sm:hidden flex flex-col items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-2 shrink-0" />
                    <div className="w-full flex items-center justify-between px-1">
                      <span className="font-bold text-xs text-slate-800 dark:text-white">
                        {lang === 'ta' ? 'கூடுதல் விருப்பங்கள் / More Options' : 'More Options & Utilities'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowMoreMenu(false)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 active:scale-95"
                        aria-label="Close"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* SECTION 1: Layout Mode / திரை வடிவம் */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                        {lang === 'ta' ? 'திரை வடிவம் / Layout Mode' : 'Layout Mode / திரை வடிவம்'}
                      </p>
                      {isOverride && (
                        <button
                          type="button"
                          onClick={resetToAuto}
                          className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center space-x-1"
                          title="Reset to Auto Screen Detection"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>Reset</span>
                        </button>
                      )}
                    </div>

                    {/* Segmented Control: 4 equal buttons (Mobile, Tablet, Laptop, Auto), 2x2 grid on small screens */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60">
                      {/* Mobile Button */}
                      <button
                        type="button"
                        onClick={() => setMode('mobile')}
                        className={`min-h-[44px] py-2 px-1 flex flex-col items-center justify-center rounded-xl text-center transition-all duration-150 active:scale-95 ${
                          mode === 'mobile'
                            ? 'bg-sky-500 text-white shadow-sm font-bold ring-1 ring-sky-300 dark:ring-sky-600'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700/60 font-semibold'
                        }`}
                        title="Mobile View (< 768px)"
                      >
                        <Smartphone className="w-4 h-4 mb-1 shrink-0" />
                        <span className="text-[11px] leading-tight">Mobile</span>
                      </button>

                      {/* Tablet Button */}
                      <button
                        type="button"
                        onClick={() => setMode('tablet')}
                        className={`min-h-[44px] py-2 px-1 flex flex-col items-center justify-center rounded-xl text-center transition-all duration-150 active:scale-95 ${
                          mode === 'tablet'
                            ? 'bg-sky-500 text-white shadow-sm font-bold ring-1 ring-sky-300 dark:ring-sky-600'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700/60 font-semibold'
                        }`}
                        title="Tablet View (768 - 1199px)"
                      >
                        <Tablet className="w-4 h-4 mb-1 shrink-0" />
                        <span className="text-[11px] leading-tight">Tablet</span>
                      </button>

                      {/* Laptop Button */}
                      <button
                        type="button"
                        onClick={() => setMode('laptop')}
                        className={`min-h-[44px] py-2 px-1 flex flex-col items-center justify-center rounded-xl text-center transition-all duration-150 active:scale-95 ${
                          mode === 'laptop'
                            ? 'bg-sky-500 text-white shadow-sm font-bold ring-1 ring-sky-300 dark:ring-sky-600'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700/60 font-semibold'
                        }`}
                        title="Laptop View (≥ 1200px)"
                      >
                        <Laptop className="w-4 h-4 mb-1 shrink-0" />
                        <span className="text-[11px] leading-tight">Laptop</span>
                      </button>

                      {/* Auto Button */}
                      <button
                        type="button"
                        onClick={() => setMode('auto')}
                        className={`min-h-[44px] py-2 px-1 flex flex-col items-center justify-center rounded-xl text-center transition-all duration-150 active:scale-95 ${
                          mode === 'auto'
                            ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm font-bold'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700/60 font-semibold'
                        }`}
                        title="Auto Screen Detection"
                      >
                        <Sparkles className="w-4 h-4 mb-1 text-amber-400 shrink-0" />
                        <span className="text-[11px] leading-tight">Auto</span>
                      </button>
                    </div>
                  </div>

                  {/* Section Divider */}
                  <div className="my-2 border-t border-slate-200/70 dark:border-slate-800" />

                  {/* SECTION 2: Menu Rows (WhatsApp Hub, Loan Application Form, Install Web App) */}
                  <div className="space-y-2">
                    {/* 1. WhatsApp Hub */}
                    {onOpenWhatsAppHub && !isClient && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreMenu(false);
                          onOpenWhatsAppHub();
                        }}
                        className="w-full min-h-[58px] p-2.5 rounded-2xl bg-white/70 dark:bg-slate-800/50 hover:bg-sky-50/70 dark:hover:bg-sky-950/40 border border-slate-200/60 dark:border-slate-700/60 hover:border-sky-300 dark:hover:border-sky-700 flex items-center justify-between text-left transition-all duration-150 active:scale-[0.98] group"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                            <MessageSquare className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-800 dark:text-white truncate">
                              WhatsApp Hub
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-400 truncate">
                              {lang === 'ta' ? 'அறிவிப்புகள் & ரசீதுகள் அனுப்ப' : 'Share notices & receipts'}
                            </p>
                          </div>
                        </div>
                        <span className="ml-2 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200/80 dark:border-emerald-800/60 shrink-0">
                          Active
                        </span>
                      </button>
                    )}

                    {/* 2. Loan Application Form */}
                    {onOpenLoanForm && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreMenu(false);
                          onOpenLoanForm();
                        }}
                        className="w-full min-h-[58px] p-2.5 rounded-2xl bg-white/70 dark:bg-slate-800/50 hover:bg-sky-50/70 dark:hover:bg-sky-950/40 border border-slate-200/60 dark:border-slate-700/60 hover:border-sky-300 dark:hover:border-sky-700 flex items-center justify-between text-left transition-all duration-150 active:scale-[0.98] group"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-800 dark:text-white truncate">
                              Loan Application Form
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-400 truncate">
                              {lang === 'ta' ? 'கடன் விண்ணப்ப படிவம்' : 'Print blank borrower form'}
                            </p>
                          </div>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700/60 text-slate-400 dark:text-slate-300 flex items-center justify-center shrink-0 group-hover:text-sky-600 group-hover:bg-sky-100 dark:group-hover:bg-sky-900/60 group-hover:translate-x-0.5 transition-all">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </button>
                    )}

                    {/* 3. Install Web App */}
                    {!isInstalled && promptInstall && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreMenu(false);
                          promptInstall();
                        }}
                        className="w-full min-h-[58px] p-2.5 rounded-2xl bg-white/70 dark:bg-slate-800/50 hover:bg-sky-50/70 dark:hover:bg-sky-950/40 border border-slate-200/60 dark:border-slate-700/60 hover:border-sky-300 dark:hover:border-sky-700 flex items-center justify-between text-left transition-all duration-150 active:scale-[0.98] group"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                            <Download className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-800 dark:text-white truncate">
                              Install Web App
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-400 truncate">
                              {lang === 'ta' ? 'செயலியை நிறுவுக' : 'Add to Desktop / Mobile home'}
                            </p>
                          </div>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700/60 text-slate-400 dark:text-slate-300 flex items-center justify-center shrink-0 group-hover:text-amber-600 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/60 group-hover:translate-x-0.5 transition-all">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </button>
                    )}
                  </div>

                  {/* 4. Agent Filter for Owner */}
                  {isOwner && agentList.length > 0 && (
                    <>
                      <div className="my-2 border-t border-slate-200/70 dark:border-slate-800" />
                      <div className="p-2.5 rounded-2xl bg-white/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-0.5">
                          Filter Agent / கள முகவர்
                        </p>
                        <select
                          value={selectedAgent}
                          onChange={(e) => {
                            setSelectedAgent(e.target.value);
                            window.dispatchEvent(new CustomEvent('fintrack:filter-agent', { detail: e.target.value }));
                          }}
                          className="w-full h-8 px-2 rounded-lg bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 outline-none cursor-pointer"
                        >
                          <option value="all">All Agents / அனைத்து முகவர்கள்</option>
                          {agentList.map((a) => (
                            <option key={a._id || a.id} value={a._id || a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {/* User Profile Pill matching screenshot */}
          <div className="relative" ref={userMenuRef}>
            <div
              onClick={(e) => {
                e.stopPropagation();
                setShowUserMenu((prev) => !prev);
              }}
              className="flex items-center space-x-2 pl-1.5 pr-3 py-1 rounded-full border border-sky-200 dark:border-sky-800 bg-white/70 dark:bg-slate-800 shadow-xs cursor-pointer active:scale-95 transition"
              title="User Profile & Settings"
            >
              <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <div className="text-left hidden sm:block leading-tight">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                  {user?.name || 'Vasantha'}
                </span>
                <span className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-semibold block capitalize">
                  {user?.role === 'owner' ? 'Owner' : user?.role === 'emi_agent' ? 'EMI Agent' : user?.role === 'loan_agent' || user?.role === 'agent' ? 'Loan Agent' : user?.role === 'client' ? 'Client' : 'Staff'}
                </span>
              </div>
            </div>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-56 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800 p-3 z-50 text-xs space-y-2">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                  <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                    {user?.name || 'Administrator'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.phone || user?.role}</p>
                </div>

                {onOpenMoreSheet && (
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenMoreSheet();
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition text-left"
                  >
                    <MoreHorizontal className="w-4 h-4 text-slate-500" />
                    <span>Settings & Utilities</span>
                  </button>
                )}

                <button
                  onClick={logout}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-bold transition text-left"
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
