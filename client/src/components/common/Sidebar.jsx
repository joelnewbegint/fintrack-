import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useDeviceMode } from '../../context/DeviceModeContext';
import {
  LayoutDashboard,
  Users,
  Coins,
  Receipt,
  FileText,
  ArrowLeftRight,
  TrendingUp,
  Calendar,
  Settings as SettingsIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
  Smartphone,
  Send,
} from 'lucide-react';

export const Sidebar = ({
  activeTab,
  setActiveTab,
  onOpenNotifications,
  onOpenWhatsAppHub,
  unreadNotificationsCount = 0,
  isCollapsed = false,
  onToggleCollapsed,
  onOpenLoanForm,
}) => {
  const { lang } = useLanguage();
  const { user, isOwner, isClient } = useAuth();
  const { isLaptop, isMobile } = useDeviceMode();

  if (isMobile) {
    return null;
  }

  // Navigation Items matching the exact mockup
  const navItems = isClient
    ? [
        { id: 'dashboard', en: 'Dashboard', ta: 'முகப்பு', icon: LayoutDashboard },
        { id: 'loans', en: 'My Loans', ta: 'எனது கடன்கள்', icon: Coins },
        { id: 'payments', en: 'Collections', ta: 'செலுத்திய விவரம்', icon: Receipt },
        { id: 'settings', en: 'Settings', ta: 'அமைப்புகள்', icon: SettingsIcon },
      ]
    : [
        { id: 'dashboard', en: 'Dashboard', ta: 'முகப்பு', icon: LayoutDashboard },
        { id: 'customers', en: 'Customers', ta: 'வாடிக்கையாளர்கள்', icon: Users },
        { id: 'loans', en: 'Loans', ta: 'கடன் கணக்குகள்', icon: Coins },
        { id: 'payments', en: 'Payments', ta: 'தவணை வசூல்', icon: Receipt },
        { id: 'expenses', en: 'Expenses', ta: 'செலவுகள்', icon: ArrowLeftRight },
        { id: 'investments', en: 'Investments', ta: 'முதலீடுகள்', icon: TrendingUp },
        { id: 'dailyClosing', en: 'Daily Closing', ta: 'தினசரி கணக்கு', icon: FileText },
        { id: 'calendar', en: 'Calendar', ta: 'நாட்காட்டி', icon: Calendar },
        { id: 'settings', en: 'Settings', ta: 'அமைப்புகள்', icon: SettingsIcon },
      ];

  const cappedNotificationBadge =
    unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount;

  return (
    <aside
      className={`min-h-[calc(100vh-4rem)] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-700 dark:text-slate-200 transition-all duration-300 flex flex-col shrink-0 select-none shadow-sm border-r border-sky-100/80 dark:border-sky-900/40 relative z-20 ${
        isCollapsed ? 'w-16 sm:w-20 p-2 sm:p-2.5 items-center' : 'w-60 p-3.5 sm:p-4'
      }`}
    >
      {/* 1. Header or Collapse Toggle */}
      <div className="flex items-center justify-between pb-2 px-1">
        {!isCollapsed && (
          <span className="text-[10px] uppercase font-black tracking-widest text-sky-600/70 dark:text-sky-400/70">
            NAVIGATION
          </span>
        )}
        {onToggleCollapsed && (
          <button
            onClick={onToggleCollapsed}
            className="p-1 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800 transition mx-auto"
            title={isCollapsed ? 'Expand Navigation (M)' : 'Collapse Navigation (M)'}
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* 2. Navigation Items List */}
      <div className="space-y-1 mt-1 flex-1 w-full overflow-y-auto no-scrollbar">
        <nav className="space-y-1 w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.action) {
                    item.action();
                  } else {
                    setActiveTab(item.id);
                  }
                }}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center p-2.5' : 'space-x-3 px-3 py-2.5'
                } rounded-2xl text-left transition-all duration-200 relative ${
                  isActive
                    ? 'active-nav-pill bg-sky-400 text-white font-black shadow-md shadow-sky-400/30'
                    : 'text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50/70 dark:hover:bg-sky-950/40 font-bold'
                }`}
                title={`${item.en} / ${item.ta}`}
              >
                <Icon
                  className={`w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0 ${
                    isActive ? 'text-white' : 'text-sky-500'
                  }`}
                />
                {!isCollapsed && (
                  <span className="text-xs sm:text-[13px] font-bold leading-tight truncate">
                    {item.en}
                  </span>
                )}
              </button>
            );
          })}

          {/* Notifications Quick Item */}
          <button
            onClick={onOpenNotifications}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2.5' : 'space-x-3 px-3 py-2.5'
            } rounded-2xl text-left transition-all duration-200 text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50/70 dark:hover:bg-sky-950/40 font-bold`}
            title="Notifications / அறிவிப்புகள்"
          >
            <div className="relative shrink-0">
              <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-sky-500" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500" />
              )}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1 flex items-center justify-between">
                <span className="text-xs sm:text-[13px] font-bold leading-tight truncate">
                  Notifications
                </span>
                {unreadNotificationsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black">
                    {cappedNotificationBadge}
                  </span>
                )}
              </div>
            )}
          </button>

          {/* WhatsApp Web Quick Item with green "Send" pill */}
          {onOpenWhatsAppHub && (
            <button
              onClick={onOpenWhatsAppHub}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center p-2.5' : 'space-x-3 px-3 py-2.5'
              } rounded-2xl text-left transition-all duration-200 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 font-bold`}
              title="WhatsApp Web Hub"
            >
              <Smartphone className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-emerald-500 shrink-0" />
              {!isCollapsed && (
                <div className="min-w-0 flex-1 flex items-center justify-between">
                  <span className="text-xs sm:text-[13px] font-bold leading-tight truncate">
                    WhatsApp Web
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-black">
                    Send
                  </span>
                </div>
              )}
            </button>
          )}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
