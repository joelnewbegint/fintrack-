import React, { useState } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Keyboard,
  TrendingUp,
  Bell,
} from 'lucide-react';

export const Sidebar = ({
  activeTab,
  setActiveTab,
  onOpenNotifications,
  unreadNotificationsCount = 0,
}) => {
  const { t, lang } = useLanguage();
  const { isOwner } = useAuth();
  const { isLaptop, isTablet, isMobile } = useDeviceMode();

  // For tablet mode, allow collapsing to icon-only or expanding
  const [collapsedTablet, setCollapsedTablet] = useState(true);

  if (isMobile) {
    // Hidden on Mobile mode (uses BottomNav)
    return null;
  }

  const isCollapsed = isTablet ? collapsedTablet : false;

  const navItems = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'customers', label: t('customers'), icon: Users },
    { id: 'loans', label: t('loans'), icon: Banknote },
    { id: 'payments', label: t('payments'), icon: Receipt },
    ...(isOwner ? [{ id: 'investments', label: t('investments'), icon: TrendingUp }] : []),
    { id: 'dailyClosing', label: t('dailyClosing'), icon: FileSpreadsheet },
    { id: 'calendar', label: t('calendar'), icon: CalendarDays },
    { id: 'settings', label: t('settings'), icon: SettingsIcon },
  ];

  return (
    <aside
      className={`glass-panel border-r border-white/60 dark:border-sky-800/40 min-h-[calc(100vh-4rem)] p-3 sm:p-4 space-y-6 transition-all duration-300 flex flex-col shrink-0 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Tablet Toggle Button */}
      {isTablet && (
        <button
          onClick={() => setCollapsedTablet(!collapsedTablet)}
          className="w-full flex items-center justify-center p-2 rounded-xl glass hover:bg-sky-50 dark:hover:bg-sky-950/40 text-sky-600 transition"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      )}

      <div className="space-y-1.5 flex-1">
        {!isCollapsed && (
          <p className="px-3 text-[11px] font-black uppercase tracking-wider text-sky-700/60 dark:text-sky-300/60">
            Navigation
          </p>
        )}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center px-2' : 'space-x-3 px-3.5'
                } py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 text-left ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-400 to-sky-500 text-white shadow-lg shadow-sky-500/30 ring-1 ring-sky-300'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-sky-950/40 hover:text-sky-600 dark:hover:text-sky-300'
                }`}
                title={isCollapsed ? item.label : undefined}
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
              isCollapsed ? 'justify-center px-2' : 'space-x-3 px-3.5'
            } py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 text-left text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-sky-950/40 hover:text-sky-600 dark:hover:text-sky-300`}
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
              <kbd className="px-1 rounded bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 font-bold">I</kbd>
              <span>Invest</span>
            </div>
            <div className="flex items-center space-x-1">
              <kbd className="px-1 rounded bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 font-bold">/</kbd>
              <span>Find</span>
            </div>
          </div>
        </div>
      )}

      {/* Role Reminder Box */}
      {!isCollapsed && (
        <div className="mt-auto p-3.5 rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/50 dark:to-slate-900/80 border border-sky-100 dark:border-sky-800/40 text-xs">
          <div className="flex items-center space-x-2 text-sky-700 dark:text-sky-300 font-bold mb-1">
            <ShieldAlert className="w-4 h-4 text-sky-500" />
            <span>{isOwner ? 'Financier Account' : 'Field Agent Mode'}</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
            {isOwner
              ? 'Full administrative control over loans, WhatsApp, audit logs, and settings.'
              : 'Authorized for daily collection recording and customer view.'}
          </p>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
