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
  CreditCard,
  UserCheck,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';

export const EMICustomers = ({ onOpenNewLoan, onViewCustomerLoans }) => {
  const { isOwner } = useAuth();
  const { lang } = useLanguage();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');

  // Add / Edit Customer Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    tamilName: '',
    phone: '',
    address: '',
    area: '',
    idProofNumber: '',
    guarantorName: '',
    guarantorPhone: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchCustomers = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
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

  useEffect(() => {
    const handleRefresh = () => fetchCustomers(true);
    window.addEventListener('fintrack:emi-updated', handleRefresh);
    return () => window.removeEventListener('fintrack:emi-updated', handleRefresh);
  }, [search, areaFilter]);

  const openAddModal = () => {
    setEditingId(null);
    setFormError('');
    setFormData({
      name: '',
      tamilName: '',
      phone: '',
      address: '',
      area: '',
      idProofNumber: '',
      guarantorName: '',
      guarantorPhone: '',
    });
    setShowModal(true);
  };

  const openEditModal = (c) => {
    setEditingId(c._id);
    setFormError('');
    setFormData({
      name: c.name || '',
      tamilName: c.tamilName || '',
      phone: c.phone || '',
      address: c.address || '',
      area: c.area || '',
      idProofNumber: c.idProofNumber || '',
      guarantorName: c.guarantor?.name || '',
      guarantorPhone: c.guarantor?.phone || '',
    });
    setShowModal(true);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim() || !formData.phone.trim() || !formData.area.trim()) {
      setFormError('Name, Phone, and Area are required / பெயர், தொலைபேசி, பகுதி தேவை');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      tamilName: formData.tamilName.trim(),
      phone: formData.phone.trim(),
      address: formData.address.trim() || formData.area.trim(),
      area: formData.area.trim(),
      idProofNumber: formData.idProofNumber.trim(),
      guarantor: {
        name: formData.guarantorName.trim(),
        phone: formData.guarantorPhone.trim(),
      },
    };

    try {
      setSaving(true);
      if (editingId) {
        await api.updateEMICustomer(editingId, payload);
      } else {
        await api.createEMICustomer(payload);
      }
      setShowModal(false);
      await fetchCustomers(false);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fintrack:emi-updated'));
      }
    } catch (err) {
      setFormError(err.message || 'Failed to save borrower');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustomer = async (c) => {
    if (!isOwner) return;
    if (!window.confirm(`Remove borrower ${c.name}? If they have loans, those loans will also be removed.`)) return;
    try {
      await api.deleteEMICustomer(c._id, true);
      await fetchCustomers(false);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fintrack:emi-updated'));
      }
    } catch (err) {
      alert(err.message || 'Failed to delete borrower');
    }
  };

  const uniqueAreas = Array.from(new Set(customers.map((c) => c.area).filter(Boolean)));

  return (
    <div className="space-y-5 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#EAF5FF] text-[#0878D1] text-xs font-bold border border-[#D5E9FA]">
              {lang === 'ta' ? 'EMI வாடிக்கையாளர்கள்' : 'EMI Borrowers'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#183653] mt-1">
            {lang === 'ta' ? 'மாத தவணை வாடிக்கையாளர் விபரம்' : 'Monthly EMI Borrower Directory'}
          </h2>
          <p className="text-xs text-[#647C95]">
            {lang === 'ta'
              ? 'வாடிக்கையாளர் முகவரி, தொலைபேசி, ஆவணங்கள் மற்றும் தவணை கடன் கணக்குகள்'
              : 'Borrower profile, contact, guarantor details, and linked EMI loan accounts'}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={openAddModal}
            className="h-10 px-4 rounded-xl bg-white/85 hover:bg-[#EAF5FF] border border-[#D5E9FA] text-[#0878D1] font-bold text-xs shadow-xs transition flex items-center space-x-1.5 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{lang === 'ta' ? 'வாடிக்கையாளர் சேர்க்க' : 'Add Borrower'}</span>
          </button>

          {onOpenNewLoan && (
            <button
              type="button"
              onClick={onOpenNewLoan}
              className="h-10 px-4 rounded-xl bg-gradient-to-r from-[#0878D1] to-[#064B8E] hover:from-[#0988ED] hover:to-[#085BAA] font-bold text-xs text-white shadow-md shadow-[#0878D1]/25 transition flex items-center space-x-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>New EMI Loan</span>
            </button>
          )}
        </div>
      </div>

      {/* Search and Area Filter Bar */}
      <div className="glass-card p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#0878D1] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              lang === 'ta'
                ? 'பெயர், தொலைபேசி, ஆதார் எண் கொண்டு தேடுக...'
                : 'Search by borrower name, phone, Aadhaar...'
            }
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-[#F3F9FF] border border-[#D5E9FA] text-xs font-semibold text-[#183653] outline-none focus:border-[#0878D1]"
          />
        </div>

        {uniqueAreas.length > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-[#647C95]">Area:</span>
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="h-10 px-3 rounded-xl bg-[#F3F9FF] border border-[#D5E9FA] text-xs font-bold text-[#183653] outline-none focus:border-[#0878D1]"
            >
              <option value="all">All Areas ({uniqueAreas.length})</option>
              {uniqueAreas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-xs text-[#647C95] font-bold">
            <div className="w-8 h-8 border-3 border-[#0878D1] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading EMI Borrowers...
          </div>
        ) : customers.length === 0 ? (
          <div className="col-span-full py-16 text-center glass-card text-xs text-[#647C95] font-bold">
            <Users className="w-8 h-8 text-[#D5E9FA] mx-auto mb-2" />
            No EMI borrowers found.
          </div>
        ) : (
          customers.map((c) => (
            <div
              key={c._id}
              className="glass-card glass-hover p-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0878D1] to-[#064B8E] text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                      {c.name ? c.name[0].toUpperCase() : 'C'}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-black text-sm text-[#183653] truncate">{c.name}</h4>
                      {c.tamilName && (
                        <p className="text-[11px] text-[#647C95] leading-tight truncate">
                          {c.tamilName}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#18A879] border border-emerald-200 shrink-0">
                    Active
                  </span>
                </div>

                <div className="space-y-1 text-xs text-[#647C95] mt-3 pt-3 border-t border-[#EAF5FF]">
                  <div className="flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#0878D1] shrink-0" />
                    <span className="font-mono text-[#183653]">{c.phone || '-'}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#0878D1] shrink-0" />
                    <span className="truncate">{c.area || 'Coimbatore'}</span>
                  </div>
                  {c.idProofNumber && (
                    <div className="flex items-center space-x-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-[#647C95] shrink-0" />
                      <span className="font-mono text-[11px]">ID: {c.idProofNumber}</span>
                    </div>
                  )}
                  {c.guarantor?.name && (
                    <div className="flex items-center space-x-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-[#647C95] shrink-0" />
                      <span className="text-[11px]">
                        Guarantor: {c.guarantor.name} ({c.guarantor.phone || '-'})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#EAF5FF] flex items-center justify-between gap-2">
                <div className="flex items-center space-x-1.5">
                  <a
                    href={`tel:${c.phone}`}
                    className="p-2 rounded-xl bg-[#F3F9FF] hover:bg-[#EAF5FF] border border-[#D5E9FA] text-[#0878D1] transition"
                    title="Call Customer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      const cleanPhone = (c.phone || '').replace(/\D/g, '');
                      const fullPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
                      window.open(`https://wa.me/${fullPhone}`, '_blank');
                    }}
                    className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#18A879] transition"
                    title="WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(c)}
                    className="p-2 rounded-xl bg-[#EAF5FF] hover:bg-[#D5E9FA] text-[#0878D1] transition"
                    title="Edit Borrower"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomer(c)}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                      title="Delete Borrower"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {onViewCustomerLoans && (
                  <button
                    type="button"
                    onClick={() => onViewCustomerLoans(c)}
                    className="text-xs font-bold text-[#0878D1] hover:text-[#064B8E] flex items-center space-x-1"
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

      {/* Add / Edit EMI Borrower Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#183653]/60 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="max-w-md w-full rounded-3xl p-6 bg-white border border-[#D5E9FA] shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#D5E9FA] pb-3">
              <h3 className="font-black text-sm text-[#183653]">
                {editingId ? 'Edit EMI Borrower / திருத்து' : 'Add EMI Borrower / புதிய வாடிக்கையாளர்'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-[#647C95] hover:text-[#183653]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveCustomer} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-[#183653] mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. R. Balamurugan"
                    className="w-full h-10 px-3 rounded-xl border border-[#D5E9FA] text-xs font-semibold outline-none focus:border-[#0878D1]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#183653] mb-1">Tamil Name</label>
                  <input
                    type="text"
                    value={formData.tamilName}
                    onChange={(e) => setFormData({ ...formData, tamilName: e.target.value })}
                    placeholder="தமிழ் பெயர்"
                    className="w-full h-10 px-3 rounded-xl border border-[#D5E9FA] text-xs outline-none focus:border-[#0878D1]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-[#183653] mb-1">Phone *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="10-digit phone"
                    className="w-full h-10 px-3 rounded-xl border border-[#D5E9FA] text-xs outline-none focus:border-[#0878D1]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#183653] mb-1">Area *</label>
                  <input
                    type="text"
                    required
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    placeholder="e.g. Gandhipuram"
                    className="w-full h-10 px-3 rounded-xl border border-[#D5E9FA] text-xs outline-none focus:border-[#0878D1]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#183653] mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full street address"
                  className="w-full h-10 px-3 rounded-xl border border-[#D5E9FA] text-xs outline-none focus:border-[#0878D1]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-[#183653] mb-1">ID / Aadhaar</label>
                  <input
                    type="text"
                    value={formData.idProofNumber}
                    onChange={(e) => setFormData({ ...formData, idProofNumber: e.target.value })}
                    placeholder="Aadhaar / Voter ID"
                    className="w-full h-10 px-3 rounded-xl border border-[#D5E9FA] text-xs outline-none focus:border-[#0878D1]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#183653] mb-1">Guarantor Name</label>
                  <input
                    type="text"
                    value={formData.guarantorName}
                    onChange={(e) => setFormData({ ...formData, guarantorName: e.target.value })}
                    placeholder="Optional guarantor"
                    className="w-full h-10 px-3 rounded-xl border border-[#D5E9FA] text-xs outline-none focus:border-[#0878D1]"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 h-10 rounded-xl bg-[#F3F9FF] border border-[#D5E9FA] text-xs font-bold text-[#183653]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 h-10 rounded-xl bg-gradient-to-r from-[#0878D1] to-[#064B8E] text-white text-xs font-bold shadow"
                >
                  {saving ? 'Saving...' : 'Save Borrower'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EMICustomers;
