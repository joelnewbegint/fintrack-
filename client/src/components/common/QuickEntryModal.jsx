import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  CreditCard,
  Banknote,
  UserPlus,
  Landmark,
  TrendingUp,
  CalendarCheck,
  ChevronRight,
  Zap,
  Sparkles,
} from 'lucide-react';

export const QuickEntryModal = ({
  isOpen,
  onClose,
  onRecordPayment,
  onAddLoan,
  onAddCustomer,
  onAddInvestment,
  onAddExpense,
  onDailyClosing,
}) => {
  const { lang } = useLanguage();
  const { isOwner, isClient } = useAuth();

  if (!isOpen) return null;

  const entries = [
    {
      id: 'payment',
      title: lang === 'ta' ? 'வசூல் பதிவு (Record Collection)' : 'Record Payment / Collection',
      subtitle: lang === 'ta' ? 'கடன் தவணை வசூல் பதிவு & ரசீது வழங்குதல்' : 'One-tap installment entry for any active loan',
      icon: CreditCard,
      color: 'from-emerald-500 to-teal-600',
      badge: 'P',
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
      action: () => {
        onClose();
        if (onRecordPayment) onRecordPayment();
      },
    },
    ...(!isClient
      ? [
          {
            id: 'loan',
            title: lang === 'ta' ? 'புதிய கடன் வழங்குதல் (Issue New Loan)' : 'Issue Customer Loan',
            subtitle: lang === 'ta' ? 'தினசரி, வாரம் அல்லது மாதத்தவணை கடன் கணக்கு' : 'Daily thandal, weekly, or monthly credit disbursement',
            icon: Banknote,
            color: 'from-sky-500 to-blue-600',
            badge: 'N',
            badgeColor: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
            action: () => {
              onClose();
              if (onAddLoan) onAddLoan();
            },
          },
          {
            id: 'customer',
            title: lang === 'ta' ? 'புதிய வாடிக்கையாளர் பதிவு (Add Customer)' : 'Register New Borrower',
            subtitle: lang === 'ta' ? 'வாடிக்கையாளர் KYC, தொடர்பு & முகவரி விவரங்கள்' : 'Borrower profile, identity verification & guarantor',
            icon: UserPlus,
            color: 'from-purple-500 to-indigo-600',
            badge: 'C',
            badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
            action: () => {
              onClose();
              if (onAddCustomer) onAddCustomer();
            },
          },
        ]
      : []),
    ...(isOwner
      ? [
          {
            id: 'investment',
            title: lang === 'ta' ? 'மூலதன முதலீடு சேர் / திருத்து (Investment)' : 'Add / Edit Capital Investment',
            subtitle: lang === 'ta' ? 'சொந்த முதலீடு அல்லது கூட்டாளி மூலதனம்' : 'Track promoter equity & partner wholesale funding',
            icon: Landmark,
            color: 'from-indigo-500 to-violet-600',
            badge: 'I',
            badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
            action: () => {
              onClose();
              if (onAddInvestment) onAddInvestment();
            },
          },
          {
            id: 'expense',
            title: lang === 'ta' ? 'அலுவலக செலவு பதிவு (Add Expense)' : 'Record Business Expense',
            subtitle: lang === 'ta' ? 'வாடகை, பெட்ரோல், அலுவலக & இதர செலவுகள்' : 'Operational travel, petty cash, tea & tea allowance',
            icon: TrendingUp,
            color: 'from-rose-500 to-pink-600',
            badge: 'E',
            badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
            action: () => {
              onClose();
              if (onAddExpense) onAddExpense();
            },
          },
          {
            id: 'closing',
            title: lang === 'ta' ? 'நாள் முடிவு தணிக்கை (Daily Closing)' : 'Day-End Cash Reconciliation',
            subtitle: lang === 'ta' ? 'ரொக்க இருப்பு மற்றும் ரூபாய் நோட்டுகள் சரிபார்த்தல்' : 'Daily cash drawer count and physical denomination audit',
            icon: CalendarCheck,
            color: 'from-amber-500 to-orange-600',
            badge: 'D',
            badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
            action: () => {
              onClose();
              if (onDailyClosing) onDailyClosing();
            },
          },
        ]
      : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in max-w-[430px] sm:max-w-none mx-auto left-0 right-0">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative glass-panel rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-white/80 dark:border-sky-800/60 max-h-[92vh] flex flex-col space-y-4">
        {/* Mobile Drag Handle */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto sm:hidden" />

        {/* Modal Header */}
        <div className="flex justify-between items-center pb-3 border-b border-sky-100 dark:border-sky-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-400 via-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/25">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center space-x-1.5">
                <span>{lang === 'ta' ? 'ஒட்டுமொத்த விரைவு உள்ளீடு' : 'One-Click Quick Entry'}</span>
                <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {lang === 'ta'
                  ? 'ஒரே கிளிக்கில் தேவையான பதிவை உடனடியாக துவங்குங்கள்'
                  : 'Instant 1-click access to all financial forms & transactions'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-sky-100 dark:hover:bg-sky-950/60 text-slate-400 hover:text-slate-600 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Grid */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[65vh]">
          {entries.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={item.action}
                className="w-full p-3.5 rounded-2xl glass hover:bg-sky-50/80 dark:hover:bg-sky-950/40 border border-sky-100 dark:border-sky-900/40 text-left transition active:scale-[0.98] shadow-sm flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${item.color} text-white flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 ml-2">
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold hidden sm:inline-block ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                  <div className="w-7 h-7 rounded-full glass border border-sky-200/60 dark:border-sky-800/60 flex items-center justify-center text-slate-400 group-hover:text-sky-600 group-hover:border-sky-400 transition">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="pt-2 text-center text-[10px] text-slate-400 dark:text-slate-500 border-t border-sky-100/60 dark:border-sky-900/30">
          VK Banker's & Finance • Quick One-Click Entry Hub
        </div>
      </div>
    </div>
  );
};

export default QuickEntryModal;
