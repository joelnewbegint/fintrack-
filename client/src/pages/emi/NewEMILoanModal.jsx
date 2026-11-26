import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import {
  X,
  Calculator,
  Calendar,
  User,
  Shield,
  FileText,
  DollarSign,
  ChevronRight,
  Plus,
} from 'lucide-react';

export const NewEMILoanModal = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, isOwner } = useAuth();
  const { lang } = useLanguage();

  const [customers, setCustomers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerArea, setCustomerArea] = useState('');
  const [assignedAgentId, setAssignedAgentId] = useState('');

  // Form Fields
  const [principal, setPrincipal] = useState(50000);
  const [interestRate, setInterestRate] = useState(14); // 14% p.a.
  const [interestType, setInterestType] = useState('reducing'); // 'reducing' | 'flat'
  const [tenureMonths, setTenureMonths] = useState(12);
  const [docCharges, setDocCharges] = useState(500);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Live Calculated Numbers
  const [monthlyEMI, setMonthlyEMI] = useState(0);
  const [totalPayable, setTotalPayable] = useState(0);
  const [totalInterest, setTotalInterest] = useState(0);
  const [schedulePreview, setSchedulePreview] = useState([]);

  // Fetch customers and agents
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        const custRes = await api.getEMICustomers();
        if (custRes.success) setCustomers(custRes.customers || []);

        if (isOwner) {
          const agentRes = await api.getAgentsList();
          if (agentRes.success) {
            const emiAgents = (agentRes.agents || []).filter(a => a.role === 'emi_agent' || a.role === 'agent');
            setAgents(emiAgents);
          }
        }
      } catch (e) {}
    };

    loadData();
  }, [isOpen, isOwner]);

  // Handle Customer Selection
  const handleCustomerSelect = (id) => {
    setSelectedCustomerId(id);
    const c = customers.find(item => item._id === id);
    if (c) {
      setCustomerName(c.name);
      setCustomerPhone(c.phone);
      setCustomerArea(c.area);
    }
  };

  // Live EMI Calculator
  useEffect(() => {
    const p = Number(principal) || 0;
    const r = (Number(interestRate) || 0) / 100;
    const n = Number(tenureMonths) || 1;

    if (p <= 0 || n <= 0) return;

    if (interestType === 'flat') {
      const totInt = Math.round(p * r * (n / 12));
      const totPay = p + totInt;
      const emi = Math.round(totPay / n);
      setMonthlyEMI(emi);
      setTotalInterest(totInt);
      setTotalPayable(totPay);

      // Generate preview schedule
      const sched = [];
      const start = new Date(startDate);
      const monthlyInt = Math.round(totInt / n);
      const monthlyPrin = emi - monthlyInt;
      for (let i = 1; i <= Math.min(n, 6); i++) {
        const d = new Date(start);
        d.setMonth(d.getMonth() + i);
        sched.push({ installmentNo: i, dueDate: d, amount: emi, principal: monthlyPrin, interest: monthlyInt });
      }
      setSchedulePreview(sched);
    } else {
      // Reducing Balance EMI: P * r * (1+r)^n / ((1+r)^n - 1)
      const monthlyR = r / 12;
      if (monthlyR === 0) {
        const emi = Math.round(p / n);
        setMonthlyEMI(emi);
        setTotalInterest(0);
        setTotalPayable(p);
      } else {
        const emi = Math.round((p * monthlyR * Math.pow(1 + monthlyR, n)) / (Math.pow(1 + monthlyR, n) - 1));
        const totPay = emi * n;
        const totInt = totPay - p;
        setMonthlyEMI(emi);
        setTotalInterest(totInt);
        setTotalPayable(totPay);

        const sched = [];
        const start = new Date(startDate);
        let currBal = p;
        for (let i = 1; i <= Math.min(n, 6); i++) {
          const d = new Date(start);
          d.setMonth(d.getMonth() + i);
          const instInt = Math.round(currBal * monthlyR);
          const instPrin = i === n ? currBal : (emi - instInt);
          currBal = Math.max(0, currBal - instPrin);
          sched.push({ installmentNo: i, dueDate: d, amount: emi, principal: instPrin, interest: instInt });
        }
        setSchedulePreview(sched);
      }
    }
  }, [principal, interestRate, interestType, tenureMonths, startDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedCustomerId && !customerName.trim()) {
      setError('Please select or enter borrower name');
      return;
    }

    try {
      setLoading(true);
      const res = await api.createEMILoan({
        customerId: selectedCustomerId || '',
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerArea: customerArea.trim() || 'Main Area',
        assignedAgentId: assignedAgentId || (isOwner ? undefined : user?._id),
        principal: Number(principal),
        interestRatePercent: Number(interestRate),
        interestCalculationType: interestType,
        tenureMonths: Number(tenureMonths),
        documentationCharges: Number(docCharges) || 0,
        startDate,
        notes,
      });

      if (res.success) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('fintrack:emi-updated'));
        }
        if (onSuccess) onSuccess(res.loan);
        if (onClose) onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to sanction EMI loan');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#183653]/60 backdrop-blur-sm overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="max-w-2xl w-full my-auto rounded-3xl p-5 sm:p-7 border border-[#D5E9FA] bg-white/95 backdrop-blur-[24px] relative space-y-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D5E9FA] pb-3.5">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EAF5FF] border border-[#D5E9FA] flex items-center justify-center text-[#0878D1]">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#183653]">
                {lang === 'ta' ? 'புதிய மாத தவணை கடன்' : 'Sanction New Monthly EMI Loan'}
              </h2>
              <p className="text-xs text-[#647C95]">Live reducing/flat rate amortization calculator</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[#EAF5FF] text-[#647C95] hover:text-[#183653] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#183653] mb-1">
                Select Customer / வாடிக்கையாளர்
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => handleCustomerSelect(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-[#D5E9FA] text-xs font-bold bg-white text-[#183653] outline-none focus:border-[#0878D1]"
              >
                <option value="">-- Choose Existing Borrower --</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} ({c.area}) - {c.phone}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#183653] mb-1">
                Or Borrower Name (Manual)
              </label>
              <input
                type="text"
                placeholder="e.g. S. Ramanathan"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-[#D5E9FA] text-xs font-medium bg-white text-[#183653] outline-none focus:border-[#0878D1]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#183653] mb-1">Phone Number</label>
              <input
                type="text"
                placeholder="10-digit mobile"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#D5E9FA] text-xs bg-white outline-none focus:border-[#0878D1]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#183653] mb-1">Area / Location</label>
              <input
                type="text"
                placeholder="e.g. Gandhipuram / Ukkadam"
                value={customerArea}
                onChange={(e) => setCustomerArea(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#D5E9FA] text-xs bg-white outline-none focus:border-[#0878D1]"
              />
            </div>
          </div>

          {/* Principal & Rate */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[#D5E9FA]/70">
            <div>
              <label className="block text-xs font-bold text-[#183653] mb-1">
                Principal (₹)
              </label>
              <input
                type="number"
                step="500"
                min="500"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-[#D5E9FA] text-sm font-black text-[#183653] bg-white outline-none focus:border-[#0878D1]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#183653] mb-1">
                Annual Rate (%)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-[#D5E9FA] text-sm font-black text-[#183653] bg-white outline-none focus:border-[#0878D1]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#183653] mb-1">
                Interest Method
              </label>
              <select
                value={interestType}
                onChange={(e) => setInterestType(e.target.value)}
                className="w-full h-11 px-2.5 rounded-xl border border-[#D5E9FA] text-xs font-bold bg-white text-[#183653] outline-none focus:border-[#0878D1]"
              >
                <option value="reducing">Reducing Balance</option>
                <option value="flat">Flat Interest</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#183653] mb-1">
                Tenure (Months)
              </label>
              <select
                value={tenureMonths}
                onChange={(e) => setTenureMonths(e.target.value)}
                className="w-full h-11 px-2.5 rounded-xl border border-[#D5E9FA] text-xs font-bold bg-white text-[#183653] outline-none focus:border-[#0878D1]"
              >
                <option value="6">6 Months</option>
                <option value="10">10 Months</option>
                <option value="12">12 Months (1 Yr)</option>
                <option value="18">18 Months</option>
                <option value="24">24 Months (2 Yrs)</option>
                <option value="36">36 Months</option>
              </select>
            </div>
          </div>

          {/* Doc Charges, Start Date, Assigned Agent */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#183653] mb-1">
                Documentation Fee (₹)
              </label>
              <input
                type="number"
                value={docCharges}
                onChange={(e) => setDocCharges(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#D5E9FA] text-xs bg-white outline-none focus:border-[#0878D1]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#183653] mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[#D5E9FA] text-xs bg-white outline-none focus:border-[#0878D1]"
              />
            </div>

            {isOwner && (
              <div>
                <label className="block text-xs font-bold text-[#183653] mb-1">Assign EMI Agent</label>
                <select
                  value={assignedAgentId}
                  onChange={(e) => setAssignedAgentId(e.target.value)}
                  className="w-full h-10 px-2.5 rounded-xl border border-[#D5E9FA] text-xs font-bold bg-white outline-none focus:border-[#0878D1]"
                >
                  <option value="">Unassigned (Office)</option>
                  {agents.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Live Loan Calculation Summary Banner */}
          <div className="p-4 rounded-2xl bg-[#EAF5FF] border border-[#D5E9FA] grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="text-[10px] text-[#0878D1] font-bold uppercase block">Monthly EMI</span>
              <span className="text-xl font-black text-[#064B8E] tabular-nums">
                ₹{monthlyEMI.toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#0878D1] font-bold uppercase block">Total Interest</span>
              <span className="text-xl font-black text-[#183653] tabular-nums">
                ₹{totalInterest.toLocaleString('en-IN')}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#0878D1] font-bold uppercase block">Total Payback</span>
              <span className="text-xl font-black text-[#183653] tabular-nums">
                ₹{totalPayable.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* First 6 Months Schedule Preview Table */}
          {schedulePreview.length > 0 && (
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-[#647C95]">
                Schedule Preview (First {schedulePreview.length} Months):
              </span>
              <div className="max-h-32 overflow-y-auto rounded-xl border border-[#D5E9FA] bg-white">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-[#F3F9FF] text-[#183653] font-bold border-b border-[#D5E9FA]">
                    <tr>
                      <th className="py-1.5 px-2.5">Inst.</th>
                      <th className="py-1.5 px-2.5">Due Date</th>
                      <th className="py-1.5 px-2.5">EMI (₹)</th>
                      <th className="py-1.5 px-2.5">Principal</th>
                      <th className="py-1.5 px-2.5">Interest</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedulePreview.map((s) => (
                      <tr key={s.installmentNo} className="border-b border-[#EAF5FF] last:border-0 hover:bg-[#F3F9FF]">
                        <td className="py-1 px-2.5 font-bold">#{s.installmentNo}</td>
                        <td className="py-1 px-2.5">{s.dueDate.toLocaleDateString()}</td>
                        <td className="py-1 px-2.5 font-bold">₹{s.amount}</td>
                        <td className="py-1 px-2.5">₹{s.principal}</td>
                        <td className="py-1 px-2.5 text-[#647C95]">₹{s.interest}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex items-center space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl bg-[#F3F9FF] hover:bg-[#EAF5FF] border border-[#D5E9FA] text-xs font-bold text-[#183653] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-2 w-full h-11 rounded-xl bg-gradient-to-r from-[#0878D1] to-[#064B8E] hover:from-[#0988ED] hover:to-[#085BAA] text-xs font-black text-white shadow-md transition active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Sanctioning EMI...' : 'Confirm & Sanction EMI Loan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewEMILoanModal;

