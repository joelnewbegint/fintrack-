import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useDeviceMode } from '../context/DeviceModeContext';
import { formatCurrency } from '../utils/currency';
import { parseCustomerName } from '../utils/customerName';
import CustomerModal from '../components/common/CustomerModal';
import { LoanModal } from '../components/common/LoanModal';
import SmartNameInput from '../components/common/SmartNameInput';
import { saveRecentName } from '../utils/nameCorrection';
import {
  UserPlus,
  Search,
  MapPin,
  Phone,
  Shield,
  Eye,
  Edit2,
  Trash2,
  CreditCard,
  User,
  Smartphone,
  Download,
  Banknote,
} from 'lucide-react';
import WhatsAppHubModal from '../components/common/WhatsAppHubModal';
import StatementDownloadModal from '../components/common/StatementDownloadModal';
import { downloadCustomerStatementPDF } from '../utils/schedule';

export const Customers = ({ onViewCustomer }) => {
  const { t, lang } = useLanguage();
  const { isOwner } = useAuth();
  const { isMobile, isTablet, isLaptop } = useDeviceMode();

  const [customers, setCustomers] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState('all');
  const [search, setSearch] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [loanCustomerId, setLoanCustomerId] = useState(null);
  const [whatsappCustomer, setWhatsappCustomer] = useState(null);
  const [statementCustomerData, setStatementCustomerData] = useState(null);
  const [loadingStatementId, setLoadingStatementId] = useState(null);

  const fetchCustomers = async (isBackground = false) => {
    try {
      if (!isBackground && customers.length === 0) {
        setLoading(true);
      }
      const res = await api.getCustomers({
        area: selectedArea,
        search,
      });
      if (res.success) {
        setCustomers(res.customers);
        setAreas(res.areas || []);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(false);
    const handleSyncUpdate = () => {
      // Do not interrupt if user is actively filling out a modal
      if (!showAddModal && !editingCustomer) {
        fetchCustomers(true);
      }
    };
    window.addEventListener('fintrack:data-updated', handleSyncUpdate);
    return () => window.removeEventListener('fintrack:data-updated', handleSyncUpdate);
  }, [selectedArea, search, showAddModal, editingCustomer]);

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete customer ${name}? All active loans must be cleared first.`)) {
      try {
        await api.deleteCustomer(id);
        fetchCustomers();
      } catch (err) {
        alert(err.message || 'Cannot delete customer');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('customers')} / வாடிக்கையாளர் பட்டியல்
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {customers.length} registered borrowers across Tamil Nadu collection circles
          </p>
        </div>

        {isOwner && (
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-sky-primary min-h-[44px] py-2.5 px-4 text-xs font-black shadow-lg shadow-sky-500/25 flex items-center justify-center space-x-2 shrink-0 self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>+ New Customer / புதிய வாடிக்கையாளர்</span>
          </button>
        )}
      </div>

      {/* Search and Area Filter Bar */}
      <div className="bg-white/75 backdrop-blur-[20px] rounded-2xl p-3 sm:p-4 border border-[#D5E9FA] shadow-[0_8px_30px_rgba(8,120,209,0.06)] flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <SmartNameInput
            value={search}
            onChange={setSearch}
            isSearch={true}
            placeholder={t('searchPlaceholder')}
            existingCustomers={customers}
            onSelectCustomer={(cust) => {
              setSearch(cust.name);
              saveRecentName(cust.name);
            }}
            inputClassName="w-full h-11 pl-10 pr-9 rounded-xl bg-white/90 border border-[#D5E9FA] text-xs text-[#183653] placeholder-[#647C95] outline-none focus:ring-2 focus:ring-[#0878D1]/20 focus:border-[#0878D1] transition"
          />
        </div>

        <select
          value={selectedArea}
          onChange={(e) => setSelectedArea(e.target.value)}
          className="h-11 px-3 rounded-xl bg-white/90 border border-[#D5E9FA] text-xs font-bold text-[#183653] outline-none focus:ring-2 focus:ring-[#0878D1]/20 shrink-0 cursor-pointer"
        >
          <option value="all">All Areas / அனைத்து பகுதிகள்</option>
          {areas.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
      </div>

      {/* Customers Cards Grid - Generous, perfectly aligned widths */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[#647C95]">Loading customer directory...</div>
      ) : customers.length === 0 ? (
        <div className="p-12 text-center text-xs text-[#647C95] bg-white/75 backdrop-blur-[20px] border border-[#D5E9FA] rounded-2xl">No customers found.</div>
      ) : (
        <div
          className={`grid ${
            isMobile ? 'grid-cols-1 gap-3.5' : isTablet ? 'grid-cols-2 gap-4' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5'
          } items-stretch`}
        >
          {customers.map((c) => {
            const parsed = parseCustomerName(c.name);
            return (
              <div
                key={c._id}
                className="bg-white/75 backdrop-blur-[20px] hover:bg-white/95 rounded-3xl p-4 sm:p-5 border border-[#D5E9FA] shadow-[0_8px_30px_rgba(8,120,209,0.08)] flex flex-col justify-between space-y-3.5 min-w-0 h-full overflow-hidden transition-all"
              >
                <div>
                  {/* Top Customer Info Row */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#0878D1] to-[#064B8E] text-white font-black text-base flex items-center justify-center shadow-md shadow-[#0878D1]/20 border border-white/60 shrink-0">
                        {parsed.primary ? parsed.primary[0].toUpperCase() : 'U'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-black text-base text-[#183653] leading-tight truncate capitalize">
                          {parsed.primary}
                        </h3>
                        {parsed.secondary && (
                          <p className="text-[11px] text-[#647C95] truncate leading-none mt-0.5">
                            {parsed.secondary}
                          </p>
                        )}
                        <div className="flex items-center space-x-1 text-xs text-[#647C95] mt-0.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-[#0878D1] shrink-0" />
                          <span className="truncate capitalize">{c.area || 'Madhanur'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Loan Pill */}
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold border shrink-0 whitespace-nowrap shadow-xs ${
                        c.activeLoanCount > 0
                          ? 'bg-[#EAF5FF] text-[#0878D1] border-[#D5E9FA]'
                          : (c.totalLoansCount || 0) > 0
                          ? 'bg-[#EAF5FF] text-[#18A879] border-[#D5E9FA]'
                          : 'bg-[#EAF5FF] text-[#647C95] border-[#D5E9FA]'
                      }`}
                    >
                      {c.activeLoanCount > 0
                        ? `${c.activeLoanCount} Active Loan`
                        : (c.totalLoansCount || 0) > 0
                        ? `${c.totalLoansCount} Settled`
                        : '0 Loans'}
                    </span>
                  </div>

                  {/* Info Box: Phone, ID Proof, Address */}
                  <div className="mt-3 p-3 rounded-2xl bg-[#EAF5FF] border border-[#D5E9FA] space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-[#183653]">
                      <a
                        href={`tel:${c.phone}`}
                        className="flex items-center space-x-1.5 font-bold hover:text-[#0878D1] transition"
                      >
                        <Phone className="w-3.5 h-3.5 text-[#0878D1] shrink-0" />
                        <span className="font-mono tracking-tight">{c.phone}</span>
                      </a>
                      {c.idProofType && (
                        <span className="text-[10px] bg-white text-[#183653] px-2 py-0.5 rounded-lg font-bold border border-[#D5E9FA] shrink-0">
                          {c.idProofType}
                        </span>
                      )}
                    </div>

                    <p className="text-[11.5px] text-[#647C95] truncate" title={c.address}>
                      {c.address || 'Tamil Nadu'}
                    </p>

                    {c.guarantor?.name && (
                      <div className="pt-1.5 border-t border-sky-200/50 dark:border-sky-800/40 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 shrink-0">Guarantor:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300 truncate ml-1">
                          {c.guarantor.name} {c.guarantor.relationship ? `(${c.guarantor.relationship})` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Section: Total Due & Clean Action Rows */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
                  {/* Row 1: Total Due on Left, Quick Icon Actions on Right */}
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 uppercase font-black tracking-wide block">
                        Total Due / நிலுவை
                      </span>
                      <p
                        className={`text-base font-black tabular-nums mt-0.5 ${
                          (c.totalOutstanding || 0) > 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {formatCurrency(c.totalOutstanding || 0)}
                      </p>
                    </div>

                    {/* Quick Icon Tools (Statement, WhatsApp, Edit, Delete) */}
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={async () => {
                          try {
                            setLoadingStatementId(c._id);
                            const res = await api.getCustomerById(c._id);
                            if (res.success) {
                              setStatementCustomerData({
                                customer: res.customer || c,
                                loans: res.loans || [],
                                payments: res.payments || [],
                              });
                            }
                          } catch (e) {
                            console.error('Download statement failed:', e);
                          } finally {
                            setLoadingStatementId(null);
                          }
                        }}
                        disabled={loadingStatementId === c._id}
                        className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/80 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/60 flex items-center justify-center transition shadow-xs active:scale-95 disabled:opacity-50"
                        title={lang === 'ta' ? 'கணக்கு அறிக்கை (PDF)' : 'Download Statement (PDF)'}
                      >
                        <Download className={`w-3.5 h-3.5 ${loadingStatementId === c._id ? 'animate-bounce' : ''}`} />
                      </button>

                      <button
                        onClick={() => setWhatsappCustomer(c)}
                        className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 flex items-center justify-center transition shadow-xs active:scale-95"
                        title={lang === 'ta' ? 'வாட்ஸ்அப்' : 'WhatsApp'}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                      </button>

                      {isOwner && (
                        <>
                          <button
                            onClick={() => setEditingCustomer(c)}
                            className="w-8 h-8 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800 border border-transparent hover:border-sky-200 flex items-center justify-center transition"
                            title="Edit Customer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(c._id, c.name)}
                            className="w-8 h-8 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 border border-transparent hover:border-red-200 flex items-center justify-center transition"
                            title="Delete Customer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Two Clean, Full-Width Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {isOwner && (
                      <button
                        onClick={() => setLoanCustomerId(c._id)}
                        className="min-h-[38px] py-1.5 px-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-extrabold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-sky-500/20 active:scale-95 transition"
                        title="Issue Loan to this Customer / கடன் வழங்குக"
                      >
                        <Banknote className="w-3.5 h-3.5 text-white" />
                        <span>+ Issue Loan</span>
                      </button>
                    )}

                    <button
                      onClick={() => onViewCustomer && onViewCustomer(c._id)}
                      className={`${
                        isOwner ? 'col-span-1' : 'col-span-2'
                      } min-h-[38px] py-1.5 px-3 rounded-xl bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-bold text-xs shadow-xs flex items-center justify-center space-x-1.5 active:scale-95 transition`}
                    >
                      <span>View Profile</span>
                      <Eye className="w-3.5 h-3.5 text-sky-500" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Customer Create / Edit Modal */}
      {(showAddModal || editingCustomer) && (
        <CustomerModal
          customer={editingCustomer}
          onClose={() => {
            setShowAddModal(false);
            setEditingCustomer(null);
          }}
          onSuccess={(savedCustomer, opts) => {
            fetchCustomers();
            if (opts?.issueLoan && !opts?.loan && savedCustomer?._id) {
              setLoanCustomerId(savedCustomer._id);
            }
          }}
        />
      )}

      {/* Direct Loan Creation Modal from Customer Page */}
      {loanCustomerId && (
        <LoanModal
          customers={customers}
          initialCustomerId={loanCustomerId}
          onClose={() => setLoanCustomerId(null)}
          onSuccess={(newLoan) => {
            fetchCustomers();
          }}
        />
      )}

      {/* WhatsApp Direct Hub Modal */}
      {whatsappCustomer && (
        <WhatsAppHubModal
          isOpen={!!whatsappCustomer}
          onClose={() => setWhatsappCustomer(null)}
          initialCustomer={whatsappCustomer}
        />
      )}

      {/* 3-Option Statement Download Modal (Active / Settled / Complete) */}
      {statementCustomerData && (
        <StatementDownloadModal
          isOpen={Boolean(statementCustomerData)}
          onClose={() => setStatementCustomerData(null)}
          customer={statementCustomerData.customer}
          loans={statementCustomerData.loans}
          payments={statementCustomerData.payments}
        />
      )}
    </div>
  );
};

export default Customers;
