import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useDeviceMode } from '../../context/DeviceModeContext';
import {
  LayoutDashboard,
  Users,
  Banknote,
  Receipt,
  MoreHorizontal,
} from 'lucide-react';

export const BottomNav = ({ activeTab, setActiveTab, onOpenMoreSheet }) => {
  const { lang } = useLanguage();
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

  // BottomNav is visible in Mobile mode only
  if (!isMobile || isKeyboardOpen) return null;

  const tabs = [
    {
      id: 'dashboard',
      label: lang === 'ta' ? 'முகப்பு' : 'Home',
      icon: LayoutDashboard,
    },
    {
      id: 'customers',
      label: lang === 'ta' ? 'வாடிக்கையாளர்' : 'Customers',
      icon: Users,
    },
    {
      id: 'loans',
      label: lang === 'ta' ? 'கடன்' : 'Loans',
      icon: Banknote,
    },
    {
      id: 'payments',
      label: lang === 'ta' ? 'வசூல்' : 'Collect',
      icon: Receipt,
    },
    {
      id: 'more',
      label: lang === 'ta' ? 'கூடுதல்' : 'More',
      icon: MoreHorizontal,
      isMore: true,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto z-40 pointer-events-none">
      <nav className="pointer-events-auto h-16 w-full glass-panel border-t border-white/70 dark:border-sky-800/40 px-2 flex items-center justify-around shadow-2xl pb-safe">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = !tab.isMore && activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.isMore) {
                  if (onOpenMoreSheet) onOpenMoreSheet();
                } else {
                  setActiveTab(tab.id);
                }
              }}
              className={`flex-1 flex flex-col items-center justify-center py-1 min-h-[48px] rounded-2xl transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'text-sky-600 dark:text-sky-400 font-black'
                  : 'text-slate-500 dark:text-slate-400 hover:text-sky-600'
              }`}
            >
              <div
                className={`flex flex-col items-center justify-center px-2.5 py-1 rounded-xl transition-all ${
                  isActive
                    ? 'bg-sky-500/15 dark:bg-sky-500/25 ring-1 ring-sky-400/30'
                    : ''
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 stroke-[2.5]' : 'stroke-[2]'
                  }`}
                />
                <span className="text-[11px] font-bold tracking-tight mt-0.5 leading-none">
                  {tab.label}
                </span>
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;
