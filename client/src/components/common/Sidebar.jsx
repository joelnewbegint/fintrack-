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
  Layers,
  UserCheck,
  Clock,
  CalendarRange,
  CalendarCheck,
} from 'lucide-react';

export const Sidebar = ({
  activeTab,
  setActiveTab,
  selectedScheme,
  onOpenNotifications,
  onOpenWhatsAppHub,
  unreadNotificationsCount = 0,
  isCollapsed = false,
  onToggleCollapsed,
  onOpenLoanForm,
}) => {
  const { lang } = useLanguage();
  const { user, isOwner, isLoanAgent, isEmiAgent, isClient } = useAuth();
  const { isLaptop, isMobile } = useDeviceMode();

  if (isMobile) {
    return null;
  }

  // Role-specific navigation items with Loans divisions (Daily, Weekly, Monthly)
  let navItems = [];

  if (isClient) {
    navItems = [
      { id: 'dashboard', en: 'Dashboard', ta: 'முகப்பு', icon: LayoutDashboard },
      { id: 'loans', en: 'My Loans', ta: 'எனது கடன்கள்', icon: Coins },
      { id: 'payments', en: 'Collections', ta: 'செலுத்திய விவரம்', icon: Receipt },
      { id: 'settings', en: 'Settings', ta: 'அமைப்புகள்', icon: SettingsIcon },
    ];
  } else if (isEmiAgent) {
    // EMI Agent: ONLY EMI module + Settings
    navItems = [
      { id: 'emiDashboard', en: 'EMI Dashboard', ta: 'தவணை முகப்பு', icon: LayoutDashboard },
      { id: 'emiList', en: 'EMI Accounts', ta: 'மாத தவணை', icon: Layers },
      { id: 'settings', en: 'Settings', ta: 'அமைப்புகள்', icon: SettingsIcon },
    ];
  } else if (isLoanAgent) {
    // Loan Agent: ONLY Loans module (All, Daily, Weekly, Monthly) + Operations + Settings
    navItems = [
      { id: 'dashboard', en: 'Dashboard', ta: 'முகப்பு', icon: LayoutDashboard },
      { id: 'customers', en: 'Customers', ta: 'வாடிக்கையாளர்கள்', icon: Users },
      { id: 'loans', en: 'All Loans', ta: 'அனைத்து கடன்கள்', icon: Coins },
      { id: 'loans-daily', en: 'Daily Loans', ta: 'தினசரி கடன்', icon: Clock, isScheme: true, scheme: 'daily' },
      { id: 'loans-weekly', en: 'Weekly Loans', ta: 'வாராந்திர கடன்', icon: CalendarRange, isScheme: true, scheme: 'weekly' },
      { id: 'loans-monthly', en: 'Monthly Loans', ta: 'மாதாந்திர கடன்', icon: CalendarCheck, isScheme: true, scheme: 'monthly' },
      { id: 'payments', en: 'Payments', ta: 'தவணை வசூல்', icon: Receipt },
      { id: 'dailyClosing', en: 'Daily Closing', ta: 'தினசரி கணக்கு', icon: FileText },
      { id: 'calendar', en: 'Calendar', ta: 'நாட்காட்டி', icon: Calendar },
      { id: 'settings', en: 'Settings', ta: 'அமைப்புகள்', icon: SettingsIcon },
    ];
  } else {
    // Owner: Complete interface with dedicated Loans divisions (Daily, Weekly, Monthly)
    navItems = [
      { id: 'dashboard', en: 'Dashboard', ta: 'கடன் முகப்பு', icon: LayoutDashboard },
      { id: 'customers', en: 'Customers', ta: 'வாடிக்கையாளர்கள்', icon: Users },
      { id: 'loans', en: 'All Loans', ta: 'அனைத்து கடன்கள்', icon: Coins },
      { id: 'loans-daily', en: 'Daily Loans', ta: 'தினசரி கடன்', icon: Clock, isScheme: true, scheme: 'daily' },
      { id: 'loans-weekly', en: 'Weekly Loans', ta: 'வாராந்திர கடன்', icon: CalendarRange, isScheme: true, scheme: 'weekly' },
      { id: 'loans-monthly', en: 'Monthly Loans', ta: 'மாதாந்திர கடன்', icon: CalendarCheck, isScheme: true, scheme: 'monthly' },
      { id: 'payments', en: 'Payments', ta: 'தவணை வசூல்', icon: Receipt },
      { id: 'agents', en: 'Staff & Agents', ta: 'பணியாளர்கள்', icon: UserCheck },
      { id: 'expenses', en: 'Expenses', ta: 'செலவுகள்', icon: ArrowLeftRight },
      { id: 'investments', en: 'Investments', ta: 'முதலீடுகள்', icon: TrendingUp },
      { id: 'dailyClosing', en: 'Daily Closing', ta: 'தினசரி கணக்கு', icon: FileText },
      { id: 'calendar', en: 'Calendar', ta: 'நாட்காட்டி', icon: Calendar },
      { id: 'settings', en: 'Settings', ta: 'அமைப்புகள்', icon: SettingsIcon },
    ];
  }

  return (
    <aside
      className={`min-h-[calc(100vh-4rem)] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-700 dark:text-slate-200 transition-all duration-300 flex flex-col shrink-0 select-none shadow-sm border-r border-sky-100/80 dark:border-sky-900/40 sticky top-16 self-start max-h-[calc(100vh-4rem)] z-30 ${
        isCollapsed ? 'w-16 sm:w-20 p-2 sm:p-2.5 items-center' : 'w-60 p-3.5 sm:p-4'
      }`}
    >
      {/* Header or Collapse Toggle */}
      <div className="flex items-center justify-between pb-2 px-1">
        {!isCollapsed && (
          <span className="text-[10px] uppercase font-black tracking-widest text-sky-600/70 dark:text-sky-400/70">
            {isEmiAgent ? 'EMI NAVIGATION' : isLoanAgent ? 'LOAN NAVIGATION' : 'LOANS NAVIGATION'}
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

      {/* Navigation Items List */}
      <div className="space-y-1 mt-1 flex-1 w-full overflow-y-auto no-scrollbar">
        <nav className="space-y-1 w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.id === 'loans'
                ? activeTab === 'loans'
                : item.id === 'loans-daily'
                ? activeTab === 'scheme-loans' && selectedScheme === 'daily'
                : item.id === 'loans-weekly'
                ? activeTab === 'scheme-loans' && selectedScheme === 'weekly'
                : item.id === 'loans-monthly'
                ? activeTab === 'scheme-loans' && selectedScheme === 'monthly'
                : activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center rounded-2xl transition-all duration-150 group font-bold ${
                  isCollapsed
                    ? 'justify-center p-3'
                    : item.isScheme
                    ? 'pl-7 pr-3 py-2 space-x-2.5 text-left text-xs'
                    : 'px-3.5 py-2.5 space-x-3 text-left'
                } ${
                  isActive
                    ? item.isScheme && item.scheme === 'daily'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/20'
                      : item.isScheme && item.scheme === 'weekly'
                      ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-md shadow-sky-500/20'
                      : item.isScheme && item.scheme === 'monthly'
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/20'
                      : 'btn-sky-primary text-white shadow-md shadow-sky-500/20'
                    : item.isScheme
                    ? 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-600 dark:hover:text-sky-400'
                }`}
                title={isCollapsed ? (lang === 'ta' ? item.ta : item.en) : undefined}
              >
                <Icon
                  className={`shrink-0 ${isCollapsed ? 'w-5 h-5' : item.isScheme ? 'w-3.5 h-3.5' : 'w-4 h-4'} ${
                    isActive
                      ? 'text-white'
                      : item.isScheme && item.scheme === 'daily'
                      ? 'text-amber-500'
                      : item.isScheme && item.scheme === 'weekly'
                      ? 'text-sky-500'
                      : item.isScheme && item.scheme === 'monthly'
                      ? 'text-emerald-500'
                      : 'text-slate-400 group-hover:text-sky-500'
                  }`}
                />
                {!isCollapsed && (
                  <>
                    <span className={`truncate tracking-wide ${item.isScheme ? 'text-[11.5px]' : 'text-xs'}`}>
                      {lang === 'ta' ? item.ta : item.en}
                    </span>
                    {item.isScheme && (
                      <span
                        className={`ml-auto text-[9px] px-1.5 py-0.2 rounded font-black shrink-0 ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.scheme === 'daily' ? 'Daily' : item.scheme === 'weekly' ? 'Weekly' : 'Monthly'}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* WhatsApp Web shortcut in sidebar */}
      {!isCollapsed && onOpenWhatsAppHub && (
        <div className="pt-3 border-t border-sky-100/80 dark:border-sky-900/40 mt-auto">
          <button
            onClick={() => onOpenWhatsAppHub({})}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 hover:bg-emerald-100 transition shadow-xs"
          >
            <div className="flex items-center space-x-2">
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp Web</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-200/80 text-emerald-800 font-black">
              Send
            </span>
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
