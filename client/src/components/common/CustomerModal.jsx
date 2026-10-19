import React, { useState } from 'react';
import api from '../../services/api';
import { useDeviceMode } from '../../context/DeviceModeContext';
import { X, UserPlus, Shield } from 'lucide-react';

export const CustomerModal = ({ customer = null, onClose, onSuccess }) => {
  const isEdit = Boolean(customer);
  const { isMobile } = useDeviceMode();

  const [name, setName] = useState(customer?.name || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [area, setArea] = useState(customer?.area || '');
  const [address, setAddress] = useState(customer?.address || '');
  const [idProofType, setIdProofType] = useState(customer?.idProofType || 'Aadhaar');
  const [idProofNumber, setIdProofNumber] = useState(customer?.idProofNumber || '');
  const [photoUrl, setPhotoUrl] = useState(customer?.photoUrl || '');
  const [guarantorName, setGuarantorName] = useState(customer?.guarantor?.name || '');
  const [guarantorPhone, setGuarantorPhone] = useState(customer?.guarantor?.phone || '');
  const [guarantorAddress, setGuarantorAddress] = useState(customer?.guarantor?.address || '');
  const [guarantorRelationship, setGuarantorRelationship] = useState(customer?.guarantor?.relationship || '');
  const [notes, setNotes] = useState(customer?.notes || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const payload = {
      name,
      phone,
      area,
      address,
      idProofType,
      idProofNumber,
      photoUrl,
      guarantor: {
        name: guarantorName,
        phone: guarantorPhone,
        address: guarantorAddress,
        relationship: guarantorRelationship,
      },
      notes,
    };

    try {
      setSubmitting(true);
      let res;
      if (isEdit) {
        res = await api.updateCustomer(customer._id, payload);
      } else {
        res = await api.createCustomer(payload);
      }

      if (onSuccess) {
        onSuccess(res.customer);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save customer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in max-w-[430px] sm:max-w-none mx-auto left-0 right-0">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col">
        {/* Mobile Drag Handle */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-3 sm:hidden" />

        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2 text-sky-600 dark:text-sky-400 font-extrabold text-base sm:text-lg">
            <UserPlus className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">{isEdit ? 'Edit Customer' : 'New Customer / புதிய வாடிக்கையாளர்'}</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Full Name / பெயர் *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. S. Murugesan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-base sm:text-xs outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Phone / அலைபேசி *
              </label>
              <input
                type="tel"
                inputMode="tel"
                required
                placeholder="9842100000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-base sm:text-xs outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Area / பகுதி *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Gandhipuram / RS Puram"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-base sm:text-xs outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                ID Proof Type
              </label>
              <select
                value={idProofType}
                onChange={(e) => setIdProofType(e.target.value)}
                className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-base sm:text-xs outline-none focus:ring-2 focus:ring-sky-400"
              >
                <option value="Aadhaar">Aadhaar Card</option>
                <option value="Voter ID">Voter ID</option>
                <option value="Driving License">Driving License</option>
                <option value="Ration Card">Ration Card</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              ID Proof Number
            </label>
            <input
              type="text"
              placeholder="e.g. 8745 2310 9981"
              value={idProofNumber}
              onChange={(e) => setIdProofNumber(e.target.value)}
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-base sm:text-xs outline-none focus:ring-2 focus:ring-sky-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Residential Address / முகவரி *
            </label>
            <textarea
              rows={2}
              required
              placeholder="Door No, Street Name, Landmark..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-base sm:text-xs outline-none focus:ring-2 focus:ring-sky-400 resize-none"
            />
          </div>

          {/* Guarantor Details Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Shield className="w-4 h-4 text-amber-500" />
              <span>Guarantor / ஜாமீன்தாரர் விவரங்கள்</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  placeholder="Guarantor Name"
                  value={guarantorName}
                  onChange={(e) => setGuarantorName(e.target.value)}
                  className="w-full min-h-[48px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-base sm:text-xs outline-none"
                />
              </div>
              <div>
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="Guarantor Phone"
                  value={guarantorPhone}
                  onChange={(e) => setGuarantorPhone(e.target.value)}
                  className="w-full min-h-[48px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-base sm:text-xs outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="Relationship (e.g. Brother, Neighbor, Employer)"
                  value={guarantorRelationship}
                  onChange={(e) => setGuarantorRelationship(e.target.value)}
                  className="w-full min-h-[48px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-base sm:text-xs outline-none"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Business / Occupation Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Tea stall owner, vegetable merchant"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-base sm:text-xs outline-none"
            />
          </div>

          {/* Sticky footer action button */}
          <div className="sticky bottom-0 pt-3 pb-1 bg-white dark:bg-slate-900">
            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[48px] rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-bold text-sm shadow-xl shadow-sky-500/25 transition active:scale-98 flex items-center justify-center"
            >
              {submitting ? 'Saving Customer...' : isEdit ? 'Update Customer' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerModal;
