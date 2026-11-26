import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import {
  FileSpreadsheet,
  Printer,
  Wallet,
  Banknote,
  QrCode,
  CreditCard,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export const EMIReports = () => {
  const { lang } = useLanguage();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [chartRange, setChartRange] = useState('monthly'); // 'monthly' | 'weekly'

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.getEMIDashboardStats('all');
      if (res.success) {
        setStats(res.stats);
      }
    } catch (e) {
      console.warn('EMI Reports fetch note:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    const handleRefresh = () => fetchReports();
    window.addEventListener('fintrack:emi-updated', handleRefresh);
    return () => window.removeEventListener('fintrack:emi-updated', handleRefresh);
  }, []);

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      await api.exportEMIExcel();
    } catch (e) {
      alert(e.message || 'Excel export failed');
    } finally {
      setExporting(false);
    }
  };

  const handlePrintSummary = () => {
    window.print();
  };

  const chartData =
    chartRange === 'monthly'
      ? stats?.monthlyChart || stats?.weeklyChart || []
      : stats?.weeklyChart || [];

  const modeBreakdown = stats?.modeBreakdown || { cash: 0, upi: 0, cheque: 0 };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#EAF5FF] text-[#0878D1] text-xs font-bold border border-[#D5E9FA]">
              {lang === 'ta' ? 'அறிக்கைகள்' : 'EMI Reports'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#183653] mt-1">
            {lang === 'ta' ? 'மாத தவணை நிதி அறிக்கைகள் & எக்செல்' : 'Monthly EMI Performance & Financial Reports'}
          </h2>
          <p className="text-xs text-[#647C95]">
            {lang === 'ta'
              ? 'முழுமையான நிதி அறிக்கை, மாதாந்திர வசூல் மற்றும் தணிக்கை ஆவணம்'
              : 'Complete portfolio audit, monthly repayment trajectories, and Excel export'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handlePrintSummary}
            className="h-10 px-3.5 rounded-xl bg-white/85 hover:bg-[#EAF5FF] border border-[#D5E9FA] text-xs font-bold text-[#183653] transition flex items-center space-x-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4 text-[#0878D1]" />
            <span>Print Report</span>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting}
            className="h-10 px-4 rounded-xl bg-[#18A879] hover:bg-[#138861] font-bold text-xs text-white shadow-md transition flex items-center space-x-1.5 active:scale-95 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{exporting ? 'Exporting...' : 'Download Excel (.xlsx)'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-card p-4 sm:p-5">
          <span className="text-[10px] font-bold uppercase text-[#647C95]">Total Financed</span>
          <div className="text-xl sm:text-2xl font-black text-[#183653] mt-1 tabular-nums">
            ₹{(stats?.totalPrincipalLent || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-[#647C95] mt-0.5">Active Principal Deployed</p>
        </div>

        <div className="glass-card p-4 sm:p-5">
          <span className="text-[10px] font-bold uppercase text-[#647C95]">Total Repayable</span>
          <div className="text-xl sm:text-2xl font-black text-[#0878D1] mt-1 tabular-nums">
            ₹{(stats?.totalPayable || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-[#647C95] mt-0.5">Principal + Interest</p>
        </div>

        <div className="glass-card p-4 sm:p-5">
          <span className="text-[10px] font-bold uppercase text-[#647C95]">Total Recovered</span>
          <div className="text-xl sm:text-2xl font-black text-[#18A879] mt-1 tabular-nums">
            ₹{(stats?.totalCollected || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-[#647C95] mt-0.5">Collections Realized</p>
        </div>

        <div className="glass-card p-4 sm:p-5">
          <span className="text-[10px] font-bold uppercase text-[#647C95]">Outstanding Balance</span>
          <div className="text-xl sm:text-2xl font-black text-rose-600 mt-1 tabular-nums">
            ₹{(stats?.pendingBalance || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-[#647C95] mt-0.5">Pending Market Credit</p>
        </div>
      </div>

      {/* Mode Breakdown Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-card p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#18A879] border border-emerald-200 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-[#647C95] block">Cash Inflow</span>
              <span className="text-base font-black text-[#183653] tabular-nums">
                ₹{(modeBreakdown.cash || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EAF5FF] text-[#0878D1] border border-[#D5E9FA] flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-[#647C95] block">UPI / GPay</span>
              <span className="text-base font-black text-[#183653] tabular-nums">
                ₹{(modeBreakdown.upi || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#F3F9FF] text-[#064B8E] border border-[#D5E9FA] flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-[#647C95] block">Cheque / Bank</span>
              <span className="text-base font-black text-[#183653] tabular-nums">
                ₹{(modeBreakdown.cheque || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recovery Trajectory Bar Chart */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-black text-sm text-[#183653]">
              {chartRange === 'monthly'
                ? lang === 'ta'
                  ? 'மாதாந்திர தவணை வசூல் போக்கு'
                  : 'Monthly Recovery Trajectory'
                : lang === 'ta'
                ? 'வாராந்திர தவணை வசூல் போக்கு'
                : 'Last 7 Days Recovery'}
            </h3>
            <p className="text-[11px] text-[#647C95]">
              {chartRange === 'monthly' ? 'Last 6 Months Collections History' : 'Daily inflow over the last 7 days'}
            </p>
          </div>

          <div className="flex items-center space-x-1 p-1 rounded-xl bg-[#F3F9FF] border border-[#D5E9FA]">
            <button
              type="button"
              onClick={() => setChartRange('monthly')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                chartRange === 'monthly'
                  ? 'bg-[#0878D1] text-white shadow-xs'
                  : 'text-[#647C95] hover:text-[#183653]'
              }`}
            >
              6 Months
            </button>
            <button
              type="button"
              onClick={() => setChartRange('weekly')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                chartRange === 'weekly'
                  ? 'bg-[#0878D1] text-white shadow-xs'
                  : 'text-[#647C95] hover:text-[#183653]'
              }`}
            >
              7 Days
            </button>
          </div>
        </div>

        <div className="h-64 w-full">
          {loading ? (
            <div className="h-full flex items-center justify-center text-xs text-[#647C95]">
              Loading charts...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#D5E9FA" />
                <XAxis dataKey="day" stroke="#647C95" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#647C95"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
                />
                <Tooltip
                  formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Collected']}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.96)',
                    borderRadius: '14px',
                    border: '1px solid #D5E9FA',
                    fontSize: '12px',
                    color: '#183653',
                  }}
                />
                <Bar dataKey="amount" fill="#0878D1" radius={[8, 8, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default EMIReports;
