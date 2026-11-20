import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import {
  Users,
  Search,
  Phone,
  MessageCircle,
  MapPin,
  Plus,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  UserCheck,
} from 'lucide-react';

export const EMICustomers = ({ onOpenNewLoan, onViewCustomerLoans }) => {
  const { isOwner } = useAuth();
  const { lang, t } = useLanguage();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.getEMICustomers({
        search: search.trim() || undefined,
        area: areaFilter === 'all' ? undefined : areaFilter,
      });
      if (res.success) {
        setCustomers(res.customers || []);
      }
    } catch (e) {
      console.warn('EMI Customers fetch note:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, areaFilter]);

  const uniqueAreas = Array.from(new Set(customers.map(c => c.area).filter(Boolean)));

  return (
    <div
      className="space-y-5 pb-12 -mx-2 sm:-mx-4 lg:-mx-6 px-3 sm:px-6 py-4 rounded-3xl"
      style={{
        background: 'linear-gradient(180deg, #FFF8F5 0%, #FFF3EC 60%, #F8FAFD 100%)',
      }}
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-xs font-bold border border-orange-200">
              {lang === 'ta' ? 'EMI வாடிக்கையாளர்கள்' : 'EMI Customers'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {lang === 'ta' ? 'மாத தவணை வாடிக்கையாளர் விபரம்' : 'Monthly EMI Customer Directory'}
          </h2>
          <p className="text-xs text-slate-500">
            {lang === 'ta' ? 'வாடிக்கையாளர் முகவரி, தொலைபேசி, ஆவணங்கள் மற்றும் தவணை கடன் கணக்குகள்' : 'Customer profile, contact, guarantor, and active EMI loan accounts'}
          </p>
        </div>

        {onOpenNewLoan && (
          <button
            onClick={onOpenNewLoan}
            className="h-10 px-4 rounded-xl font-bold text-xs text-white shadow-md transition flex items-center space-x-1.5 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
            }}
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ New EMI Loan</span>
          </button>
        )}
      </div>

      {/* Search and Area Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === 'ta' ? 'பெயர், தொலைபேசி, ஆதார் எண் கொண்டு தேடுக...' : 'Search by borrower name, phone, Aadhaar...'}
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        {uniqueAreas.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-500">Area:</span>
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option value="all">All Areas ({uniqueAreas.length})</option>
              {uniqueAreas.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-xs text-slate-400 font-bold">
            <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading EMI Customers...
          </div>
        ) : customers.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs text-slate-400 font-bold">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No EMI customers found.
          </div>
        ) : (
          customers.map((c) => (
            <div
              key={c._id}
              className="p-4 rounded-2xl bg-white/85 backdrop-blur-md border border-white/95 shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                      {c.name ? c.name[0].toUpperCase() : 'C'}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-black text-sm text-slate-900 truncate">
                        {c.name}
                      </h4>
                      {c.tamilName && (
                        <p className="text-[11px] text-slate-400 leading-tight">
                          {c.tamilName}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    Active
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono">{c.phone || '-'}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{c.area || 'Coimbatore'}</span>
                  </div>
                  {c.idProofNumber && (
                    <div className="flex items-center space-x-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-[11px]">ID: {c.idProofNumber}</span>
                    </div>
                  )}
                  {c.guarantor?.name && (
                    <div className="flex items-center space-x-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-[11px]">Guarantor: {c.guarantor.name} ({c.guarantor.phone || '-'})</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5">
                  <a
                    href={`tel:${c.phone}`}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                    title="Call Customer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => {
                      const cleanPhone = (c.phone || '').replace(/\D/g, '');
                      const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
                      window.open(`https://wa.me/${fullPhone}`, '_blank');
                    }}
                    className="p-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition"
                    title="WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </button>
                </div>

                {onViewCustomerLoans && (
                  <button
                    onClick={() => onViewCustomerLoans(c._id)}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center space-x-1"
                  >
                    <span>View Loans</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EMICustomers;

