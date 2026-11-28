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
      en: 'Closed & Settled',
      ta: 'முடிந்த & தீர்க்கப்பட்டவை',
      icon: Archive,
      count: loanCounts.closed,
      isActive: activeTab === 'closed-loans',
    },
  ];

  return (
    <aside
      className={`min-h-[calc(100vh-4rem)] bg-white/75 backdrop-blur-[20px] text-[#183653] transition-all duration-300 flex flex-col shrink-0 select-none shadow-[0_8px_30px_rgba(8,120,209,0.08)] border-r border-[#D5E9FA] sticky top-16 self-start max-h-[calc(100vh-4rem)] z-30 ${
        isCollapsed ? 'w-16 sm:w-20 p-2 sm:p-2.5 items-center' : 'w-64 p-3.5 sm:p-4'
      }`}
    >
      {/* Header or Collapse Toggle */}
      <div className="flex items-center justify-between pb-2.5 px-1 border-b border-[#D5E9FA]/60">
        {!isCollapsed && (
          <span className="text-[10.5px] uppercase font-black tracking-widest text-[#0878D1]">
            {isEmiAgent ? 'EMI NAVIGATION' : isLoanAgent ? 'LOAN NAVIGATION' : 'LOANS NAVIGATION'}
          </span>
        )}
        {onToggleCollapsed && (
          <button
            onClick={onToggleCollapsed}
            className="p-1 rounded-xl text-[#647C95] hover:text-[#183653] hover:bg-[#EAF5FF] transition mx-auto"
            title={isCollapsed ? 'Expand Navigation (M)' : 'Collapse Navigation (M)'}
            aria-label={isCollapsed ? 'Expand Navigation' : 'Collapse Navigation'}
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4 text-[#0878D1]" /> : <PanelLeftClose className="w-4 h-4 text-[#647C95]" />}
          </button>
        )}
      </div>

      {/* Navigation Items List */}
      <div className="space-y-1 mt-2 flex-1 w-full overflow-y-auto no-scrollbar">
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
                        ? 'bg-gradient-to-r from-[#0878D1] to-[#064B8E] text-white shadow-md shadow-[#0878D1]/25'
                        : 'text-[#647C95] hover:bg-[#EAF5FF] hover:text-[#0878D1]'
                    }`}
                    title={lang === 'ta' ? item.ta : item.en}
                    aria-label={lang === 'ta' ? item.ta : item.en}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${isGroupActive ? 'text-white' : 'text-[#647C95] group-hover:text-[#0878D1]'}`} />
                    {loanCounts.all > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#0878D1]" />
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
                        ? 'bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA]'
                        : 'text-[#647C95] hover:bg-[#EAF5FF]/70 hover:text-[#183653]'
                    }`}
                    onClick={() => setIsLoansExpanded(!isLoansExpanded)}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isGroupActive ? 'text-[#0878D1]' : 'text-[#647C95] group-hover:text-[#0878D1]'}`} />
                      <span className="text-xs font-bold tracking-wide truncate">
                        {lang === 'ta' ? item.ta : item.en}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {loanCounts.all > 0 && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-[#FFE3CF] text-[#8A4A1F] border border-[#8A4A1F]/30">
                          {loanCounts.all}
                        </span>
                      )}
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-[#647C95] transition-transform duration-200 ${
                          isLoansExpanded ? 'rotate-180 text-[#0878D1]' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {/* Expandable Sub-items */}
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
                              ? 'bg-gradient-to-r from-[#0878D1] to-[#064B8E] text-white shadow-sm translate-x-0.5 font-bold'
                              : 'text-[#647C95] hover:bg-[#EAF5FF] hover:text-[#0878D1] hover:translate-x-0.5'
                          }`}
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <SubIcon
                              className={`w-3.5 h-3.5 shrink-0 ${
                                sub.isActive ? 'text-white stroke-[2.5]' : 'text-[#647C95] group-hover:text-[#0878D1]'
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
                                  ? 'bg-white/30 text-white'
                                  : sub.id === 'closed'
                                  ? 'bg-[#FFD6D2]/60 text-[#9B2C2C]'
                                  : 'bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA]'
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
                    ? 'bg-gradient-to-r from-[#0878D1] to-[#064B8E] text-white shadow-md shadow-[#0878D1]/25 font-bold'
                    : 'text-[#647C95] hover:bg-[#EAF5FF] hover:text-[#0878D1]'
                }`}
                title={isCollapsed ? (lang === 'ta' ? item.ta : item.en) : undefined}
                aria-label={lang === 'ta' ? item.ta : item.en}
              >
                <Icon
                  className={`shrink-0 ${isCollapsed ? 'w-5 h-5' : 'w-4 h-4'} ${
                    isActive ? 'text-white stroke-[2.5]' : 'text-[#647C95] group-hover:text-[#0878D1]'
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
      {!isCollapsed && (
        <div className="pt-3 border-t border-[#D5E9FA] mt-auto">
          <button
            onClick={() => {
              if (onOpenWhatsAppHub) onOpenWhatsAppHub({});
              else window.open('https://web.whatsapp.com', '_blank');
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-[#18A879] bg-[#18A879]/10 border border-[#18A879]/30 hover:bg-[#18A879]/20 transition shadow-xs"
            title="Open WhatsApp Web & Reminders Hub"
          >
            <div className="flex items-center space-x-2">
              <Smartphone className="w-4 h-4 text-[#18A879]" />
              <span>WhatsApp Web</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#18A879]/20 text-[#18A879] font-black">
              Send
            </span>
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
