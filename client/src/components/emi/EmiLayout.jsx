import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import {
  LayoutDashboard,
  Layers,
  Wallet,
  Receipt,
  Users,
  FileSpreadsheet,
  LogOut,
  Menu,
  X,
  Search,
  Sun,
  Moon,
  Plus,
  ArrowRightLeft,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Building,
} from 'lucide-react';
import SingleSwapChip from '../common/SingleSwapChip';

export const EmiLayout = ({
  activeEmiTab,
  setActiveEmiTab,
  onOpenCollectModal,
  onOpenNewLoanModal,
  onSwitchToLoans,
  children,
}) => {
  const { user, logout, isOwner, isEmiAgent } = useAuth();
  const { lang, toggleLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);

  const navItems = [
    { id: 'dashboard', en: 'Dashboard', ta: 'முகப்பு', icon: LayoutDashboard },
    { id: 'list', en: 'EMI List', ta: 'கடன் பட்டியல்', icon: Layers },
    { id: 'receipts', en: 'Receipts', ta: 'ரசீதுகள்', icon: Receipt },
    { id: 'customers', en: 'Customers', ta: 'வாடிக்கையாளர்கள்', icon: Users },
    { id: 'reports', en: 'Reports', ta: 'அறிக்கைகள்', icon: FileSpreadsheet },
  ];

  const handleTabClick = (tabId) => {
    setActiveEmiTab(tabId);
    setIsSidebarOpen(false);
    setShowMobileMore(false);
  };

  return (
    <div
      className="min-h-screen flex flex-col font-sans relative selection:bg-orange-500 selection:text-white"
      style={{
        background: 'linear-gradient(180deg, #FFF8F5 0%, #FFF3EC 45%, #F4F8FD 100%)',
      }}
    >
      {/* -------------------------------------------------------------
          TOP BAR (Peach Sky Glass Theme)
      ------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-orange-200/60 dark:border-slate-800 transition-colors shadow-xs">
        <div className="w-full px-3 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Left: Mobile Menu + Monogram Logo + Title */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-700 hover:bg-orange-50 transition lg:hidden"
              aria-label="Toggle EMI Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-500/25 shrink-0">
              <Layers className="w-5 h-5 drop-shadow-xs" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            </div>

            <div className="flex flex-col justify-center min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-black text-sm sm:text-base text-slate-900 dark:text-white tracking-tight leading-tight">
                  {lang === 'ta' ? 'வி.கே. பேங்கர்ஸ்' : "VK BANKER'S"}
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-300 tracking-wide">
                  {lang === 'ta' ? 'மாத தவணை (EMI)' : 'EMI PANEL'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium tracking-normal leading-tight mt-0.5">
                Monthly EMI Financing & Ledger System
              </span>
            </div>
          </div>

          {/* Center (Owner Only): Single Swap Chip Toggle */}
          {isOwner && (
            <div className="hidden md:flex items-center">
              <SingleSwapChip
                activeMode="emi"
                onToggle={onSwitchToLoans}
              />
            </div>
          )}

          {/* Right Tools: Language, Theme, + Collect, User Profile */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Quick Collect Action */}
            <button
              onClick={onOpenCollectModal}
              className="h-9 px-3 sm:px-3.5 rounded-xl font-bold text-xs text-white shadow-xs transition flex items-center space-x-1.5 active:scale-95 shrink-0"
              style={{
                background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
              }}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Collect EMI</span>
            </button>

            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="h-9 px-2.5 rounded-xl bg-white/80 hover:bg-white border border-slate-200 text-xs font-bold text-slate-700 transition"
              title="Switch Language"
            >
              {lang === 'ta' ? 'EN' : 'தமிழ்'}
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/80 hover:bg-white border border-slate-200 text-slate-700 transition"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* User Profile & Logout */}
            <div className="flex items-center space-x-1.5 pl-1 sm:pl-2 border-l border-slate-200/80">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {user?.name ? user.name[0].toUpperCase() : 'E'}
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Sub-strip: Loans / EMI Single Swap Chip for Owner on small screens */}
        {isOwner && (
          <div className="flex md:hidden items-center justify-center pb-2 px-3 pt-1 border-t border-orange-100/60">
            <SingleSwapChip
              activeMode="emi"
              onToggle={onSwitchToLoans}
            />
          </div>
        )}
      </header>

      {/* -------------------------------------------------------------
          BODY CONTAINER: SIDEBAR + MAIN CONTENT
      ------------------------------------------------------------- */}
      <div className="flex-1 flex w-full max-w-[1720px] mx-auto relative">
        {/* DESKTOP SIDEBAR (Peach Sky Glass Theme) */}
        <aside className="hidden lg:flex flex-col w-60 shrink-0 p-4 border-r border-orange-200/60 min-h-[calc(100vh-4rem)] sticky top-16 self-start max-h-[calc(100vh-4rem)] select-none">
          <div className="mb-4 px-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-600">
              EMI MENU / தவணை பிரிவு
            </span>
          </div>

          <nav className="space-y-1.5 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeEmiTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{lang === 'ta' ? item.ta : item.en}</span>
                </button>
              );
            })}

            {/* Quick Action: Collect EMI Button in Sidebar */}
            <div className="pt-3">
              <button
                onClick={onOpenCollectModal}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-orange-100/80 hover:bg-orange-100 text-orange-900 border border-orange-200 transition"
              >
                <div className="flex items-center space-x-2">
                  <Wallet className="w-4 h-4 text-orange-600" />
                  <span>{lang === 'ta' ? 'தவணை வசூல்' : 'Collect EMI'}</span>
                </div>
                <Plus className="w-3.5 h-3.5 text-orange-600" />
              </button>
            </div>
          </nav>

          {/* Sidebar Footer */}
          <div className="pt-4 border-t border-orange-200/60 mt-auto space-y-2">
            <div className="p-3 rounded-2xl bg-white/70 backdrop-blur-md border border-orange-100 text-[11px] space-y-1">
              <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>{user?.name || 'EMI Agent'}</span>
              </div>
              <p className="text-slate-400 capitalize text-[10px]">
                Role: {user?.role || 'emi_agent'}
              </p>
            </div>

            <button
              onClick={logout}
              className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>{lang === 'ta' ? 'வெளியேறு' : 'Logout'}</span>
            </button>
          </div>
        </aside>

        {/* MOBILE SLIDE-OVER SIDEBAR BACKDROP & DRAWER */}
        {isSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
              onClick={() => setIsSidebarOpen(false)}
            />
            <div className="relative w-72 max-w-[80vw] bg-white h-full shadow-2xl z-10 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold">
                      <Layers className="w-4 h-4" />
                    </div>
                    <span className="font-black text-sm text-slate-900">EMI Menu</span>
                  </div>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-4 space-y-1.5">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeEmiTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleTabClick(item.id)}
                        className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold ${
                          isActive
                            ? 'bg-orange-500 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{lang === 'ta' ? item.ta : item.en}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-2">
                {isOwner && (
                  <button
                    onClick={() => {
                      setIsSidebarOpen(false);
                      onSwitchToLoans();
                    }}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center space-x-1.5"
                  >
                    <span>Switch to Loans Section</span>
                  </button>
                )}
                <button
                  onClick={logout}
                  className="w-full py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center justify-center space-x-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MAIN VIEW CONTENT */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 min-w-0 pb-24 lg:pb-12">
          {children}
        </main>
      </div>

      {/* -------------------------------------------------------------
          MOBILE BOTTOM NAVIGATION BAR (Fixed at screen bottom)
      ------------------------------------------------------------- */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-orange-200/80 shadow-lg px-2 py-1.5 flex items-center justify-around">
        {/* Tab 1: Dashboard */}
        <button
          onClick={() => handleTabClick('dashboard')}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 text-[10px] font-bold ${
            activeEmiTab === 'dashboard' ? 'text-orange-600' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span>Dashboard</span>
        </button>

        {/* Tab 2: EMI List */}
        <button
          onClick={() => handleTabClick('list')}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 text-[10px] font-bold ${
            activeEmiTab === 'list' ? 'text-orange-600' : 'text-slate-400'
          }`}
        >
          <Layers className="w-4 h-4 mb-0.5" />
          <span>Accounts</span>
        </button>

        {/* Center Raised Collect FAB */}
        <button
          onClick={onOpenCollectModal}
          className="relative -top-3 w-12 h-12 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/35 active:scale-95 transition"
          aria-label="Collect EMI Payment"
        >
          <Wallet className="w-5 h-5" />
        </button>

        {/* Tab 3: Receipts */}
        <button
          onClick={() => handleTabClick('receipts')}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 text-[10px] font-bold ${
            activeEmiTab === 'receipts' ? 'text-orange-600' : 'text-slate-400'
          }`}
        >
          <Receipt className="w-4 h-4 mb-0.5" />
          <span>Receipts</span>
        </button>

        {/* Tab 4: More (Sheet) */}
        <button
          onClick={() => setShowMobileMore(!showMobileMore)}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 text-[10px] font-bold ${
            showMobileMore ? 'text-orange-600' : 'text-slate-400'
          }`}
        >
          <Menu className="w-4 h-4 mb-0.5" />
          <span>More</span>
        </button>
      </nav>

      {/* Mobile More Bottom Sheet */}
      {showMobileMore && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-xs"
            onClick={() => setShowMobileMore(false)}
          />
          <div className="relative bg-white rounded-t-3xl p-5 shadow-2xl z-10 space-y-3 pb-8">
            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-2" />
            <h4 className="font-black text-sm text-slate-800">More EMI Options</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleTabClick('customers')}
                className="p-3 rounded-2xl bg-orange-50/60 border border-orange-100 flex items-center space-x-2 text-xs font-bold text-slate-800"
              >
                <Users className="w-4 h-4 text-orange-600" />
                <span>Customers</span>
              </button>
              <button
                onClick={() => handleTabClick('reports')}
                className="p-3 rounded-2xl bg-orange-50/60 border border-orange-100 flex items-center space-x-2 text-xs font-bold text-slate-800"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Reports</span>
              </button>
            </div>
            {isOwner && (
              <button
                onClick={() => {
                  setShowMobileMore(false);
                  onSwitchToLoans();
                }}
                className="w-full py-2.5 rounded-xl bg-sky-50 text-sky-700 font-bold text-xs border border-sky-200"
              >
                💼 Switch to Loans Interface
              </button>
            )}
            <button
              onClick={logout}
              className="w-full py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmiLayout;

