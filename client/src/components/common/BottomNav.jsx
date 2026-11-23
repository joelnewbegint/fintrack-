import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useDeviceMode } from '../../context/DeviceModeContext';
import {
  LayoutDashboard,
  Users,
  Banknote,
  Receipt,
  Settings,
  MoreHorizontal,
  Layers,
  Coins,
  FileSpreadsheet,
} from 'lucide-react';

export const BottomNav = ({ activeTab, setActiveTab, onOpenMoreSheet }) => {
  const { lang } = useLanguage();
  const { isClient, isOwner, isLoanAgent, isEmiAgent } = useAuth();
  const { isMobile } = useDeviceMode();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // Auto-hide when mobile virtual keyboard opens
  useEffect(() => {
    const handleFocus = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) {
        setIsKeyboardOpen(true);
      }
    };
    const handleBlur = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) {
        setIsKeyboardOpen(false);
      }
    };

    window.addEventListener('focusin', handleFocus);
    window.addEventListener('focusout', handleBlur);
    return () => {
      window.removeEventListener('focusin', handleFocus);
      window.removeEventListener('focusout', handleBlur);
    };
  }, []);

  if (!isMobile || isKeyboardOpen) return null;

  let tabs = [];

  if (isClient) {
    tabs = [
      { id: 'dashboard', label: lang === 'ta' ? 'முகப்பு' : 'Home', icon: LayoutDashboard },
      { id: 'loans', label: lang === 'ta' ? 'கடன்கள்' : 'Loans', icon: Banknote },
      { id: 'payments', label: lang === 'ta' ? 'வரலாறு' : 'History', icon: Receipt },
      { id: 'settings', label: lang === 'ta' ? 'சுயவிவரம்' : 'Profile', icon: Settings },
    ];
  } else if (isEmiAgent) {
    tabs = [
      { id: 'emiDashboard', label: lang === 'ta' ? 'EMI முகப்பு' : 'EMI Home', icon: LayoutDashboard },
      { id: 'emiList', label: lang === 'ta' ? 'கணக்குகள்' : 'Accounts', icon: Layers },
      { id: 'emiReports', label: lang === 'ta' ? 'அறிக்கை' : 'Reports', icon: FileSpreadsheet },
      { id: 'more', label: lang === 'ta' ? 'கூடுதல்' : 'More', icon: MoreHorizontal, isMore: true },
    ];
  } else if (isLoanAgent) {
    tabs = [
      { id: 'dashboard', label: lang === 'ta' ? 'முகப்பு' : 'Home', icon: LayoutDashboard },
      { id: 'customers', label: lang === 'ta' ? 'வாடிக்கையாளர்' : 'Customers', icon: Users },
      { id: 'loans', label: lang === 'ta' ? 'கடன்' : 'Loans', icon: Banknote },
      { id: 'payments', label: lang === 'ta' ? 'வசூல்' : 'Collect', icon: Receipt },
      { id: 'more', label: lang === 'ta' ? 'கூடுதல்' : 'More', icon: MoreHorizontal, isMore: true },
    ];
  } else {
    // Owner
    tabs = [
      { id: 'dashboard', label: lang === 'ta' ? 'முகப்பு' : 'Home', icon: LayoutDashboard },
      { id: 'loans', label: lang === 'ta' ? 'கடன்கள்' : 'Loans', icon: Banknote },
      { id: 'emi', label: lang === 'ta' ? 'மாத தவணை' : 'EMI', icon: Layers, isEmiToggle: true },
      { id: 'dailyClosing', label: lang === 'ta' ? 'அறிக்கை' : 'Reports', icon: FileSpreadsheet },
      { id: 'more', label: lang === 'ta' ? 'கூடுதல்' : 'More', icon: MoreHorizontal, isMore: true },
    ];
  }

  const handleTabClick = (tab) => {
    if (tab.isMore) {
      if (onOpenMoreSheet) onOpenMoreSheet();
      return;
    }
    if (tab.isEmiToggle) {
      try {
        window.history.pushState({}, '', '/emi');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch (e) {}
      return;
    }
    setActiveTab(tab.id);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto z-40 pointer-events-none px-3 pb-safe mb-2">
      <nav className="pointer-events-auto h-16 w-full bg-white/90 backdrop-blur-md rounded-[28px] border border-white/95 px-2 flex items-center justify-around shadow-golden-lg text-ink">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            activeTab === tab.id ||
            (tab.id === 'loans' && (activeTab === 'scheme-loans' || activeTab === 'closed-loans'));

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition active:scale-95 min-h-[44px] ${
                isActive ? 'text-ink font-black' : 'text-muted font-bold'
              }`}
            >
              <div
                className={`p-1.5 rounded-full transition-all duration-200 ${
                  isActive ? 'bg-[#FFC94D] text-ink shadow-xs scale-105' : 'hover:bg-white/50'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? 'text-ink stroke-[2.5]' : 'text-muted'
                  }`}
                />
              </div>
              <span className="text-[10px] font-bold mt-0.5 tracking-tight truncate max-w-[64px]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;
