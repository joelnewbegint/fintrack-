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
  BookmarkCheck,
  BarChart3,
  ArrowLeftRight,
  Settings as SettingsIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
  Smartphone,
  Keyboard,
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
        { id: 'loans', en: 'Loans', ta: 'கடன் கணக்குகள்', icon: Coins },
        { id: 'payments', en: 'Collections', ta: 'தவணை வசூல்', icon: Receipt },
        { id: 'customers', en: 'Customers', ta: 'வாடிக்கையாளர்கள்', icon: Users },
        {
          id: 'applications',
          en: 'Applications',
          ta: 'கடன் விண்ணப்பங்கள்',
          icon: FileText,
          action: onOpenLoanForm,
        },
        { id: 'schemes', en: 'Schemes', ta: 'திட்டங்கள்', icon: BookmarkCheck },
        { id: 'dailyClosing', en: 'Reports', ta: 'அறிக்கைகள்', icon: BarChart3 },
        { id: 'expenses', en: 'Transactions', ta: 'பரிவர்த்தனைகள்', icon: ArrowLeftRight },
        { id: 'settings', en: 'Settings', ta: 'அமைப்புகள்', icon: SettingsIcon },
      ];

  const cappedNotificationBadge =
    unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount;

  return (
    <aside
      className={`min-h-[calc(100vh-4rem)] bg-gradient-to-b from-[#0284c7] via-[#0369a1] to-[#075985] text-white transition-all duration-300 flex flex-col shrink-0 select-none shadow-xl border-r border-sky-900/40 relative z-20 ${
        isCollapsed ? 'w-16 sm:w-20 p-2 sm:p-2.5 items-center' : 'w-64 p-3.5 sm:p-4'
      }`}
    >
      {/* 1. Sidebar Brand Header */}
      {isCollapsed ? (
        <div className="w-full flex flex-col items-center pb-3 border-b border-sky-400/20">
          <div className="w-10 h-10 rounded-2xl bg-white text-sky-600 font-black text-sm flex items-center justify-center shadow-md">
            VK
          </div>
          {onToggleCollapsed && (
            <button
              onClick={onToggleCollapsed}
              className="mt-3 p-1.5 rounded-xl bg-sky-900/60 hover:bg-sky-800 text-sky-200 transition"
              title="Expand Navigation (M)"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between pb-3.5 border-b border-sky-400/20">
          <div className="flex items-center space-x-2.5 min-w-0">
            {/* VK Shield Logo */}
            <div className="w-9 h-9 rounded-2xl bg-white text-sky-600 font-black text-base flex items-center justify-center shadow-md shrink-0">
              VK
            </div>
            <div className="min-w-0">
              <h2 className="font-black text-sm text-white tracking-tight leading-tight truncate">
                VK Banker's & Finance
              </h2>
              <p className="text-[10px] text-sky-200 font-medium truncate">
                வி.கே. பேங்கர்ஸ் & பைனான்ஸ்
              </p>
            </div>
          </div>

          {onToggleCollapsed && (
            <button
              onClick={onToggleCollapsed}
              className="p-1 rounded-xl hover:bg-white/10 text-sky-200 hover:text-white transition"
              title="Collapse Navigation (M)"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* 2. Navigation Items List */}
      <div className="space-y-1 mt-3 flex-1 w-full overflow-y-auto no-scrollbar">
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
                  isCollapsed ? 'justify-center p-2.5' : 'space-x-3 px-3.5 py-2.5'
                } rounded-xl text-left transition-all duration-200 relative ${
                  isActive
                    ? 'bg-sky-400/90 text-white font-bold shadow-md shadow-sky-900/30 ring-1 ring-white/30'
                    : 'text-sky-100/85 hover:text-white hover:bg-white/10 font-medium'
                }`}
                title={`${item.en} / ${item.ta}`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive ? 'text-white' : 'text-sky-200/90'
                  }`}
                />
                {!isCollapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-[13px] font-bold leading-tight truncate">
                      {item.en}
                    </p>
                    <p className={`text-[10px] leading-tight truncate ${
                      isActive ? 'text-sky-100' : 'text-sky-200/70'
                    }`}>
                      {item.ta}
                    </p>
                  </div>
                )}
              </button>
            );
          })}

          {/* Notifications Quick Item */}
          <button
            onClick={onOpenNotifications}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center p-2.5' : 'space-x-3 px-3.5 py-2.5'
            } rounded-xl text-left transition-all duration-200 text-sky-100/85 hover:text-white hover:bg-white/10`}
            title="Notifications / அறிவிப்புகள்"
          >
            <div className="relative shrink-0">
              <Bell className="w-5 h-5 text-sky-200/90" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-400" />
              )}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1 flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-[13px] font-bold leading-tight">Notifications</p>
                  <p className="text-[10px] text-sky-200/70 leading-tight">அறிவிப்புகள்</p>
                </div>
                {unreadNotificationsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black">
                    {cappedNotificationBadge}
                  </span>
                )}
              </div>
            )}
          </button>
        </nav>
      </div>

      {/* 3. Bottom Growth Chart & Coin Graphic Illustration */}
      {!isCollapsed && (
        <div className="pt-2 mt-auto">
          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 relative overflow-hidden">
            {/* Background SVG Graphic: Growth Arrow with Coin Stacks */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-white">VK Portfolio</p>
                <p className="text-[9px] text-sky-200">Daily Financial Ledger</p>
              </div>
              <div className="w-12 h-10 shrink-0 opacity-90">
                <svg viewBox="0 0 64 48" fill="none" className="w-full h-full">
                  {/* Upward Line */}
                  <path
                    d="M 6 38 L 22 28 L 36 32 L 56 12"
                    stroke="#38bdf8"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Arrowhead */}
                  <path
                    d="M 46 12 H 56 V 22"
                    stroke="#38bdf8"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Coin Stacks */}
                  <ellipse cx="18" cy="40" rx="7" ry="2.5" fill="#bae6fd" />
                  <ellipse cx="18" cy="37" rx="7" ry="2.5" fill="#7dd3fc" />
                  <ellipse cx="32" cy="40" rx="8" ry="3" fill="#bae6fd" />
                  <ellipse cx="32" cy="36" rx="8" ry="3" fill="#7dd3fc" />
                  <ellipse cx="32" cy="32" rx="8" ry="3" fill="#38bdf8" />
                  <ellipse cx="48" cy="40" rx="9" ry="3.5" fill="#bae6fd" />
                  <ellipse cx="48" cy="35" rx="9" ry="3.5" fill="#7dd3fc" />
                  <ellipse cx="48" cy="30" rx="9" ry="3.5" fill="#38bdf8" />
                  <ellipse cx="48" cy="25" rx="9" ry="3.5" fill="#ffffff" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
