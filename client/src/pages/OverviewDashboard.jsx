import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import {
  Wallet,
  TrendingUp,
  CreditCard,
  Layers,
  Briefcase,
  Users,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  PieChart,
} from 'lucide-react';

export const OverviewDashboard = ({
  onSwitchToLoans,
  onSwitchToEMI,
}) => {
  const { user } = useAuth();
  const { lang } = useLanguage();

  const [loanStats, setLoanStats] = useState(null);
  const [emiStats, setEmiStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCombinedMetrics = async () => {
      try {
        setLoading(true);
        const [loansRes, emiRes] = await Promise.allSettled([
          api.getDashboardStats(),
          api.getEMIDashboardStats('all'),
        ]);

        if (loansRes.status === 'fulfilled' && loansRes.value) {
          setLoanStats(loansRes.value);
        }
        if (emiRes.status === 'fulfilled' && emiRes.value?.success) {
          setEmiStats(emiRes.value.stats);
        }
      } catch (e) {
        console.warn('Overview fetch note:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchCombinedMetrics();
  }, []);

  // Aggregated Totals
  const totalLentLoans = loanStats?.totalLent || 0;
  const totalLentEMI = emiStats?.totalPrincipalLent || 0;
  const combinedTotalLent = totalLentLoans + totalLentEMI;

  const collectedTodayLoans = loanStats?.collectedToday || 0;
  const collectedTodayEMI = emiStats?.collectedToday || 0;
  const combinedCollectedToday = collectedTodayLoans + collectedTodayEMI;

  const outstandingLoans = loanStats?.totalOutstanding || 0;
  const outstandingEMI = emiStats?.pendingBalance || 0;
  const combinedOutstanding = outstandingLoans + outstandingEMI;

  const activeBorrowersLoans = (loanStats?.loans || []).filter(l => l.status === 'active').length;
  const activeBorrowersEMI = emiStats?.activeLoansCount || 0;
  const combinedBorrowers = activeBorrowersLoans + activeBorrowersEMI;

  return (
    <div
      className="space-y-6 pb-12 -mx-2 sm:-mx-4 lg:-mx-6 px-3 sm:px-6 py-4 rounded-3xl"
      style={{
        background: 'linear-gradient(180deg, #FFF8F5 0%, #FFF3EC 60%, #F8FAFD 100%)',
      }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-bold border border-orange-200">
              👑 நிறுவனர் மேலோட்டம் / Master Portfolio
            </span>
            <span className="text-xs text-slate-500 font-medium">Combined Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            {lang === 'ta' ? 'முழுமையான நிதி மேலோட்டம்' : 'Consolidated Business Overview'}
          </h1>
          <p className="text-xs text-slate-500">
            {lang === 'ta'
              ? 'தினசரி/வார/மாத கடன்கள் மற்றும் EMI தவணைகளின் ஒருங்கிணைந்த கணக்கு'
              : 'Unified executive summary combining both Loan Collections and Monthly EMI portfolios.'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onSwitchToLoans}
            className="h-10 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-sm transition active:scale-95 flex items-center space-x-1.5"
          >
            <Briefcase className="w-4 h-4" />
            <span>Open Loans Module ➔</span>
          </button>
          <button
            onClick={onSwitchToEMI}
            className="h-10 px-4 rounded-xl font-bold text-xs text-white shadow-sm transition active:scale-95 flex items-center space-x-1.5"
            style={{
              background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
            }}
          >
            <Layers className="w-4 h-4" />
            <span>Open EMI Module ➔</span>
          </button>
        </div>
      </div>

      {/* Hero 4 Big Cards: Combined Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Combined Collections Today */}
        <div
          className="rounded-2xl p-4 sm:p-5 border flex flex-col justify-between"
          style={{
            background: 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(255, 255, 255, 0.95)',
            boxShadow: '0 10px 25px -5px rgba(249, 115, 22, 0.12)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-orange-700 uppercase tracking-wider">
              Combined Cash In Hand
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ₹{combinedCollectedToday.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-500">Total collected today across all staff</p>
          </div>
          <div className="text-[10px] text-slate-600 flex justify-between border-t pt-1.5 border-slate-100">
            <span>Loans: ₹{collectedTodayLoans.toLocaleString('en-IN')}</span>
            <span>EMI: ₹{collectedTodayEMI.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Combined Total Lent */}
        <div
          className="rounded-2xl p-4 sm:p-5 border flex flex-col justify-between"
          style={{
            background: 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(255, 255, 255, 0.95)',
            boxShadow: '0 8px 20px -4px rgba(56, 189, 248, 0.12)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider">
              Total Capital Lent
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ₹{combinedTotalLent.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-500">Gross funds sanctioned to borrowers</p>
          </div>
          <div className="text-[10px] text-slate-600 flex justify-between border-t pt-1.5 border-slate-100">
            <span>Loans: ₹{totalLentLoans.toLocaleString('en-IN')}</span>
            <span>EMI: ₹{totalLentEMI.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Combined Outstanding Balance */}
        <div
          className="rounded-2xl p-4 sm:p-5 border flex flex-col justify-between"
          style={{
            background: 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(255, 255, 255, 0.95)',
            boxShadow: '0 8px 20px -4px rgba(244, 63, 94, 0.12)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
              Pending Portfolio
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              ₹{combinedOutstanding.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-500">Total remaining principal in market</p>
          </div>
          <div className="text-[10px] text-slate-600 flex justify-between border-t pt-1.5 border-slate-100">
            <span>Loans: ₹{outstandingLoans.toLocaleString('en-IN')}</span>
            <span>EMI: ₹{outstandingEMI.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Combined Active Borrowers */}
        <div
          className="rounded-2xl p-4 sm:p-5 border flex flex-col justify-between"
          style={{
            background: 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(255, 255, 255, 0.95)',
            boxShadow: '0 8px 20px -4px rgba(16, 185, 129, 0.12)',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
              Active Accounts
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {combinedBorrowers}
            </div>
            <p className="text-[11px] text-slate-500">Live active borrowers on book</p>
          </div>
          <div className="text-[10px] text-slate-600 flex justify-between border-t pt-1.5 border-slate-100">
            <span>Loans: {activeBorrowersLoans}</span>
            <span>EMI: {activeBorrowersEMI}</span>
          </div>
        </div>
      </div>

      {/* Side-by-Side Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Module 1: Daily/Weekly/Monthly Loans */}
        <div
          className="rounded-3xl p-6 border flex flex-col justify-between cursor-pointer hover:shadow-lg transition group"
          onClick={onSwitchToLoans}
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(255, 255, 255, 0.95)',
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-600">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 group-hover:text-sky-600 transition">
                    Loans Module (கடன் பிரிவு)
                  </h3>
                  <p className="text-xs text-slate-500">Daily Thandal, Weekly & Monthly Flat</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition" />
            </div>

            <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Today's Collections</span>
                <span className="text-base font-black text-slate-800">
                  ₹{collectedTodayLoans.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Active Outstanding</span>
                <span className="text-base font-black text-sky-600">
                  ₹{outstandingLoans.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between text-xs font-bold text-sky-600">
            <span>Manage Daily, Weekly & Monthly Loans</span>
            <span>Open ➔</span>
          </div>
        </div>

        {/* Module 2: Monthly EMI Suite */}
        <div
          className="rounded-3xl p-6 border flex flex-col justify-between cursor-pointer hover:shadow-lg transition group"
          onClick={onSwitchToEMI}
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(255, 255, 255, 0.95)',
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 group-hover:text-orange-600 transition">
                    EMI Module (மாத தவணை பிரிவு)
                  </h3>
                  <p className="text-xs text-slate-500">Reducing Balance & Amortized Installments</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition" />
            </div>

            <div className="grid grid-cols-2 gap-3 py-3 border-y border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Today's Collections</span>
                <span className="text-base font-black text-slate-800">
                  ₹{collectedTodayEMI.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Active Outstanding</span>
                <span className="text-base font-black text-orange-600">
                  ₹{outstandingEMI.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between text-xs font-bold text-orange-600">
            <span>Manage EMI Portfolio & Receipts</span>
            <span>Open ➔</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewDashboard;

