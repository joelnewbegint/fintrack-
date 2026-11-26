import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import {
  Wallet,
  TrendingUp,
  Layers,
  Briefcase,
  Users,
  Clock,
  ChevronRight,
} from 'lucide-react';

export const OverviewDashboard = ({
  onSwitchToLoans,
  onSwitchToEMI,
}) => {
  const { lang } = useLanguage();

  const [loanStats, setLoanStats] = useState(null);
  const [emiStats, setEmiStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCombinedMetrics = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchCombinedMetrics();
    const handleRefresh = () => fetchCombinedMetrics();
    window.addEventListener('fintrack:emi-updated', handleRefresh);
    return () => window.removeEventListener('fintrack:emi-updated', handleRefresh);
  }, [fetchCombinedMetrics]);

  // Aggregated Totals
  const totalLentLoans = loanStats?.cards?.totalLent || loanStats?.totalLent || 0;
  const totalLentEMI = emiStats?.totalPrincipalLent || 0;
  const combinedTotalLent = totalLentLoans + totalLentEMI;

  const collectedTodayLoans =
    loanStats?.cards?.collectedToday ||
    loanStats?.cards?.netCollectionInHand ||
    loanStats?.cards?.totalCollected ||
    loanStats?.collectedToday ||
    0;
  const collectedTodayEMI = emiStats?.collectedToday || 0;
  const combinedCollectedToday = collectedTodayLoans + collectedTodayEMI;

  const outstandingLoans = loanStats?.cards?.totalOutstanding || loanStats?.totalOutstanding || 0;
  const outstandingEMI = emiStats?.pendingBalance || 0;
  const combinedOutstanding = outstandingLoans + outstandingEMI;

  const activeBorrowersLoans =
    loanStats?.cards?.activeLoans ||
    (loanStats?.loans || []).filter((l) => l.status === 'active').length ||
    0;
  const activeBorrowersEMI = emiStats?.activeLoansCount || 0;
  const combinedBorrowers = activeBorrowersLoans + activeBorrowersEMI;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#EAF5FF] text-[#0878D1] text-xs font-bold border border-[#D5E9FA]">
              நிறுவனர் மேலோட்டம் / Master Portfolio
            </span>
            <span className="text-xs text-[#647C95] font-medium">Combined Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#183653] tracking-tight mt-1">
            {lang === 'ta' ? 'முழுமையான நிதி மேலோட்டம்' : 'Consolidated Business Overview'}
          </h1>
          <p className="text-xs text-[#647C95]">
            {lang === 'ta'
              ? 'தினசரி/வார/மாத கடன்கள் மற்றும் EMI தவணைகளின் ஒருங்கிணைந்த கணக்கு'
              : 'Unified executive summary combining both Loan Collections and Monthly EMI portfolios.'}
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={onSwitchToLoans}
            className="h-10 px-4 rounded-xl bg-white hover:bg-[#F3F9FF] text-[#0878D1] border border-[#D5E9FA] font-bold text-xs shadow-sm transition active:scale-95 flex items-center space-x-1.5"
          >
            <Briefcase className="w-4 h-4" />
            <span>Open Loans Module</span>
          </button>
          <button
            onClick={onSwitchToEMI}
            className="h-10 px-4 rounded-xl font-bold text-xs text-white shadow-sm transition active:scale-95 flex items-center space-x-1.5 bg-gradient-to-r from-[#0878D1] to-[#064B8E] hover:brightness-105"
          >
            <Layers className="w-4 h-4" />
            <span>Open EMI Module</span>
          </button>
        </div>
      </div>

      {/* Hero 4 Big Cards: Combined Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Combined Collections Today */}
        <div className="glass-card rounded-[24px] p-4 sm:p-5 border border-[#D5E9FA]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#0878D1] uppercase tracking-wider">
              Combined Cash In Hand
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#EAF5FF] flex items-center justify-center text-[#0878D1]">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black text-[#183653] tracking-tight tabular-nums">
              {loading ? '...' : `₹${combinedCollectedToday.toLocaleString('en-IN')}`}
            </div>
            <p className="text-[11px] text-[#647C95]">Total collected today across all staff</p>
          </div>
          <div className="text-[10px] text-[#647C95] flex justify-between border-t pt-1.5 border-[#D5E9FA]/60">
            <span>Loans: ₹{collectedTodayLoans.toLocaleString('en-IN')}</span>
            <span>EMI: ₹{collectedTodayEMI.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Combined Total Lent */}
        <div className="glass-card rounded-[24px] p-4 sm:p-5 border border-[#D5E9FA]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#064B8E] uppercase tracking-wider">
              Total Capital Lent
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#EAF5FF] flex items-center justify-center text-[#064B8E]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black text-[#183653] tracking-tight tabular-nums">
              {loading ? '...' : `₹${combinedTotalLent.toLocaleString('en-IN')}`}
            </div>
            <p className="text-[11px] text-[#647C95]">Gross funds sanctioned to borrowers</p>
          </div>
          <div className="text-[10px] text-[#647C95] flex justify-between border-t pt-1.5 border-[#D5E9FA]/60">
            <span>Loans: ₹{totalLentLoans.toLocaleString('en-IN')}</span>
            <span>EMI: ₹{totalLentEMI.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Combined Outstanding Balance */}
        <div className="glass-card rounded-[24px] p-4 sm:p-5 border border-[#D5E9FA]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
              Pending Portfolio
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black text-[#183653] tracking-tight tabular-nums">
              {loading ? '...' : `₹${combinedOutstanding.toLocaleString('en-IN')}`}
            </div>
            <p className="text-[11px] text-[#647C95]">Total remaining principal in market</p>
          </div>
          <div className="text-[10px] text-[#647C95] flex justify-between border-t pt-1.5 border-[#D5E9FA]/60">
            <span>Loans: ₹{outstandingLoans.toLocaleString('en-IN')}</span>
            <span>EMI: ₹{outstandingEMI.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Combined Active Borrowers */}
        <div className="glass-card rounded-[24px] p-4 sm:p-5 border border-[#D5E9FA]/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#127C5A] uppercase tracking-wider">
              Active Accounts
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#EAF9F3] flex items-center justify-center text-[#18A879] border border-[#18A879]/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black text-[#183653] tracking-tight tabular-nums">
              {loading ? '...' : combinedBorrowers}
            </div>
            <p className="text-[11px] text-[#647C95]">Live active borrowers on book</p>
          </div>
          <div className="text-[10px] text-[#647C95] flex justify-between border-t pt-1.5 border-[#D5E9FA]/60">
            <span>Loans: {activeBorrowersLoans}</span>
            <span>EMI: {activeBorrowersEMI}</span>
          </div>
        </div>
      </div>

      {/* Side-by-Side Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Module 1: Daily/Weekly/Monthly Loans */}
        <div
          className="glass-card glass-hover rounded-[24px] p-6 border border-[#D5E9FA]/80 flex flex-col justify-between cursor-pointer group"
          onClick={onSwitchToLoans}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#EAF5FF] flex items-center justify-center text-[#0878D1] border border-[#D5E9FA]">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#183653] group-hover:text-[#0878D1] transition">
                    Loans Module (கடன் பிரிவு)
                  </h3>
                  <p className="text-xs text-[#647C95]">Daily Thandal, Weekly & Monthly Flat</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#647C95] group-hover:text-[#0878D1] group-hover:translate-x-1 transition" />
            </div>

            <div className="grid grid-cols-2 gap-3 py-3 border-y border-[#D5E9FA]/60 text-xs">
              <div>
                <span className="text-[#647C95] block text-[11px]">Today's Collections</span>
                <span className="text-base font-black text-[#183653] tabular-nums">
                  ₹{collectedTodayLoans.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[#647C95] block text-[11px]">Active Outstanding</span>
                <span className="text-base font-black text-[#0878D1] tabular-nums">
                  ₹{outstandingLoans.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between text-xs font-bold text-[#0878D1]">
            <span>Manage Daily, Weekly & Monthly Loans</span>
            <span>Open →</span>
          </div>
        </div>

        {/* Module 2: Monthly EMI Suite */}
        <div
          className="glass-card glass-hover rounded-[24px] p-6 border border-[#D5E9FA]/80 flex flex-col justify-between cursor-pointer group"
          onClick={onSwitchToEMI}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#EAF5FF] to-[#D5E9FA] flex items-center justify-center text-[#064B8E] border border-[#D5E9FA]">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#183653] group-hover:text-[#064B8E] transition">
                    EMI Module (மாத தவணை பிரிவு)
                  </h3>
                  <p className="text-xs text-[#647C95]">Reducing Balance & Amortized Installments</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#647C95] group-hover:text-[#064B8E] group-hover:translate-x-1 transition" />
            </div>

            <div className="grid grid-cols-2 gap-3 py-3 border-y border-[#D5E9FA]/60 text-xs">
              <div>
                <span className="text-[#647C95] block text-[11px]">Today's Collections</span>
                <span className="text-base font-black text-[#183653] tabular-nums">
                  ₹{collectedTodayEMI.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[#647C95] block text-[11px]">Active Outstanding</span>
                <span className="text-base font-black text-[#064B8E] tabular-nums">
                  ₹{outstandingEMI.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between text-xs font-bold text-[#064B8E]">
            <span>Manage EMI Portfolio & Receipts</span>
            <span>Open →</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewDashboard;
