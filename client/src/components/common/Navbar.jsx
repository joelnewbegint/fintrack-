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

        {/* Right: DisplayModeSwitcher + WhatsApp + Loan Form + Install + Language + Theme + User Profile Pill */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          <div className="hidden lg:block">
            <DisplayModeSwitcher compact={false} showLabel={true} />
          </div>

          {/* Bell with 99+ badge */}
          <button
            onClick={onOpenNotifications}
            className="relative h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition active:scale-95"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute 1 top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white text-[8.5px] font-black flex items-center justify-center">
                {cappedNotificationBadge}
              </span>
            )}
          </button>

          {/* WhatsApp Web Button */}
          {onOpenWhatsAppHub && !isClient && (
            <button
              onClick={onOpenWhatsAppHub}
              className="hidden xl:flex items-center space-x-1.5 h-9 px-3 rounded-xl border border-emerald-300 dark:border-emerald-700/60 bg-white/70 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-bold text-emerald-700 dark:text-emerald-400 transition active:scale-95 shadow-xs"
              title="Open WhatsApp Hub"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
              <span>WhatsApp</span>
            </button>
          )}

          {/* Loan Form Button */}
          {onOpenLoanForm && (
            <button
              onClick={onOpenLoanForm}
              className="hidden xl:flex items-center space-x-1.5 h-9 px-3 rounded-xl border border-sky-300 dark:border-sky-700/60 bg-white/70 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-xs font-bold text-sky-700 dark:text-sky-300 transition active:scale-95 shadow-xs"
              title="Print Application Form"
            >
              <FileText className="w-3.5 h-3.5 text-sky-500" />
              <span>Loan Form</span>
            </button>
          )}

          {/* Install PWA Button */}
          {!isInstalled && promptInstall && (
            <button
              onClick={promptInstall}
              className="hidden 2xl:flex items-center space-x-1.5 h-9 px-3 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-white/70 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-xs font-bold text-amber-700 dark:text-amber-400 transition active:scale-95 shadow-xs"
              title="Install VK Banker App"
            >
              <Download className="w-3.5 h-3.5 text-amber-500" />
              <span>Install</span>
            </button>
          )}

          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="h-9 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center space-x-1 transition active:scale-95"
            title="Toggle Language / மொழி மாற்றம்"
          >
            <Globe className="w-3.5 h-3.5 text-sky-500" />
            <span className="text-[11px] font-black">{lang === 'ta' ? 'தமிழ்' : 'EN'}</span>
          </button>

          {/* Theme Switcher */}
          <button
            onClick={toggleTheme}
            className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center transition active:scale-95"
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
                  {user?.role === 'owner' ? 'Owner' : user?.role === 'client' ? 'Client' : 'Agent'}
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
