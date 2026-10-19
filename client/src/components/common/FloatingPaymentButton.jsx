import React, { useState, useEffect } from 'react';
import { useDeviceMode } from '../../context/DeviceModeContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Plus,
  CreditCard,
  Banknote,
  UserPlus,
  TrendingUp,
  X,
  ChevronRight,
} from 'lucide-react';

export const FloatingPaymentButton = ({
  onRecordPayment,
  onAddLoan,
  onAddCustomer,
  onAddInvestment,
}) => {
  const { isMobile } = useDeviceMode();
  const { isOwner } = useAuth();
  const { lang } = useLanguage();
  const [showSheet, setShowSheet] = useState(false);
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

  return (
    <>
      {/* Quick Actions Bottom Sheet */}
      {showSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setShowSheet(false)}
            aria-hidden="true"
          />

          <div className="relative glass-panel rounded-t-3xl p-5 border-t border-white/80 dark:border-sky-700/60 shadow-2xl max-w-[430px] w-full mx-auto space-y-3 pb-safe">
            {/* Drag Handle */}
            <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-sky-800/80 mx-auto mb-2" />

            <div className="flex items-center justify-between pb-2 border-b border-sky-100 dark:border-sky-900/60">
              <h3 className="font-black text-sm text-slate-900 dark:text-white">
                {lang === 'ta' ? 'விரைவு செயல்கள்' : 'Quick Actions'}
              </h3>
              <button
                onClick={() => setShowSheet(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 pt-1">
              {/* Option 1: Record Payment */}
              <button
                onClick={() => {
                  setShowSheet(false);
                  if (onRecordPayment) onRecordPayment();
                }}
                className="w-full min-h-[52px] p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white flex items-center justify-between shadow-md shadow-emerald-500/20 active:scale-98 transition text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-black text-xs">
                      {lang === 'ta' ? 'வசூல் பதிவு (Record Payment)' : 'Record Payment / Collection'}
                    </p>
                    <p className="text-[10px] text-emerald-100 font-medium">
                      {lang === 'ta' ? 'தினசரி, வாரம் அல்லது மாதத்தவணை வரவு' : 'One-tap installment entry for any loan'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-100 shrink-0" />
              </button>

              {/* Option 2: Add Loan (Owner Only) */}
              {isOwner && (
                <button
                  onClick={() => {
                    setShowSheet(false);
                    if (onAddLoan) onAddLoan();
                  }}
                  className="w-full min-h-[52px] p-3.5 rounded-2xl glass hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/60 text-slate-900 dark:text-white flex items-center justify-between shadow-sm active:scale-98 transition text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-black text-xs">
                        {lang === 'ta' ? 'புதிய கடன் (Issue Loan)' : 'Issue New Loan'}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        {lang === 'ta' ? 'தினசரி தண்டல், வாரம், மாதக் கடன்' : 'Create new daily, weekly, or monthly loan'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              )}

              {/* Option 3: Add Customer */}
              {isOwner && (
                <button
                  onClick={() => {
                    setShowSheet(false);
                    if (onAddCustomer) onAddCustomer();
                  }}
                  className="w-full min-h-[52px] p-3.5 rounded-2xl glass hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/60 text-slate-900 dark:text-white flex items-center justify-between shadow-sm active:scale-98 transition text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-black text-xs">
                        {lang === 'ta' ? 'புதிய வாடிக்கையாளர் (Add Customer)' : 'Add New Customer'}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        {lang === 'ta' ? 'ஆதார், முகவரி & ஜாமீன் விவரம்' : 'Borrower KYC, Aadhaar & Guarantor'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              )}

              {/* Option 4: Add Capital Investment (Owner Only) */}
              {isOwner && onAddInvestment && (
                <button
                  onClick={() => {
                    setShowSheet(false);
                    onAddInvestment();
                  }}
                  className="w-full min-h-[52px] p-3.5 rounded-2xl glass hover:bg-sky-50 dark:hover:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/60 text-slate-900 dark:text-white flex items-center justify-between shadow-sm active:scale-98 transition text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-black text-xs">
                        {lang === 'ta' ? 'மூலதன முதலீடு (Add Investment)' : 'Record Capital Investment'}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        {lang === 'ta' ? 'தொழில் முதலீட்டு நிதி பதிவு' : 'Add capital fund to business'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button (Round 56px, single '+' icon, 16px above nav bar) */}
      <div className="fixed bottom-20 left-0 right-0 max-w-[430px] mx-auto pointer-events-none z-40">
        <button
          onClick={() => setShowSheet(true)}
          className="pointer-events-auto absolute right-4 bottom-0 w-14 h-14 rounded-full bg-gradient-to-tr from-sky-400 via-sky-500 to-sky-600 text-white shadow-xl shadow-sky-500/40 border-2 border-white/80 flex items-center justify-center active:scale-95 hover:scale-105 transition-all"
          aria-label="Add or Record Action"
          title="Quick Actions (+)"
        >
          <Plus className="w-7 h-7 stroke-[2.5]" />
        </button>
      </div>
    </>
  );
};

export default FloatingPaymentButton;
