import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  TrendingUp,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Printer,
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
  const { isOwner } = useAuth();
  const { lang, t } = useLanguage();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    fetchReports();
  }, []);

  const handleExportExcel = () => {
    const url = `${api.getApiBaseUrl()}/api/emi/export/excel`;
    window.open(url, '_blank');
  };

  const handlePrintSummary = () => {
    window.print();
  };

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
              {lang === 'ta' ? 'அறிக்கைகள்' : 'EMI Reports'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {lang === 'ta' ? 'மாத தவணை நிதி அறிக்கைகள் & எக்செல்' : 'Monthly EMI Performance & Financial Reports'}
          </h2>
          <p className="text-xs text-slate-500">
            {lang === 'ta' ? 'முழுமையான நிதி அறிக்கை, மாதாந்திர வசூல் மற்றும் தணிக்கை ஆவணம்' : 'Complete portfolio audit, monthly repayment trajectories, and Excel export'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrintSummary}
            className="h-10 px-3.5 rounded-xl bg-white/80 hover:bg-white border border-slate-200 text-xs font-bold text-slate-700 transition flex items-center space-x-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Report</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="h-10 px-4 rounded-xl font-bold text-xs text-white shadow-md transition flex items-center space-x-1.5 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            }}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white/85 backdrop-blur-md border border-white/90 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Total Financed</span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            ₹{(stats?.totalPrincipalLent || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Active Principal Deployed</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white/85 backdrop-blur-md border border-white/90 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Total Repayable</span>
          <div className="text-xl sm:text-2xl font-black text-orange-600 mt-1">
            ₹{(stats?.totalPayable || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Principal + Interest</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white/85 backdrop-blur-md border border-white/90 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Total Recovered</span>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-1">
            ₹{(stats?.totalCollected || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Collections Realized</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white/85 backdrop-blur-md border border-white/90 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Outstanding Balance</span>
          <div className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
            ₹{(stats?.pendingBalance || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Pending Market Credit</p>
        </div>
      </div>

      {/* Monthly Recovery Bar Chart */}
      <div className="p-5 rounded-2xl bg-white/85 backdrop-blur-md border border-white/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black text-sm text-slate-900">
              {lang === 'ta' ? 'மாதாந்திர தவணை வசூல் போக்கு' : 'Monthly Recovery Trajectory'}
            </h3>
            <p className="text-[11px] text-slate-500">Last 6 Months Collections History</p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-orange-100 text-orange-800 border border-orange-200">
            6 Months
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats?.weeklyChart || []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `₹${val / 1000}k`} />
              <Tooltip formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Collected']} />
              <Bar dataKey="amount" fill="#F97316" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default EMIReports;

