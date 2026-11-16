import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useDeviceMode } from '../../context/DeviceModeContext';
import {
  LayoutDashboard,
  Users,
  Banknote,
  Receipt,
  FileSpreadsheet,
  CalendarDays,
  Settings as SettingsIcon,
  ShieldAlert,
  PanelLeftClose,
  PanelLeftOpen,
  Keyboard,
  TrendingUp,
  Bell,
  Smartphone,
} from 'lucide-react';

export const Sidebar = ({
  activeTab,
  setActiveTab,
  onOpenNotifications,
  onOpenWhatsAppHub,
  unreadNotificationsCount = 0,
  isCollapsed = false,
  onToggleCollapsed,
}) => {
  const { t, lang } = useLanguage();
  const { isOwner, isClient } = useAuth();
  const { isLaptop, isMobile } = useDeviceMode();

  if (isMobile) {
    // Hidden on Mobile mode (uses BottomNav)
    return null;
  }

  const navItems = isClient
    ? [
        { id: 'dashboard', label: lang === 'ta' ? 'முகப்பு' : 'Overview', icon: LayoutDashboard },
        { id: 'loans', label: lang === 'ta' ? 'எனது கடன்கள்' : 'My Loans', icon: Banknote },
        { id: 'payments', label: lang === 'ta' ? 'செலுத்திய விவரம்' : 'Payment History', icon: Receipt },
        { id: 'settings', label: lang === 'ta' ? 'சுயவிவரம் & அமைப்புகள்' : 'Profile & Settings', icon: SettingsIcon },
      ]
    : [
        { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
        { id: 'customers', label: t('customers'), icon: Users },
        { id: 'loans', label: t('loans'), icon: Banknote },
        { id: 'payments', label: t('payments'), icon: Receipt },
        { id: 'expenses', label: t('expenses'), icon: Receipt },
        ...(isOwner ? [{ id: 'investments', label: t('investments'), icon: TrendingUp }] : []),
        { id: 'dailyClosing', label: t('dailyClosing'), icon: FileSpreadsheet },
        { id: 'calendar', label: t('calendar'), icon: CalendarDays },
        { id: 'settings', label: t('settings'), icon: SettingsIcon },
      ];

  return (
    <aside
      className={`glass-panel border-r border-white/60 dark:border-sky-800/40 min-h-[calc(100vh-4rem)] space-y-4 transition-all duration-300 flex flex-col shrink-0 select-none ${
        isCollapsed ? 'w-16 sm:w-20 p-2 sm:p-2.5 items-center' : 'w-64 p-3 sm:p-4'
      }`}
    >
      {/* Sidebar Header with Minimize / Expand Option */}
      {isCollapsed ? (
        <div className="w-full flex justify-center pb-1">
          {onToggleCollapsed && (
            <button
              onClick={onToggleCollapsed}
              className="w-11 h-11 flex items-center justify-center rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200/80 dark:border-sky-800 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition shadow-xs active:scale-95"
              title={lang === 'ta' ? 'வழிசெலுத்தல் விரிவாக்கு (M)' : 'Expand Navigation (Press M)'}
              aria-label="Expand Navigation"
            >
              <PanelLeftOpen className="w-5 h-5 stroke-[2.5]" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between px-1.5 pb-2.5 border-b border-sky-100/70 dark:border-sky-900/40">
          <span className="text-[11px] font-black uppercase tracking-wider text-sky-800/70 dark:text-sky-300/70">
            {lang === 'ta' ? 'வழிசெலுத்தல்' : 'Navigation'}
          </span>
          {onToggleCollapsed && (
            <button
              onClick={onToggleCollapsed}
              className="p-1.5 rounded-xl hover:bg-sky-50 dark:hover:bg-sky-950/60 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 border border-transparent hover:border-sky-200 dark:hover:border-sky-800 transition active:scale-95"
              title={lang === 'ta' ? 'வழிசெலுத்தல் சுருக்கு (M)' : 'Minimize Navigation (Press M)'}
              aria-label="Minimize Navigation"
            >
              <PanelLeftClose className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      )}

      {/* Nav Items List */}
      <div className="space-y-1.5 flex-1 w-full">
        <nav className="space-y-1.5 w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center p-3' : 'space-x-3 px-3.5 py-3'
                } rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 text-left ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-400 to-sky-500 text-white shadow-lg shadow-sky-500/30 ring-1 ring-sky-300'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-sky-950/40 hover:text-sky-600 dark:hover:text-sky-300'
                }`}
                title={item.label}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}

          {/* Notifications Quick Item */}
          <button
            onClick={onOpenNotifications}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-3' : 'space-x-3 px-3.5 py-3'
            } rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 text-left text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-sky-950/40 hover:text-sky-600 dark:hover:text-sky-300`}
            title={lang === 'ta' ? 'அறிவிப்புகள்' : 'Notifications & Alerts'}
          >
            <div className="relative shrink-0">
              <Bell className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              )}
            </div>
            {!isCollapsed && (
              <div className="flex items-center justify-between flex-1 min-w-0">
                <span className="truncate">{lang === 'ta' ? 'அறிவிப்புகள்' : 'Notifications'}</span>
                {unreadNotificationsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-black text-[10px]">
                    {unreadNotificationsCount}
                  </span>
                )}
              </div>
            )}
          </button>

          {/* WhatsApp Hub Quick Item - Staff/Owner only */}
          {!isClient && (
            <button
              onClick={onOpenWhatsAppHub}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center p-3' : 'space-x-3 px-3.5 py-3'
              } rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 text-left text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40`}
              title={lang === 'ta' ? 'வாட்ஸ்அப் லாகின் & செய்தி' : 'WhatsApp Web & Quick Send'}
            >
              <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              {!isCollapsed && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span className="truncate">{lang === 'ta' ? 'வாட்ஸ்அப்' : 'WhatsApp Web'}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold text-[10px]">
                    Send
                  </span>
                </div>
              )}
            </button>
          )}
        </nav>
      </div>

      {/* Laptop Keyboard Shortcuts Legend */}
      {isLaptop && !isCollapsed && (
        <div className="p-3 rounded-2xl glass border border-sky-200/50 dark:border-sky-800/40 text-[11px] space-y-1.5">
          <div className="flex items-center space-x-1.5 text-sky-700 dark:text-sky-300 font-bold">
            <Keyboard className="w-3.5 h-3.5" />
            <span>Shortcuts</span>
          </div>
          <div className="grid grid-cols-4 gap-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
            <div className="flex items-center space-x-1">
              <kbd className="px-1 rounded bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 font-bold">N</kbd>
              <span>Loan</span>
            </div>
            <div className="flex items-center space-x-1">
              <kbd className="px-1 rounded bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 font-bold">P</kbd>
              <span>Pay</span>
            </div>
            <div className="flex items-center space-x-1">
              <kbd className="px-1 rounded bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 font-bold">M</kbd>
              <span>Nav</span>
            </div>
            <div className="flex items-center space-x-1">
              <kbd className="px-1 rounded bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 font-bold">/</kbd>
              <span>Find</span>
            </div>
          </div>
        </div>
      )}

      {/* Role Indicator / Reminder */}
      {isCollapsed ? (
        <div
          className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/40 cursor-default"
          title={isOwner ? 'Financier Account (நிர்வாகி)' : isClient ? 'Client Account (வாடிக்கையாளர்)' : 'Field Agent Mode (வசூல் முகவர்)'}
        >
          <ShieldAlert className="w-5 h-5 text-sky-500" />
        </div>
      ) : (
        <div className="mt-auto p-3.5 rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/50 dark:to-slate-900/80 border border-sky-100 dark:border-sky-800/40 text-xs">
          <div className="flex items-center space-x-2 text-sky-700 dark:text-sky-300 font-bold mb-1">
            <ShieldAlert className="w-4 h-4 text-sky-500" />
            <span>{isOwner ? 'Financier Account' : isClient ? 'Client Account' : 'Field Agent Mode'}</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
            {isOwner
              ? 'Full administrative control over loans, WhatsApp, audit logs, and settings.'
              : isClient
              ? 'Personal account: view your registered loans, repayment dues, and profile.'
              : 'Authorized for daily collection recording and customer view.'}
          </p>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
