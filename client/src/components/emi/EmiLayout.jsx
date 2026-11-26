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
  Globe,
} from 'lucide-react';

export const EmiLayout = ({
  children,
  activeEmiTab = 'dashboard',
  onSelectEmiTab,
  setActiveEmiTab,
  onOpenCollectModal,
  onOpenNewEMILoanModal,
  onOpenNewLoanModal,
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
    const fn = onSelectEmiTab || setActiveEmiTab;
    if (fn) {
      fn(tabId);
    }
    setIsSidebarOpen(false);
  };

  const handleNewLoanClick = () => {
    const fn = onOpenNewEMILoanModal || onOpenNewLoanModal;
    if (fn) {
      fn();
    }
    setIsSidebarOpen(false);
  };

  return (
    <div
      className="min-h-screen flex flex-col font-sans transition-colors duration-200 text-[#183653]"
      style={{
        backgroundColor: '#F3F9FF',
        backgroundImage:
          'radial-gradient(circle at 92% 8%, rgba(85, 184, 245, 0.22) 0%, transparent 45%), radial-gradient(circle at 8% 85%, rgba(8, 120, 209, 0.14) 0%, transparent 50%), linear-gradient(180deg, #F3F9FF 0%, #EAF5FF 100%)',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* -------------------------------------------------------------
          TOP BAR (Ocean Blue Glass Theme matching Navbar.jsx)
      ------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 w-full bg-white/85 backdrop-blur-[20px] border-b border-[#D5E9FA] shadow-[0_8px_30px_rgba(8,120,209,0.08)] transition-colors">
        <div className="w-full px-3 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Left: Mobile Menu + Brand Badge + Title */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-[#647C95] hover:text-[#0878D1] hover:bg-[#EAF5FF] transition lg:hidden"
              aria-label="Toggle EMI Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-[#0878D1] to-[#064B8E] text-white flex items-center justify-center shadow-md shadow-[#0878D1]/25 shrink-0 border border-white/60">
              <Layers className="w-5 h-5" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#18A879] ring-2 ring-white" />
            </div>

            <div className="flex flex-col justify-center min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-black text-sm sm:text-base text-[#183653] tracking-tight leading-tight whitespace-nowrap">
                  {lang === 'ta' ? 'வி.கே. பேங்கர்ஸ்' : "VK BANKER'S"}
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA] tracking-wide whitespace-nowrap">
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

          {/* Right Tools: Quick Collect, Language, User Profile & Logout */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={onOpenCollectModal}
              className="h-9 px-3.5 rounded-full bg-gradient-to-r from-[#0878D1] to-[#064B8E] hover:from-[#0988ED] hover:to-[#085BAA] text-white text-xs font-bold shadow-md shadow-[#0878D1]/25 flex items-center space-x-1.5 active:scale-95 transition"
              title="Collect EMI Payment"
            >
              <Wallet className="w-3.5 h-3.5 text-white shrink-0" />
              <span className="hidden sm:inline">{lang === 'ta' ? 'தவணை வசூல்' : 'Collect EMI'}</span>
            </button>

            <button
              type="button"
              onClick={toggleLanguage}
              className="h-9 px-3 rounded-full bg-white/85 hover:bg-[#EAF5FF] border border-[#D5E9FA] text-xs font-bold text-[#183653] flex items-center space-x-1 transition active:scale-95 shadow-xs"
              title="Switch Language"
            >
              <Globe className="w-3.5 h-3.5 text-[#0878D1]" />
              <span>{lang === 'ta' ? 'EN' : 'தமிழ்'}</span>
            </button>

            <div className="flex items-center space-x-1.5 pl-1 sm:pl-2 border-l border-[#D5E9FA]">
              <div
                className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0878D1] to-[#064B8E] text-white font-black text-xs flex items-center justify-center shadow-xs border border-white"
                title={user?.name || 'User'}
              >
                {user?.name ? user.name[0].toUpperCase() : 'V'}
              </div>
              <button
                type="button"
                onClick={logout}
                title="Logout"
                className="w-8 h-8 flex items-center justify-center rounded-xl text-[#647C95] hover:text-rose-600 hover:bg-rose-50 transition active:scale-95"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Sub-strip: Loans / EMI Single Swap Chip for Owner on small screens */}
        {isOwner && (
          <div className="flex md:hidden items-center justify-center pb-2 px-3 pt-1 border-t border-[#D5E9FA]/60">
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
        {/* DESKTOP SIDEBAR (Ocean Blue Theme matching Sidebar.jsx) */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 p-4 border-r border-[#D5E9FA] bg-white/75 backdrop-blur-[20px] h-[calc(100vh-4rem)] sticky top-16 self-start select-none shadow-[0_8px_30px_rgba(8,120,209,0.08)] z-30 overflow-y-auto no-scrollbar">
          <div className="mb-3 px-2 pb-2.5 border-b border-[#D5E9FA]/70">
            <span className="text-[10.5px] font-black uppercase tracking-widest text-[#0878D1]">
              EMI NAVIGATION / தவணை பிரிவு
            </span>
          </div>

          <nav className="space-y-1.5 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeEmiTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-150 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#0878D1] to-[#064B8E] text-white shadow-md shadow-[#0878D1]/25'
                      : 'text-[#647C95] hover:bg-[#EAF5FF] hover:text-[#0878D1]'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white stroke-[2.5]' : 'text-[#647C95]'}`} />
                  <span className="truncate">{lang === 'ta' ? item.ta : item.en}</span>
                </button>
              );
            })}

            {/* Quick Actions in Sidebar */}
            <div className="pt-3 mt-3 border-t border-[#D5E9FA]/60 space-y-2">
              <button
                type="button"
                onClick={onOpenCollectModal}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-[#18A879]/10 hover:bg-[#18A879]/20 text-[#18A879] border border-[#18A879]/30 transition active:scale-95"
              >
                <div className="flex items-center space-x-2">
                  <Wallet className="w-4 h-4 text-[#18A879]" />
                  <span>{lang === 'ta' ? 'தவணை வசூல்' : 'Collect EMI'}</span>
                </div>
                <Plus className="w-3.5 h-3.5 text-[#18A879]" />
              </button>

              <button
                type="button"
                onClick={handleNewLoanClick}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-[#EAF5FF] hover:bg-[#D5E9FA]/70 text-[#0878D1] border border-[#D5E9FA] transition active:scale-95"
              >
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-[#0878D1]" />
                  <span>{lang === 'ta' ? 'புதிய EMI கடன்' : 'New EMI Loan'}</span>
                </div>
                <Plus className="w-3.5 h-3.5 text-[#0878D1]" />
              </button>
            </div>
          </nav>

          {/* Sidebar Footer */}
          <div className="pt-4 border-t border-[#D5E9FA] mt-4 space-y-2">
            <div className="p-3 rounded-2xl bg-[#F3F9FF] border border-[#D5E9FA] text-[11px] space-y-1">
              <div className="font-bold text-[#183653] flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#18A879] shrink-0" />
                <span className="truncate">{user?.name || 'EMI Staff'}</span>
              </div>
              <p className="text-[#647C95] capitalize text-[10px]">
                Role: {user?.role?.replace('_', ' ') || 'emi_agent'}
              </p>
            </div>

            <button
              type="button"
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
              className="fixed inset-0 bg-[#183653]/40 backdrop-blur-xs transition-opacity"
              onClick={() => setIsSidebarOpen(false)}
            />
            <div className="relative w-72 max-w-[80vw] bg-white/95 backdrop-blur-md h-full shadow-2xl z-10 p-5 flex flex-col justify-between border-r border-[#D5E9FA]">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#D5E9FA]">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0878D1] to-[#064B8E] text-white flex items-center justify-center font-bold">
                      <Layers className="w-4 h-4" />
                    </div>
                    <span className="font-black text-sm text-[#183653]">EMI Menu</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-1.5 rounded-lg text-[#647C95] hover:text-[#183653] hover:bg-[#EAF5FF]"
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
                        type="button"
                        onClick={() => handleTabClick(item.id)}
                        className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                          isActive
                            ? 'bg-gradient-to-r from-[#0878D1] to-[#064B8E] text-white shadow-sm'
                            : 'text-[#647C95] hover:bg-[#EAF5FF] hover:text-[#0878D1]'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#647C95]'}`} />
                        <span>{lang === 'ta' ? item.ta : item.en}</span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={handleNewLoanClick}
                    className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-[#0878D1] bg-[#EAF5FF] border border-[#D5E9FA] mt-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{lang === 'ta' ? 'புதிய EMI கடன்' : 'New EMI Loan'}</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-[#D5E9FA] space-y-2">
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSidebarOpen(false);
                      onSwitchToLoans && onSwitchToLoans();
                    }}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA] flex items-center justify-center space-x-1.5"
                  >
                    <span>Switch to Loans Section</span>
                  </button>
                )}
                <button
                  type="button"
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
          MOBILE BOTTOM NAVIGATION BAR (Ocean Blue Glass)
      ------------------------------------------------------------- */}
      <nav className="lg:hidden fixed bottom-2 inset-x-3 max-w-lg mx-auto z-40 bg-white/90 backdrop-blur-[20px] rounded-[28px] border border-[#D5E9FA] shadow-[0_10px_32px_rgba(8,120,209,0.12)] px-2 py-1.5 flex items-center justify-around text-[#183653]">
        <button
          type="button"
          onClick={() => handleTabClick('dashboard')}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 text-[10px] font-bold ${
            activeEmiTab === 'dashboard' ? 'text-[#0878D1]' : 'text-[#647C95]'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('list')}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 text-[10px] font-bold ${
            activeEmiTab === 'list' ? 'text-[#0878D1]' : 'text-[#647C95]'
          }`}
        >
          <Layers className="w-4 h-4 mb-0.5" />
          <span>Accounts</span>
        </button>

        <button
          type="button"
          onClick={onOpenCollectModal}
          className="relative -top-3 w-12 h-12 rounded-full bg-gradient-to-br from-[#0878D1] to-[#064B8E] text-white flex items-center justify-center shadow-lg shadow-[#0878D1]/30 border-2 border-white active:scale-95 transition"
          aria-label="Collect EMI Payment"
        >
          <Wallet className="w-5 h-5 text-white" />
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('receipts')}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 text-[10px] font-bold ${
            activeEmiTab === 'receipts' ? 'text-[#0878D1]' : 'text-[#647C95]'
          }`}
        >
          <Receipt className="w-4 h-4 mb-0.5" />
          <span>Receipts</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('customers')}
          className={`flex flex-col items-center justify-center min-w-[56px] py-1 text-[10px] font-bold ${
            activeEmiTab === 'customers' ? 'text-[#0878D1]' : 'text-[#647C95]'
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
