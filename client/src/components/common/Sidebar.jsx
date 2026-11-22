import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useDeviceMode } from '../../context/DeviceModeContext';
import api from '../../services/api';
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
  Smartphone,
  Layers,
  UserCheck,
  ChevronDown,
  Sun,
  CalendarRange,
  Clock,
  Archive,
} from 'lucide-react';

export const Sidebar = ({
  activeTab,
  setActiveTab,
  selectedScheme = 'daily',
  onSelectScheme,
  onOpenNotifications,
  onOpenWhatsAppHub,
  unreadNotificationsCount = 0,
  isCollapsed = false,
  onToggleCollapsed,
  onOpenLoanForm,
}) => {
  const { lang } = useLanguage();
  const { user, isOwner, isLoanAgent, isEmiAgent, isClient } = useAuth();
  const { isMobile } = useDeviceMode();

  const isLoansContext =
    activeTab === 'loans' || activeTab === 'scheme-loans' || activeTab === 'closed-loans';

  const [isLoansExpanded, setIsLoansExpanded] = useState(() => isLoansContext);

  const [loanCounts, setLoanCounts] = useState({
    all: 0,
    daily: 0,
    weekly: 0,
    monthly: 0,
    closed: 0,
  });

  // Auto-expand loans menu if on a loans-related tab
  useEffect(() => {
    if (isLoansContext) {
      setIsLoansExpanded(true);
    }
  }, [isLoansContext]);

  // Fetch live active loan counts for badges
  useEffect(() => {
    if (isClient || isEmiAgent) return;

    let mounted = true;
    const fetchCounts = async () => {
      try {
        const res = await api.getLoanOverallSummary();
        if (mounted && res?.byType) {
          setLoanCounts({
            all: res.overall?.activeLoansCount ?? 0,
            daily: res.byType.daily?.activeLoansCount ?? 0,
            weekly: res.byType.weekly?.activeLoansCount ?? 0,
            monthly: res.byType.monthly?.activeLoansCount ?? 0,
            closed: res.overall?.closedLoansCount ?? 0,
          });
        }
      } catch (e) {
        console.warn('Could not fetch loan summary counts:', e);
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isClient, isEmiAgent]);

  if (isMobile) {
    return null;
  }

  const handleSubItemClick = (type) => {
    if (type === 'all') {
      try {
        window.history.pushState({}, '', '/loans');
      } catch (e) {}
      setActiveTab('loans');
    } else if (type === 'closed') {
      try {
        window.history.pushState({}, '', '/loans/closed');
      } catch (e) {}
      setActiveTab('closed-loans');
    } else {
      // daily, weekly, monthly
      if (onSelectScheme) {
        onSelectScheme(type);
      } else {
        try {
          window.history.pushState({ scheme: type }, '', `/loans/${type}`);
        } catch (e) {}
        setActiveTab('scheme-loans');
      }
    }
  };

  // Role-specific navigation items
  let navItems = [];

  if (isClient) {
    navItems = [
      { id: 'dashboard', en: 'Dashboard', ta: 'முகப்பு', icon: LayoutDashboard },
      { id: 'loans', en: 'My Loans', ta: 'எனது கடன்கள்', icon: Coins },
      { id: 'payments', en: 'Collections', ta: 'செலுத்திய விவரம்', icon: Receipt },
      { id: 'settings', en: 'Settings', ta: 'அமைப்புகள்', icon: SettingsIcon },
    ];
  } else if (isEmiAgent) {
    navItems = [
      { id: 'emiDashboard', en: 'EMI Dashboard', ta: 'தவணை முகப்பு', icon: LayoutDashboard },
      { id: 'emiList', en: 'EMI Accounts', ta: 'மாத தவணை', icon: Layers },
      { id: 'settings', en: 'Settings', ta: 'அமைப்புகள்', icon: SettingsIcon },
    ];
  } else if (isLoanAgent) {
    navItems = [
      { id: 'dashboard', en: 'Dashboard', ta: 'முகப்பு', icon: LayoutDashboard },
      { id: 'customers', en: 'Customers', ta: 'வாடிக்கையாளர்கள்', icon: Users },
      { id: 'loans', en: 'Loans', ta: 'கடன் கணக்குகள்', icon: Coins, isGroup: true },
      { id: 'payments', en: 'Payments', ta: 'தவணை வசூல்', icon: Receipt },
      { id: 'dailyClosing', en: 'Daily Closing', ta: 'தினசரி கணக்கு', icon: FileText },
      { id: 'calendar', en: 'Calendar', ta: 'நாட்காட்டி', icon: Calendar },
      { id: 'settings', en: 'Settings', ta: 'அமைப்புகள்', icon: SettingsIcon },
    ];
  } else {
    // Owner
    navItems = [
      { id: 'dashboard', en: 'Dashboard', ta: 'கடன் முகப்பு', icon: LayoutDashboard },
      { id: 'customers', en: 'Customers', ta: 'வாடிக்கையாளர்கள்', icon: Users },
      { id: 'loans', en: 'Loans', ta: 'கடன் கணக்குகள்', icon: Coins, isGroup: true },
      { id: 'payments', en: 'Payments', ta: 'தவணை வசூல்', icon: Receipt },
      { id: 'agents', en: 'Staff & Agents', ta: 'பணியாளர்கள்', icon: UserCheck },
      { id: 'expenses', en: 'Expenses', ta: 'செலவுகள்', icon: ArrowLeftRight },
      { id: 'investments', en: 'Investments', ta: 'முதலீடுகள்', icon: TrendingUp },
      { id: 'dailyClosing', en: 'Daily Closing', ta: 'தினசரி கணக்கு', icon: FileText },
      { id: 'calendar', en: 'Calendar', ta: 'நாட்காட்டி', icon: Calendar },
      { id: 'settings', en: 'Settings', ta: 'அமைப்புகள்', icon: SettingsIcon },
    ];
  }

  const loanSubItems = [
    {
      id: 'all',
      en: 'All Active Loans',
      ta: 'அனைத்து நடப்பு கடன்கள்',
      icon: Coins,
      count: loanCounts.all,
      isActive: activeTab === 'loans',
    },
    {
      id: 'daily',
      en: 'Daily Loans',
      ta: 'தினசரி கடன்கள்',
      icon: Sun,
      count: loanCounts.daily,
      isActive: activeTab === 'scheme-loans' && selectedScheme === 'daily',
    },
    {
      id: 'weekly',
      en: 'Weekly Loans',
      ta: 'வாராந்திர கடன்கள்',
      icon: CalendarRange,
      count: loanCounts.weekly,
      isActive: activeTab === 'scheme-loans' && selectedScheme === 'weekly',
    },
    {
      id: 'monthly',
      en: 'Monthly Loans',
      ta: 'மாதாந்திர கடன்கள்',
      icon: Clock,
      count: loanCounts.monthly,
      isActive: activeTab === 'scheme-loans' && selectedScheme === 'monthly',
    },
    {
      id: 'closed',
      en: 'Closed Loans',
      ta: 'முடிந்த கடன்கள்',
      icon: Archive,
      count: loanCounts.closed,
      isActive: activeTab === 'closed-loans',
    },
  ];

  return (
    <aside
      className={`min-h-[calc(100vh-4rem)] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-700 dark:text-slate-200 transition-all duration-300 flex flex-col shrink-0 select-none shadow-sm border-r border-sky-100/80 dark:border-sky-900/40 sticky top-16 self-start max-h-[calc(100vh-4rem)] z-30 ${
        isCollapsed ? 'w-16 sm:w-20 p-2 sm:p-2.5 items-center' : 'w-64 p-3.5 sm:p-4'
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

            // Handle Loans Accordion Group
            if (item.isGroup && (isOwner || isLoanAgent)) {
              const isGroupActive = isLoansContext;

              if (isCollapsed) {
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (onToggleCollapsed) onToggleCollapsed();
                      setIsLoansExpanded(true);
                      handleSubItemClick('all');
                    }}
                    className={`w-full flex items-center justify-center p-3 rounded-2xl transition-all duration-150 group font-bold relative ${
                      isGroupActive
                        ? 'btn-sky-primary text-white shadow-md shadow-sky-500/20'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-600 dark:hover:text-sky-400'
                    }`}
                    title={lang === 'ta' ? item.ta : item.en}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${isGroupActive ? 'text-white' : 'text-slate-400 group-hover:text-sky-500'}`} />
                    {loanCounts.all > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500" />
                    )}
                  </button>
                );
              }

              return (
                <div key={item.id} className="space-y-0.5">
                  {/* Group Header Button */}
                  <div
                    className={`w-full flex items-center justify-between rounded-2xl transition-all duration-150 group font-bold px-3 py-2.5 cursor-pointer ${
                      isGroupActive
                        ? 'bg-sky-50/80 dark:bg-sky-950/50 text-sky-800 dark:text-sky-200 border border-sky-200/60 dark:border-sky-800/60'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-sky-50/50 dark:hover:bg-slate-800/50'
                    }`}
                    onClick={() => setIsLoansExpanded(!isLoansExpanded)}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isGroupActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 group-hover:text-sky-500'}`} />
                      <span className="text-xs font-bold tracking-wide truncate">
                        {lang === 'ta' ? item.ta : item.en}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {loanCounts.all > 0 && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 shadow-xs">
                          {loanCounts.all}
                        </span>
                      )}
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                          isLoansExpanded ? 'rotate-180 text-sky-600 dark:text-sky-400' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {/* Expandable Sub-items with smooth height and animation */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out pl-2 space-y-1 ${
                      isLoansExpanded ? 'max-h-80 opacity-100 pt-1' : 'max-h-0 opacity-0 pointer-events-none'
                    }`}
                  >
                    {loanSubItems.map((sub) => {
                      const SubIcon = sub.icon;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => handleSubItemClick(sub.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all duration-150 group font-bold ${
                            sub.isActive
                              ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-sm shadow-sky-500/20 translate-x-0.5'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-700 dark:hover:text-sky-300 hover:translate-x-0.5'
                          }`}
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <SubIcon
                              className={`w-3.5 h-3.5 shrink-0 ${
                                sub.isActive ? 'text-white' : 'text-slate-400 group-hover:text-sky-500'
                              }`}
                            />
                            <span className="text-[11px] truncate tracking-tight">
                              {lang === 'ta' ? sub.ta : sub.en}
                            </span>
                          </div>

                          {sub.count !== undefined && (
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${
                                sub.isActive
                                  ? 'bg-white/25 text-white'
                                  : sub.id === 'closed'
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                  : 'bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-300'
                              }`}
                            >
                              {sub.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center rounded-2xl transition-all duration-150 group font-bold ${
                  isCollapsed ? 'justify-center p-3' : 'px-3.5 py-2.5 space-x-3 text-left'
                } ${
                  isActive
                    ? 'btn-sky-primary text-white shadow-md shadow-sky-500/20'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 hover:text-sky-600 dark:hover:text-sky-400'
                }`}
                title={isCollapsed ? (lang === 'ta' ? item.ta : item.en) : undefined}
              >
                <Icon
                  className={`shrink-0 ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-sky-500'
                  }`}
                />
                {!isCollapsed && (
                  <span className="text-xs truncate tracking-wide">
                    {lang === 'ta' ? item.ta : item.en}
                  </span>
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
