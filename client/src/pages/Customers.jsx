import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useDeviceMode } from '../context/DeviceModeContext';
import { formatCurrency } from '../utils/currency';
import { parseCustomerName } from '../utils/customerName';
import CustomerModal from '../components/common/CustomerModal';
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
} from 'lucide-react';

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

  const fetchCustomers = async () => {
    try {
      setLoading(true);
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
    fetchCustomers();
  }, [selectedArea, search]);

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
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('customers')} / வாடிக்கையாளர் பட்டியல்
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {customers.length} registered borrowers across Tamil Nadu collection circles
          </p>
        </div>

        {isOwner && (
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-sky-primary min-h-[44px] py-2.5 px-4 text-xs font-black shadow-lg shadow-sky-500/25 flex items-center space-x-2"
          >
            <UserPlus className="w-4 h-4 stroke-[3]" />
            <span>{t('addCustomer')}</span>
          </button>
        )}
      </div>

      {/* Search and Area Filter */}
      <div className="glass rounded-2xl p-4 border border-white/70 dark:border-sky-800/40 shadow-md flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-sky-500" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass border border-sky-200/60 dark:border-sky-800/60 text-xs outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>

        <select
          value={selectedArea}
          onChange={(e) => setSelectedArea(e.target.value)}
          className="p-2.5 rounded-xl glass border border-sky-200/60 dark:border-sky-800/60 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-sky-400"
        >
          <option value="all">All Areas / அனைத்து பகுதிகள்</option>
          {areas.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
      </div>

      {/* Customers Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading customer directory...</div>
      ) : customers.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400 glass rounded-2xl">No customers found.</div>
      ) : (
        <div
          className={`grid ${
            isMobile ? 'grid-cols-1 gap-3' : isTablet ? 'grid-cols-2 gap-4' : 'grid-cols-3 gap-4'
          }`}
        >
          {customers.map((c) => {
            const parsed = parseCustomerName(c.name);
            return (
              <div
                key={c._id}
                className="glass glass-hover rounded-3xl p-4 sm:p-5 border border-white/80 dark:border-sky-800/40 shadow-md flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-400 to-sky-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-sky-500/20 border border-white/60 shrink-0">
                        {parsed.primary ? parsed.primary[0].toUpperCase() : 'U'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white leading-tight truncate">
                          {parsed.primary}
                        </h3>
                        {parsed.secondary && (
                          <p className="text-[11px] text-slate-400 truncate leading-none mt-0.5">
                            {parsed.secondary}
                          </p>
                        )}
                        <div className="flex items-center space-x-1 text-xs text-slate-500 mt-0.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                          <span className="truncate">{c.area}</span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border shrink-0 whitespace-nowrap ${
                        c.activeLoanCount > 0
                          ? 'bg-sky-100 text-sky-900 border-sky-300 dark:bg-sky-950/70 dark:text-sky-300'
                          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {c.activeLoanCount || 0} Loans
                    </span>
                  </div>

                  <div className="mt-3 p-3 rounded-2xl bg-sky-50/50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span className="flex items-center space-x-1">
                        <Phone className="w-3 h-3 text-sky-500 shrink-0" />
                        <span className="font-mono">{c.phone}</span>
                      </span>
                      <span className="text-[10px] bg-white/70 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold border border-sky-200/50 shrink-0">
                        {c.idProofType}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 truncate" title={c.address}>
                      {c.address}
                    </p>

                    {c.guarantor?.name && (
                      <div className="pt-1.5 border-t border-sky-200/50 dark:border-sky-800/40 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 shrink-0">Guarantor:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-300 truncate ml-1">
                          {c.guarantor.name} ({c.guarantor.relationship || 'Witness'})
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Outstanding & Actions */}
                <div className="pt-2 border-t border-sky-100 dark:border-sky-900/40 flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block leading-none">
                      Total Due
                    </span>
                    <p className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400 tabular-nums whitespace-nowrap mt-0.5">
                      {formatCurrency(c.totalOutstanding || 0)}
                    </p>
                  </div>

                <div className="flex items-center space-x-1.5">
                  {isOwner && (
                    <>
                      <button
                        onClick={() => setEditingCustomer(c)}
                        className="p-2 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition"
                        title="Edit Customer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDelete(c._id, c.name)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                        title="Delete Customer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => onViewCustomer && onViewCustomer(c._id)}
                    className="btn-sky-secondary py-1.5 px-3 text-xs font-bold shadow-sm flex items-center space-x-1"
                  >
                    <span>View Profile</span>
                    <Eye className="w-3.5 h-3.5 ml-1 text-sky-500" />
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
          onSuccess={() => {
            fetchCustomers();
            setShowAddModal(false);
            setEditingCustomer(null);
          }}
        />
      )}
    </div>
  );
};

export default Customers;
