import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useDeviceMode } from '../../context/DeviceModeContext';
import { usePWA } from '../../context/PWAContext';
import {
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
  RefreshCw,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Sparkles,
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
  const { user, logout, isOwner, isLoanAgent, isEmiAgent, isClient } = useAuth();
  const { lang, toggleLanguage } = useLanguage();
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
  // MOBILE TOP BAR (<640px)
  // -------------------------------------------------------------------------
  if (isMobile) {
    return (
      <header className="sticky top-0 z-40 w-full bg-white/85 backdrop-blur-md border-b border-white/90 shadow-ocean transition-colors pt-safe">
        <div className="px-3 h-14 flex items-center justify-between gap-2 max-w-full">
          {/* Left: Brand Icon + Title */}
          <div className="flex items-center space-x-2 shrink-0 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#6FB4F2] to-[#8EC5F5] text-ink flex items-center justify-center shadow-xs border border-white shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-black text-xs text-ink tracking-tight truncate leading-tight">
                {lang === 'ta' ? 'வி.கே. பேங்கர்ஸ்' : "VK BANKER'S"}
              </span>
              <span className="text-[9px] text-muted font-bold tracking-tight truncate">
                {isEmiAgent ? 'EMI Agent' : isLoanAgent ? 'Loan Agent' : 'Finance'}
              </span>
            </div>
          </div>

          {/* Right: Search + Language + Profile */}
          <div className="flex items-center space-x-1.5 shrink-0">
            {/* Search */}
            <button
              onClick={onOpenSearch}
              className="w-8 h-8 rounded-full bg-white/80 border border-[#BFE3FA] text-muted hover:text-ink flex items-center justify-center transition active:scale-95 shadow-xs"
              aria-label="Search"
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="h-8 px-2 rounded-full bg-white/80 border border-[#BFE3FA] text-[10px] font-black text-ink flex items-center space-x-0.5 active:scale-95 shadow-xs"
              title="Toggle Language"
            >
              <Globe className="w-3 h-3 text-[#1F6FC8]" />
              <span>{lang === 'ta' ? 'தமிழ்' : 'EN'}</span>
            </button>

            {/* Notifications */}
            <button
              onClick={onOpenNotifications}
              className="relative w-8 h-8 rounded-full bg-white/80 border border-[#BFE3FA] text-ink flex items-center justify-center transition active:scale-95 shadow-xs"
              aria-label="Notifications"
            >
              <Bell className="w-3.5 h-3.5 text-ink" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#9B2C2C] text-white text-[8px] font-black flex items-center justify-center">
                  {cappedNotificationBadge}
                </span>
              )}
            </button>

            {/* Profile Avatar */}
            <button
              onClick={onOpenMoreSheet || logout}
              className="w-8 h-8 rounded-full bg-[#6FB4F2] text-ink font-black text-xs flex items-center justify-center shadow-xs border border-white"
            >
              {user?.name ? user.name[0].toUpperCase() : 'V'}
            </button>
          </div>
        </div>

        {/* Mobile (Owner Only): Single Swap Chip Toggle */}
        {isOwner && (
          <div className="flex items-center justify-center pb-2 px-3 pt-1 border-t border-[#BFE3FA]/50">
            <SingleSwapChip activeMode="loans" onToggle={handleSwitchToEmi} />
          </div>
        )}
      </header>
    );
  }

  // -------------------------------------------------------------------------
  // DESKTOP & TABLET TOP BAR
  // -------------------------------------------------------------------------
  return (
    <header className="sticky top-0 z-40 w-full bg-white/75 backdrop-blur-[20px] border-b border-[#D5E9FA] shadow-[0_4px_20px_rgba(8,120,209,0.06)] transition-colors">
      <div className="w-full px-3 sm:px-5 h-16 flex items-center justify-between gap-2.5">
        {/* Left: Sidebar Toggle + Luxury Wallet Monogram + VK BANKER'S */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-[#647C95] hover:text-[#183653] hover:bg-[#EAF5FF] transition active:scale-95"
              title="Toggle Sidebar (M)"
              aria-label="Toggle Navigation Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          {/* Premium Ocean Brand Icon */}
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-[#0878D1] to-[#064B8E] text-white flex items-center justify-center shadow-md shadow-[#0878D1]/20 shrink-0 border border-white">
            <Wallet className="w-5 h-5 drop-shadow-xs" />
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#18A879] ring-2 ring-white"
              title="System Online"
            />
          </div>

          {/* Brand Name */}
          <div className="flex flex-col justify-center min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-black text-sm sm:text-base text-[#183653] tracking-tight leading-tight whitespace-nowrap">
                {lang === 'ta' ? 'வி.கே. பேங்கர்ஸ் & பைனான்ஸ்' : "VK BANKER'S & FINANCE"}
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA] tracking-wide hidden md:inline-flex items-center">
                {lang === 'ta' ? "VK Banker's" : 'வி.கே.'}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Search pill & Loans Shortcut */}
        <div className="flex-1 max-w-xs sm:max-w-md mx-1 sm:mx-2 flex items-center space-x-2">
          <button
            onClick={onOpenSearch}
            className="flex-1 h-9 flex items-center justify-between px-3.5 rounded-full bg-white/80 border border-[#D5E9FA] text-xs text-[#647C95] hover:border-[#55B8F5] hover:text-[#183653] transition shadow-xs"
          >
            <div className="flex items-center space-x-2 min-w-0">
              <Search className="w-3.5 h-3.5 text-[#647C95] shrink-0" />
              <span className="truncate text-[11px] font-medium">{lang === 'ta' ? 'தேடல் / Search...' : 'Search customers, loans...'}</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#EAF5FF] text-[#0878D1] font-bold shrink-0">
              /
            </span>
          </button>

          {/* Loans Shortcut */}
          <button
            onClick={onOpenLoanForm || onOpenLoans || (() => {
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/loans');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            })}
            className="hidden xl:inline-flex items-center space-x-1.5 h-9 px-3 rounded-full bg-white/80 border border-[#D5E9FA] hover:bg-[#EAF5FF] hover:border-[#55B8F5] text-xs font-bold text-[#183653] transition shadow-xs shrink-0"
            title="View Loans"
          >
            <Coins className="w-3.5 h-3.5 text-[#0878D1]" />
            <span>{lang === 'ta' ? 'கடன்கள்' : 'Loans'}</span>
          </button>
        </div>

        {/* Center (Owner Only): Single Swap Chip Toggle */}
        {isOwner && (
          <div className="hidden md:flex items-center shrink-0">
            <SingleSwapChip activeMode="loans" onToggle={handleSwitchToEmi} />
          </div>
        )}

        {/* Right: Synced Pill + Bell + EN/Tamil + ⋯ More ▾ + Profile Avatar */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Synced Pill */}
          <button
            onClick={handleSyncClick}
            className="h-9 px-3 rounded-full bg-white/80 border border-[#D5E9FA] text-xs font-bold text-[#183653] hover:bg-[#EAF5FF] flex items-center space-x-1.5 transition active:scale-95 shadow-xs"
            title="Cloud Sync Status"
          >
            {isManualSyncing || syncState.status === 'syncing' ? (
              <RefreshCw className="w-3 h-3 text-[#0878D1] animate-spin" />
            ) : syncState.status === 'synced' ? (
              <span className="w-2 h-2 rounded-full bg-[#18A879] shrink-0" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-[#8A4A1F] shrink-0 animate-pulse" />
            )}
            <span className="text-[11px] font-bold">{syncState.status === 'synced' ? 'Synced' : 'Offline'}</span>
          </button>

          {/* Notification Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative h-9 w-9 rounded-full bg-white/80 border border-[#D5E9FA] hover:bg-[#EAF5FF] text-[#183653] flex items-center justify-center transition active:scale-95 shadow-xs"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 text-[#183653]" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[#9B2C2C] text-white text-[8.5px] font-black flex items-center justify-center shadow-xs">
                {cappedNotificationBadge}
              </span>
            )}
          </button>

          {/* Quick Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="h-9 px-3 rounded-full bg-white/80 border border-[#D5E9FA] hover:bg-[#EAF5FF] text-xs font-black text-[#183653] flex items-center space-x-1 transition active:scale-95 shadow-xs"
            title="Toggle Language / மொழி மாற்றம்"
          >
            <Globe className="w-3.5 h-3.5 text-[#0878D1]" />
            <span className="text-[11px] font-black">{lang === 'ta' ? 'தமிழ்' : 'EN'}</span>
          </button>

          {/* Role Badge */}
          <div className="hidden lg:flex items-center space-x-1 px-2.5 py-1 rounded-full bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA] text-[10.5px] font-black">
            <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{isOwner ? 'OWNER' : isLoanAgent ? 'LOAN AGENT' : isEmiAgent ? 'EMI AGENT' : 'STAFF'}</span>
          </div>

          {/* ⋯ More ▾ Dropdown */}
          <div className="relative" ref={moreMenuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMoreMenu((prev) => !prev);
                setShowUserMenu(false);
              }}
              className={`h-9 px-3 rounded-full border text-xs font-bold flex items-center space-x-1.5 transition active:scale-95 shadow-xs ${
                showMoreMenu
                  ? 'bg-[#EAF5FF] border-[#55B8F5] text-[#0878D1] ring-2 ring-[#0878D1]/20'
                  : 'bg-white/80 border-[#D5E9FA] text-[#183653] hover:bg-[#EAF5FF]'
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
                <div
                  className="fixed inset-0 bg-[#2B3A4A]/20 backdrop-blur-xs z-40 transition-opacity duration-150"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMoreMenu(false);
                  }}
                  aria-hidden="true"
                />

                <div
                  className="fixed inset-x-0 bottom-0 z-50 w-full max-w-md mx-auto rounded-t-[24px] sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-2.5 sm:w-[340px] sm:max-w-none sm:rounded-[20px] bg-white/95 backdrop-blur-md shadow-ocean-lg border border-[#BFE3FA] p-3 text-xs space-y-2.5 animate-in fade-in zoom-in-95 duration-150 origin-top-right text-ink"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Mobile Drag Handle */}
                  <div className="sm:hidden flex flex-col items-center pb-2 border-b border-[#BFE3FA]">
                    <div className="w-12 h-1.5 rounded-full bg-[#BFE3FA] mx-auto mb-2 shrink-0" />
                    <div className="w-full flex items-center justify-between px-1">
                      <span className="font-bold text-xs text-ink">
                        {lang === 'ta' ? 'கூடுதல் விருப்பங்கள்' : 'More Options & Utilities'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowMoreMenu(false)}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-ink active:scale-95"
                        aria-label="Close"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* SECTION 1: Layout Mode */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[10px] font-bold text-muted uppercase tracking-wider">
                        {lang === 'ta' ? 'திரை வடிவம் / Layout Mode' : 'Layout Mode'}
                      </p>
                      {isOverride && (
                        <button
                          type="button"
                          onClick={resetToAuto}
                          className="text-[10px] font-bold text-[#1F6FC8] hover:underline flex items-center space-x-1"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>Reset</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-2xl bg-[#F4FAFF] border border-[#BFE3FA]">
                      <button
                        type="button"
                        onClick={() => setMode('mobile')}
                        className={`min-h-[44px] py-2 px-1 flex flex-col items-center justify-center rounded-xl text-center transition-all duration-150 active:scale-95 ${
                          mode === 'mobile'
                            ? 'bg-[#6FB4F2] text-ink shadow-sm font-bold'
                            : 'text-muted hover:bg-white font-semibold'
                        }`}
                      >
                        <Smartphone className="w-4 h-4 mb-1 shrink-0" />
                        <span className="text-[11px] leading-tight">Mobile</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMode('tablet')}
                        className={`min-h-[44px] py-2 px-1 flex flex-col items-center justify-center rounded-xl text-center transition-all duration-150 active:scale-95 ${
                          mode === 'tablet'
                            ? 'bg-[#6FB4F2] text-ink shadow-sm font-bold'
                            : 'text-muted hover:bg-white font-semibold'
                        }`}
                      >
                        <Tablet className="w-4 h-4 mb-1 shrink-0" />
                        <span className="text-[11px] leading-tight">Tablet</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMode('laptop')}
                        className={`min-h-[44px] py-2 px-1 flex flex-col items-center justify-center rounded-xl text-center transition-all duration-150 active:scale-95 ${
                          mode === 'laptop'
                            ? 'bg-[#6FB4F2] text-ink shadow-sm font-bold'
                            : 'text-muted hover:bg-white font-semibold'
                        }`}
                      >
                        <Laptop className="w-4 h-4 mb-1 shrink-0" />
                        <span className="text-[11px] leading-tight">Laptop</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMode('auto')}
                        className={`min-h-[44px] py-2 px-1 flex flex-col items-center justify-center rounded-xl text-center transition-all duration-150 active:scale-95 ${
                          mode === 'auto'
                            ? 'bg-ink text-white shadow-sm font-bold'
                            : 'text-muted hover:bg-white font-semibold'
                        }`}
                      >
                        <Sparkles className="w-4 h-4 mb-1 text-[#6FB4F2] shrink-0" />
                        <span className="text-[11px] leading-tight">Auto</span>
                      </button>
                    </div>
                  </div>

                  {/* Section Divider */}
                  <div className="my-2 border-t border-[#BFE3FA]" />

                  {/* SECTION 2: Menu Rows */}
                  <div className="space-y-2">
                    {onOpenWhatsAppHub && !isClient && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreMenu(false);
                          onOpenWhatsAppHub();
                        }}
                        className="w-full min-h-[54px] p-2.5 rounded-2xl bg-white/80 hover:bg-[#F4FAFF] border border-[#BFE3FA] flex items-center justify-between text-left transition-all duration-150 active:scale-[0.98] group"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-[#CDEFE0] text-[#1F6B4F] flex items-center justify-center shrink-0">
                            <MessageSquare className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-ink truncate">WhatsApp Hub</p>
                            <p className="text-[11px] text-muted truncate">
                              {lang === 'ta' ? 'அறிவிப்புகள் & ரசீதுகள் அனுப்ப' : 'Share notices & receipts'}
                            </p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-[#CDEFE0] text-[#1F6B4F] text-[10px] font-bold border border-[#1F6B4F]/20">
                          Active
                        </span>
                      </button>
                    )}

                    {onOpenLoanForm && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreMenu(false);
                          onOpenLoanForm();
                        }}
                        className="w-full min-h-[54px] p-2.5 rounded-2xl bg-white/80 hover:bg-[#F4FAFF] border border-[#BFE3FA] flex items-center justify-between text-left transition-all duration-150 active:scale-[0.98] group"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-[#BFE3FA] text-[#1F6FC8] flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-ink truncate">Loan Application Form</p>
                            <p className="text-[11px] text-muted truncate">
                              {lang === 'ta' ? 'கடன் விண்ணப்ப படிவம்' : 'Print blank borrower form'}
                            </p>
                          </div>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-[#F4FAFF] text-muted flex items-center justify-center shrink-0 group-hover:text-ink transition-all">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </button>
                    )}

                    {!isInstalled && promptInstall && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreMenu(false);
                          promptInstall();
                        }}
                        className="w-full min-h-[54px] p-2.5 rounded-2xl bg-white/80 hover:bg-[#F4FAFF] border border-[#BFE3FA] flex items-center justify-between text-left transition-all duration-150 active:scale-[0.98] group"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-[#6FB4F2]/30 text-[#1F6FC8] flex items-center justify-center shrink-0">
                            <Download className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-ink truncate">Install Web App</p>
                            <p className="text-[11px] text-muted truncate">
                              {lang === 'ta' ? 'செயலியை நிறுவுக' : 'Add to home screen'}
                            </p>
                          </div>
                        </div>
                        <div className="w-7 h-7 rounded-full bg-[#F4FAFF] text-muted flex items-center justify-center shrink-0 group-hover:text-ink transition-all">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </button>
                    )}
                  </div>

                  {/* Agent Filter for Owner */}
                  {isOwner && agentList.length > 0 && (
                    <>
                      <div className="my-2 border-t border-[#BFE3FA]" />
                      <div className="p-2.5 rounded-2xl bg-[#F4FAFF] border border-[#BFE3FA] space-y-1.5">
                        <p className="text-[10px] font-bold text-muted uppercase tracking-wider px-0.5">
                          Filter Agent / கள முகவர்
                        </p>
                        <select
                          value={selectedAgent}
                          onChange={(e) => {
                            setSelectedAgent(e.target.value);
                            window.dispatchEvent(new CustomEvent('fintrack:filter-agent', { detail: e.target.value }));
                          }}
                          className="w-full h-8 px-2 rounded-lg bg-white text-xs font-bold text-ink border border-[#BFE3FA] outline-none cursor-pointer"
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

          {/* User Profile Pill */}
          <div className="relative" ref={userMenuRef}>
            <div
              onClick={(e) => {
                e.stopPropagation();
                setShowUserMenu((prev) => !prev);
              }}
              className="flex items-center space-x-2 pl-1.5 pr-3 py-1 rounded-full border border-[#BFE3FA] bg-white/80 shadow-xs cursor-pointer active:scale-95 transition"
              title="User Profile & Settings"
            >
              <div className="w-7 h-7 rounded-full bg-[#6FB4F2] text-ink flex items-center justify-center font-bold text-xs shadow-xs border border-white">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <div className="text-left hidden sm:block leading-tight">
                <span className="text-xs font-bold text-ink block">
                  {user?.name || 'Vasantha'}
                </span>
                <span className="text-[9.5px] text-[#1F6FC8] font-bold block capitalize">
                  {user?.role === 'owner' ? 'Owner' : user?.role === 'emi_agent' ? 'EMI Agent' : user?.role === 'loan_agent' || user?.role === 'agent' ? 'Loan Agent' : user?.role === 'client' ? 'Client' : 'Staff'}
                </span>
              </div>
            </div>

            {showUserMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-56 rounded-2xl bg-white/95 backdrop-blur-md shadow-ocean-lg border border-[#BFE3FA] p-3 z-50 text-xs space-y-2 text-ink">
                <div className="border-b border-[#BFE3FA] pb-2">
                  <p className="font-bold text-sm text-ink truncate">
                    {user?.name || 'Administrator'}
                  </p>
                  <p className="text-[11px] text-muted truncate">{user?.phone || user?.role}</p>
                </div>

                {onOpenMoreSheet && (
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenMoreSheet();
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-ink hover:bg-[#F4FAFF] font-bold transition text-left"
                  >
                    <MoreHorizontal className="w-4 h-4 text-muted" />
                    <span>Settings & Utilities</span>
                  </button>
                )}

                <button
                  onClick={logout}
                  className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-[#9B2C2C] hover:bg-[#FFD6D2]/60 font-bold transition text-left"
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
