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
  ChevronDown,
  MoreHorizontal,
  Sparkles,
  Layers,
  Wallet,
  Check,
  MessageSquare,
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
  const { user, logout, isOwner, isClient } = useAuth();
  const { lang, toggleLanguage, t } = useLanguage();
  const { theme, setTheme, toggleTheme } = useTheme();
  const { isLaptop, isTablet, isMobile } = useDeviceMode();
  const { isInstalled, promptInstall } = usePWA();

  const [syncState, setSyncState] = useState(() => api.getSyncStatus?.() || { status: 'synced', pendingCount: 0 });
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [agentList, setAgentList] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('all');
  const moreMenuRef = useRef(null);
  const userMenuRef = useRef(null);

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
      </header>
    );
  }

  // -------------------------------------------------------------------------
  // DESKTOP & TABLET TOP BAR (Matches Exact Mockup)
  // -------------------------------------------------------------------------
  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="w-full px-3 sm:px-5 h-16 flex items-center justify-between gap-2.5">
        {/* Left: Sidebar Toggle + Wallet Icon Box + VK BANKER'S & FINANCE */}
        <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95"
              title="Toggle Sidebar (M)"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/25 shrink-0">
            <Wallet className="w-5 h-5" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-black text-sm sm:text-base text-sky-600 dark:text-sky-400 tracking-tight block leading-tight">
                VK BANKER'S & FINANCE
              </span>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full border border-sky-300 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300 hidden md:inline">
                VK BANKER'S
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium block truncate leading-none mt-0.5">
              Banker's & Finance Ledger
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
              <div
                className="absolute right-0 top-full mt-2 w-72 rounded-2xl glass-panel bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl border border-sky-200/80 dark:border-sky-800/80 p-2.5 z-50 text-xs space-y-1.5 animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 1. Layout Mode Switcher */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Layout Mode / திரை வடிவம்
                  </p>
                  <DisplayModeSwitcher compact={false} showLabel={true} />
                </div>

                {/* 2. WhatsApp Web Hub */}
                {onOpenWhatsAppHub && !isClient && (
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      onOpenWhatsAppHub();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 transition text-left group"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-xs">WhatsApp Hub</p>
                        <p className="text-[10px] text-slate-400">Share notices & receipts</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                      Active
                    </span>
                  </button>
                )}

                {/* 3. Loan Application Form */}
                {onOpenLoanForm && (
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      onOpenLoanForm();
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-700 dark:hover:text-sky-300 transition text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950/70 text-sky-600 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs">Loan Application Form</p>
                      <p className="text-[10px] text-slate-400">Print blank borrower form</p>
                    </div>
                  </button>
                )}

                {/* 4. Install App (PWA) */}
                {!isInstalled && promptInstall && (
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      promptInstall();
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-700 dark:hover:text-amber-300 transition text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-600 flex items-center justify-center shrink-0">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-xs">Install Web App</p>
                      <p className="text-[10px] text-slate-400">Add to Desktop / Mobile home</p>
                    </div>
                  </button>
                )}

                {/* 5. Agent Filter for Owner */}
                {isOwner && agentList.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
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
                )}
              </div>
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
