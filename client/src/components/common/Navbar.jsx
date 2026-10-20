import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useDeviceMode } from '../../context/DeviceModeContext';
import { usePWA } from '../../context/PWAContext';
import DisplayModeSwitcher from './DisplayModeSwitcher';
import {
  Sun,
  Moon,
  Globe,
  LogOut,
  ShieldCheck,
  UserCheck,
  Wallet,
  Menu,
  Search,
  Bell,
  User,
  Download,
  FileText,
} from 'lucide-react';

export const Navbar = ({
  onToggleMobileMenu,
  onOpenSearch,
  onAddPayment,
  onOpenMoreSheet,
  onOpenNotifications,
  onOpenLoanForm,
  unreadNotificationsCount = 0,
}) => {
  const { user, logout, isOwner } = useAuth();
  const { lang, toggleLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { isLaptop, isMobile } = useDeviceMode();
  const { isInstalled, promptInstall } = usePWA();

  // ----------------------------------------------------
  // MOBILE HEADER (Max 56px, glass, safe-area-inset-top)
  // ----------------------------------------------------
  if (isMobile) {
    return (
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/60 dark:border-sky-800/40 transition-colors pt-safe">
        <div className="px-3 h-14 flex items-center justify-between gap-2 max-w-full">
          {/* Left: Logo Icon + "VK BANKER'S" title only */}
          <div className="flex items-center space-x-2.5 shrink-0 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-400 via-sky-500 to-sky-600 flex items-center justify-center text-white shadow-md shadow-sky-500/25 border border-white/60 shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="font-black text-base tracking-tight bg-gradient-to-r from-sky-600 to-sky-500 dark:from-sky-300 dark:to-sky-400 bg-clip-text text-transparent truncate">
              VK BANKER'S
            </span>
          </div>

          {/* Right: Install (if applicable) + Bell + Avatar Button */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Loan Application Form Button */}
            <button
              onClick={onOpenLoanForm}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl glass border border-sky-300/70 dark:border-sky-700/60 text-sky-600 dark:text-sky-400 active:scale-95 transition"
              aria-label="Loan Form"
              title={lang === 'ta' ? 'கடன் விண்ணப்பப் படிவம்' : 'Download Loan Application Form'}
            >
              <FileText className="w-4 h-4 text-sky-500" />
            </button>

            {!isInstalled && (
              <button
                onClick={promptInstall}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl glass border border-amber-300/70 dark:border-amber-700/60 text-amber-600 dark:text-amber-400 active:scale-95 transition"
                aria-label="Install App"
                title={lang === 'ta' ? 'செயலியை நிறுவுக' : 'Install VK BANKER\'S App'}
              >
                <Download className="w-4 h-4 text-amber-500" />
              </button>
            )}

            {/* Bell / Notification Button */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl glass border border-sky-200/60 dark:border-sky-800/60 text-slate-700 dark:text-slate-300 active:scale-95 transition"
              aria-label="Notifications"
              title="Notifications / அறிவிப்புகள்"
            >
              <Bell className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              {unreadNotificationsCount > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse">
                  {unreadNotificationsCount}
                </span>
              ) : (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-sky-400 ring-2 ring-white dark:ring-slate-900" />
              )}
            </button>

            {/* Avatar Button -> Opens Slide-in More Sheet */}
            <button
              onClick={onOpenMoreSheet}
              className="p-1 min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95 transition"
              aria-label="User profile and settings"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-sky-600 text-white font-black text-xs flex items-center justify-center shadow-md shadow-sky-500/25 border border-white/80 ring-2 ring-sky-300/60 dark:ring-sky-700/60">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
            </button>
          </div>
        </div>
      </header>
    );
  }

  // ----------------------------------------------------
  // DESKTOP & TABLET HEADER
  // ----------------------------------------------------
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/60 dark:border-sky-800/40 transition-colors">
      <div className={`mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 ${isTablet ? 'max-w-6xl' : 'w-full max-w-[1720px] 2xl:max-w-[1920px]'}`}>
        {/* Brand / Logo */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            </button>
          )}

          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-400 via-sky-500 to-sky-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/30 border border-white/60">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <span className="font-black text-lg sm:text-xl tracking-tight bg-gradient-to-r from-sky-600 to-sky-500 dark:from-sky-300 dark:to-sky-400 bg-clip-text text-transparent">
                  VK BANKER'S & FINANCE
                </span>
                <span className="text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-700/60">
                  {lang === 'ta' ? 'வி.கே. பேங்கர்ஸ்' : "VK BANKER'S"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-none hidden sm:block">
                {t('appSubtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Laptop Mode Search Bar with '/' Shortcut */}
        {isLaptop && (
          <div className="hidden lg:flex items-center flex-1 max-w-xs mx-4">
            <button
              onClick={onOpenSearch}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-2xl glass border border-sky-200/60 dark:border-sky-800/60 text-xs text-slate-400 hover:border-sky-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all shadow-sm"
              title="Search loans and customers (Press /)"
            >
              <div className="flex items-center space-x-2">
                <Search className="w-3.5 h-3.5 text-sky-500" />
                <span>தேடல் / Search...</span>
              </div>
              <kbd className="px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 font-mono text-[10px] font-bold border border-sky-200/60 dark:border-sky-700/60">
                /
              </kbd>
            </button>
          </div>
        )}

        {/* Action Controls & Device Switcher */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5">
          {/* Display Mode Switcher (Mobile / Tablet / Laptop / Auto) */}
          <DisplayModeSwitcher compact={false} />

          {/* Desktop Notification Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl glass border border-sky-200/60 dark:border-sky-800/60 text-slate-700 dark:text-slate-200 hover:border-sky-400 hover:text-sky-600 transition shadow-sm active:scale-95"
            title="Notifications & Alerts / அறிவிப்புகள்"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 text-sky-500" />
            {unreadNotificationsCount > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse">
                {unreadNotificationsCount}
              </span>
            ) : (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-sky-400 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          {/* Loan Application Form Button */}
          <button
            onClick={onOpenLoanForm}
            className="flex items-center space-x-1.5 px-3 py-1.5 min-h-[40px] rounded-xl glass border border-sky-300/70 dark:border-sky-600/50 bg-gradient-to-r from-sky-500/10 to-indigo-500/10 text-slate-800 dark:text-slate-100 text-xs font-bold hover:border-sky-400 hover:shadow-md transition active:scale-95 shadow-sm"
            title={lang === 'ta' ? 'கடன் விண்ணப்பப் படிவத்தை அச்சிட / பதிவிறக்க' : 'Print or Download Loan Application Form'}
          >
            <FileText className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            <span className="hidden sm:inline font-bold text-sky-700 dark:text-sky-300">
              {lang === 'ta' ? 'கடன் படிவம்' : 'Loan Form'}
            </span>
          </button>

          {/* Desktop Install App Button */}
          {!isInstalled && (
            <button
              onClick={promptInstall}
              className="flex items-center space-x-1.5 px-3 py-1.5 min-h-[40px] rounded-xl glass border border-amber-300/70 dark:border-amber-600/50 bg-gradient-to-r from-amber-500/10 to-sky-500/10 text-slate-800 dark:text-slate-100 text-xs font-bold hover:border-amber-400 hover:shadow-md transition active:scale-95 shadow-sm"
              title={lang === 'ta' ? "VK BANKER'S செயலியை உங்கள் சாதனத்தில் நிறுவுக" : "Install VK BANKER'S App on your device"}
            >
              <Download className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="hidden sm:inline font-bold text-amber-600 dark:text-amber-400">
                {lang === 'ta' ? 'நிறுவுக' : 'Install'}
              </span>
            </button>
          )}

          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="flex items-center space-x-1 px-2.5 sm:px-3 py-1.5 min-h-[40px] rounded-xl glass border border-sky-200/60 dark:border-sky-800/60 text-slate-700 dark:text-slate-200 text-xs font-bold hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition active:scale-95 shadow-sm"
            title="Toggle Language / மொழி மாற்றம்"
          >
            <Globe className="w-3.5 h-3.5 text-sky-500" />
            <span className="hidden sm:inline">{lang === 'ta' ? 'English' : 'தமிழ்'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl glass border border-sky-200/60 dark:border-sky-800/60 text-slate-700 dark:text-slate-200 hover:text-amber-500 hover:border-sky-400 transition shadow-sm active:scale-95"
            title="Toggle Dark / Light Theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-sky-600" />
            )}
          </button>

          {/* User Role Badge */}
          {user && (
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-xl glass border border-sky-200/60 dark:border-sky-800/60 text-xs font-medium">
              {isOwner ? (
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              ) : (
                <UserCheck className="w-4 h-4 text-sky-500" />
              )}
              <div className="flex flex-col text-left">
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[100px]">
                  {(user?.name || user?.email || 'User').split(' ')[0]}
                </span>
                <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold capitalize">
                  {user?.role || 'User'}
                </span>
              </div>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition active:scale-95"
            title={t('logout')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
