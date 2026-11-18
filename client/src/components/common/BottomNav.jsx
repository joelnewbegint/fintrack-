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
      { id: 'payments', label: lang === 'ta' ? 'செலுத்தியவை' : 'History', icon: Receipt },
      { id: 'settings', label: lang === 'ta' ? 'சுயவிவரம்' : 'Profile', icon: Settings },
    ];
  } else if (isEmiAgent) {
    tabs = [
      { id: 'emiDashboard', label: lang === 'ta' ? 'EMI முகப்பு' : 'EMI Home', icon: LayoutDashboard },
      { id: 'emiList', label: lang === 'ta' ? 'மாத தவணை' : 'Accounts', icon: Layers },
      { id: 'settings', label: lang === 'ta' ? 'அமைப்புகள்' : 'Settings', icon: Settings },
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
      { id: 'overview', label: lang === 'ta' ? 'மேலோட்டம்' : 'Overview', icon: LayoutDashboard },
      { id: 'dashboard', label: lang === 'ta' ? 'கடன்' : 'Loans', icon: Coins },
      { id: 'emiDashboard', label: lang === 'ta' ? 'EMI' : 'EMI', icon: Layers },
      { id: 'payments', label: lang === 'ta' ? 'வசூல்' : 'Collect', icon: Receipt },
      { id: 'more', label: lang === 'ta' ? 'கூடுதல்' : 'More', icon: MoreHorizontal, isMore: true },
    ];
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto z-40 pointer-events-none">
      <nav className="pointer-events-auto h-16 w-full glass-panel border-t border-white/70 dark:border-sky-800/40 px-2 flex items-center justify-around shadow-2xl pb-safe">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id || (tab.id === 'loans' && activeTab === 'scheme-loans');

          if (tab.isMore) {
            return (
              <button
                key={tab.id}
                onClick={onOpenMoreSheet}
                className="flex-1 flex flex-col items-center justify-center py-1 text-slate-500 dark:text-slate-400 active:scale-95 transition min-h-[44px]"
              >
                <div className="p-1 rounded-xl">
                  <Icon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </div>
                <span className="text-[10px] font-bold mt-0.5 tracking-tight">{tab.label}</span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 transition active:scale-95 min-h-[44px] ${
                isActive ? 'text-sky-600 dark:text-sky-400 font-black' : 'text-slate-500 dark:text-slate-400 font-medium'
              }`}
            >
              <div
                className={`p-1 rounded-xl transition ${
                  isActive ? 'bg-sky-100 dark:bg-sky-950/80 scale-110 shadow-xs' : ''
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'
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
