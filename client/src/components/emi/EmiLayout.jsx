import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import SingleSwapChip from '../common/SingleSwapChip';
import {
  LayoutDashboard,
  Layers,
  Receipt,
  Users,
  BarChart3,
  LogOut,
  Wallet,
  Menu,
  X,
  Plus,
  ShieldCheck,
} from 'lucide-react';

export const EmiLayout = ({
  children,
  activeEmiTab = 'dashboard',
  onSelectEmiTab,
  onOpenCollectModal,
  onOpenNewEMILoanModal,
  onSwitchToLoans,
}) => {
  const { user, logout, isOwner } = useAuth();
  const { lang, toggleLanguage } = useLanguage();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', en: 'Dashboard', ta: 'தவணை முகப்பு', icon: LayoutDashboard },
    { id: 'list', en: 'EMI Accounts', ta: 'கணக்குகள்', icon: Layers },
    { id: 'receipts', en: 'Receipts & History', ta: 'ரசீதுகள்', icon: Receipt },
    { id: 'customers', en: 'Borrowers', ta: 'வாடிக்கையாளர்', icon: Users },
    { id: 'reports', en: 'Reports', ta: 'அறிக்கை', icon: BarChart3 },
  ];

  const handleTabClick = (tabId) => {
    if (onSelectEmiTab) {
      onSelectEmiTab(tabId);
    }
    setIsSidebarOpen(false);
  };

  return (
    <div
      className="min-h-screen flex flex-col font-sans transition-colors duration-200 text-ink"
      style={{
        backgroundColor: '#F4FAFF',
        backgroundImage:
          'radial-gradient(circle at 92% 8%, rgba(111, 180, 242, 0.38) 0%, transparent 45%), radial-gradient(circle at 8% 85%, rgba(142, 197, 245, 0.32) 0%, transparent 50%), linear-gradient(165deg, #F4FAFF 0%, #BFE3FA 48%, #8EC5F5 100%)',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* -------------------------------------------------------------
          TOP BAR (Ocean Blue Theme)
      ------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 w-full bg-white/85 backdrop-blur-md border-b border-white/90 shadow-ocean transition-colors">
        <div className="w-full px-3 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Left: Mobile Menu + Monogram Logo + Title */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-muted hover:text-ink hover:bg-[#BFE3FA]/40 transition lg:hidden"
              aria-label="Toggle EMI Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-[#6FB4F2] to-[#8EC5F5] text-ink flex items-center justify-center shadow-md shadow-[#1F6FC8]/20 shrink-0 border border-white">
              <Layers className="w-5 h-5 drop-shadow-xs" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#1F6B4F] ring-2 ring-white" />
            </div>

            <div className="flex flex-col justify-center min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-black text-sm sm:text-base text-ink tracking-tight leading-tight whitespace-nowrap">
                  {lang === 'ta' ? 'வி.கே. பேங்கர்ஸ்' : "VK BANKER'S"}
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#BFE3FA] text-[#1F6FC8] border border-[#6FB4F2]/60 tracking-wide">
                  {lang === 'ta' ? 'மாத தவணை (EMI)' : 'EMI PANEL'}
                </span>
              </div>
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

          {/* Right Tools: Language, Collect, User Profile */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Quick Collect Action */}
            <button
              onClick={onOpenCollectModal}
              className="btn-accent h-9 px-3.5 text-xs font-bold shadow-ocean flex items-center space-x-1.5 active:scale-95 transition"
            >
              <Wallet className="w-3.5 h-3.5 text-ink" />
              <span className="hidden xs:inline">{lang === 'ta' ? 'தவணை வசூல்' : 'Collect EMI'}</span>
            </button>

            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="h-9 px-2.5 rounded-full bg-white/80 hover:bg-white border border-[#BFE3FA] text-xs font-bold text-ink transition active:scale-95 shadow-xs"
              title="Switch Language"
            >
              {lang === 'ta' ? 'EN' : 'தமிழ்'}
            </button>

            {/* User Profile & Logout */}
            <div className="flex items-center space-x-1.5 pl-1 sm:pl-2 border-l border-[#BFE3FA]">
              <div className="w-8 h-8 rounded-full bg-[#6FB4F2] text-ink font-bold text-xs flex items-center justify-center shadow-xs border border-white">
                {user?.name ? user.name[0].toUpperCase() : 'E'}
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="w-8 h-8 flex items-center justify-center rounded-xl text-muted hover:text-[#9B2C2C] hover:bg-[#FFD6D2]/50 transition active:scale-95"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Sub-strip: Loans / EMI Single Swap Chip for Owner on small screens */}
        {isOwner && (
          <div className="flex md:hidden items-center justify-center pb-2 px-3 pt-1 border-t border-[#BFE3FA]/50">
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
      <div className="flex-1 flex w-full relative">
        {/* DESKTOP SIDEBAR (Ocean Blue Theme) */}
        <aside className="hidden lg:flex flex-col w-60 shrink-0 p-4 border-r border-white/85 bg-white/70 backdrop-blur-md min-h-[calc(100vh-4rem)] sticky top-16 self-start max-h-[calc(100vh-4rem)] select-none shadow-ocean">
          <div className="mb-4 px-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#1F6FC8]">
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
                      ? 'btn-accent text-ink shadow-sm'
                      : 'text-muted hover:bg-white/80 hover:text-ink'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-ink stroke-[2.5]' : 'text-muted'}`} />
                  <span>{lang === 'ta' ? item.ta : item.en}</span>
                </button>
              );
            })}

            {/* Quick Action: Collect EMI Button in Sidebar */}
            <div className="pt-3">
              <button
                onClick={onOpenCollectModal}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-[#BFE3FA]/70 hover:bg-[#BFE3FA] text-[#1F6FC8] border border-[#6FB4F2]/40 transition"
              >
                <div className="flex items-center space-x-2">
                  <Wallet className="w-4 h-4 text-[#1F6FC8]" />
                  <span>{lang === 'ta' ? 'தவணை வசூல்' : 'Collect EMI'}</span>
                </div>
                <Plus className="w-3.5 h-3.5 text-[#1F6FC8]" />
              </button>
            </div>
          </nav>

          {/* Sidebar Footer */}
          <div className="pt-4 border-t border-[#BFE3FA] mt-auto space-y-2">
            <div className="p-3 rounded-2xl bg-white/75 backdrop-blur-md border border-[#BFE3FA] text-[11px] space-y-1">
              <div className="font-bold text-ink flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#1F6B4F]" />
                <span>{user?.name || 'EMI Agent'}</span>
              </div>
              <p className="text-muted capitalize text-[10px]">
                Role: {user?.role || 'emi_agent'}
              </p>
            </div>

            <button
              onClick={logout}
              className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold text-[#9B2C2C] hover:bg-[#FFD6D2]/60 transition"
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
              className="fixed inset-0 bg-[#2B3A4A]/40 backdrop-blur-xs transition-opacity"
              onClick={() => setIsSidebarOpen(false)}
            />
            <div className="relative w-72 max-w-[80vw] bg-white/95 backdrop-blur-md h-full shadow-ocean-lg z-10 p-5 flex flex-col justify-between border-r border-[#BFE3FA]">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#BFE3FA]">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-xl bg-[#6FB4F2] text-ink flex items-center justify-center font-bold">
                      <Layers className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-ink">EMI Menu</span>
                  </div>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1 rounded-lg text-muted hover:text-ink"
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
                            ? 'btn-accent text-ink shadow-xs'
                            : 'text-muted hover:bg-white/80'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{lang === 'ta' ? item.ta : item.en}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-[#BFE3FA] space-y-2">
                {isOwner && (
                  <button
                    onClick={() => {
                      setIsSidebarOpen(false);
                      onSwitchToLoans();
                    }}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#BFE3FA]/60 text-[#1F6FC8] border border-[#6FB4F2]/50 flex items-center justify-center space-x-1.5"
                  >
                    <span>Switch to Loans Section</span>
                  </button>
                )}
                <button
                  onClick={logout}
                  className="w-full py-2 rounded-xl text-xs font-bold text-[#9B2C2C] hover:bg-[#FFD6D2]/60 flex items-center justify-center space-x-1.5"
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
      <nav className="lg:hidden fixed bottom-2 inset-x-3 max-w-lg mx-auto z-40 bg-white/90 backdrop-blur-md rounded-[28px] border border-white/95 shadow-ocean-lg px-2 py-1.5 flex items-center justify-around text-ink">
        {/* Tab 1: Dashboard */}
        <button
          onClick={() => handleTabClick('dashboard')}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 text-[10px] font-bold ${
            activeEmiTab === 'dashboard' ? 'text-[#1F6FC8]' : 'text-muted'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span>Dashboard</span>
        </button>

        {/* Tab 2: EMI List */}
        <button
          onClick={() => handleTabClick('list')}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 text-[10px] font-bold ${
            activeEmiTab === 'list' ? 'text-[#1F6FC8]' : 'text-muted'
          }`}
        >
          <Layers className="w-4 h-4 mb-0.5" />
          <span>Accounts</span>
        </button>

        {/* Center Raised Collect FAB */}
        <button
          onClick={onOpenCollectModal}
          className="btn-accent relative -top-3 w-12 h-12 rounded-full text-ink flex items-center justify-center shadow-ocean active:scale-95 transition"
          aria-label="Collect EMI Payment"
        >
          <Wallet className="w-5 h-5 text-ink" />
        </button>

        {/* Tab 3: Receipts */}
        <button
          onClick={() => handleTabClick('receipts')}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 text-[10px] font-bold ${
            activeEmiTab === 'receipts' ? 'text-[#1F6FC8]' : 'text-muted'
          }`}
        >
          <Receipt className="w-4 h-4 mb-0.5" />
          <span>Receipts</span>
        </button>

        {/* Tab 4: Borrowers */}
        <button
          onClick={() => handleTabClick('customers')}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 text-[10px] font-bold ${
            activeEmiTab === 'customers' ? 'text-[#1F6FC8]' : 'text-muted'
          }`}
        >
          <Users className="w-4 h-4 mb-0.5" />
          <span>Borrowers</span>
        </button>
      </nav>
    </div>
  );
};

export default EmiLayout;
