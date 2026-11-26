import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  calculateProductEMI,
  createInitialCharges,
  formatDDMMYYYY,
  formatINR,
  maskAadhaar,
} from '../../utils/emiCalculator';
import {
  X,
  ShoppingBag,
  User,
  UserCheck,
  Search,
  Pencil,
  Lock,
  Camera,
  Upload,
  Trash2,
  Package,
  Calculator,
  Receipt,
  Calendar,
  FileText,
  Percent,
  Shield,
  ShieldAlert,
  Clock,
  Wallet,
  Plus,
  Minus,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';

const PRODUCT_CATEGORIES = [
  'Mobile & Tablet',
  'TV & Home Audio',
  'Home Appliances',
  'Two-Wheeler',
  'Laptop & Electronics',
  'Furniture',
  'Machinery & Tools',
  'Gold & Jewellery',
  'Other',
];

const CHARGE_ICONS = {
  documentation: FileText,
  processing: Calculator,
  service: Sparkles,
  insurance: Shield,
  stamp: Receipt,
  late_fee: Clock,
  foreclosure: ShieldAlert,
  other: Wallet,
};

const TENURE_CHIPS = [3, 6, 9, 12, 18, 24];
const RATE_CHIPS = [10, 12, 14, 18, 24];
const INTEREST_AMOUNT_CHIPS = [1000, 2000, 4000, 5000];
const CHARGE_QUICK_CHIPS = [0, 250, 500, 1000];

const EMI_LEVELS = [
  { step: 1, title: 'Customer', titleTa: 'வாடிக்கையாளர்' },
  { step: 2, title: 'Product', titleTa: 'பொருள்' },
  { step: 3, title: 'EMI Terms', titleTa: 'விதிமுறைகள்' },
  { step: 4, title: 'Charges', titleTa: 'கட்டணங்கள்' },
  { step: 5, title: 'Breakdown', titleTa: 'கணக்கீடு' },
];

const LEVEL_FIELD_KEYS = {
  1: ['customerName', 'customerPhone', 'customerArea'],
  2: ['productName', 'productPrice', 'financeAmount'],
  3: ['tenure', 'interest'],
  4: ['startDate'],
  5: [],
};

const compressImageFile = (file, maxDim = 720) =>
  new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file selected'));
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject(new Error('Invalid image file'));
      img.src = ev.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });

const normalizePhone = (v = '') => String(v || '').replace(/\D/g, '').slice(0, 10);

export const NewEMILoanModal = ({ isOpen, onClose, onSuccess }) => {
  const { user, isOwner } = useAuth();
  const scrollContainerRef = useRef(null);
  const submittingRef = useRef(false);

  // Reference datasets
  const [customers, setCustomers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [savedProducts, setSavedProducts] = useState([]);

  // Section 1: Customer state
  const [customerMode, setCustomerMode] = useState('new'); // 'new' | 'existing'
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isCustomerLocked, setIsCustomerLocked] = useState(false);
  const [customerEdited, setCustomerEdited] = useState(false);

  const [photoUrl, setPhotoUrl] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [fatherOrSpouseName, setFatherOrSpouseName] = useState('');
  const [doorNo, setDoorNo] = useState('');
  const [street, setStreet] = useState('');
  const [villageTown, setVillageTown] = useState('');
  const [customerArea, setCustomerArea] = useState('');
  const [occupation, setOccupation] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [idProofUrl, setIdProofUrl] = useState('');
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorPhone, setGuarantorPhone] = useState('');
  const [guarantorRelation, setGuarantorRelation] = useState('');

  // Section 2: Product state (ALL fields start EMPTY, no defaults/presets)
  const [productName, setProductName] = useState('');
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [brandModel, setBrandModel] = useState('');
  const [category, setCategory] = useState('');
  const [serialImei, setSerialImei] = useState('');
  const [serialPhotoUrl, setSerialPhotoUrl] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [saveProduct, setSaveProduct] = useState(false);

  // Section 3: EMI Terms
  const [interestMode, setInterestMode] = useState('rate'); // 'rate' | 'amount'
  const [tenureMonths, setTenureMonths] = useState(12);
  const [annualRate, setAnnualRate] = useState('14');
  const [method, setMethod] = useState('reducing'); // 'reducing' | 'flat'
  const [interestAmount, setInterestAmount] = useState('');
  const [interestBasis, setInterestBasis] = useState('total'); // 'total' | 'monthly'

  // Section 4: Manual Charge Cards (all default 0 & OFF)
  const [charges, setCharges] = useState(() => createInitialCharges());
  const [deductionMethod, setDeductionMethod] = useState('collect_separately'); // 'upfront' | 'add_to_finance' | 'collect_separately'
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [assignedAgentId, setAssignedAgentId] = useState('');
  const [notes, setNotes] = useState('');

  // Section 5 & UI state
  const [currentStep, setCurrentStep] = useState(1);
  const [maxUnlockedStep, setMaxUnlockedStep] = useState(1);
  const [showFullSchedule, setShowFullSchedule] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Debounced inputs for smooth live calculation
  const [debouncedParams, setDebouncedParams] = useState(null);

  const goToStep = (nextStep) => {
    setCurrentStep(nextStep);
    setMaxUnlockedStep((prev) => Math.max(prev, nextStep));
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  };

  // Lock body scroll & reset state cleanly on open
  useEffect(() => {
    if (!isOpen) return undefined;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Reset cleanly on open
    submittingRef.current = false;
    setCurrentStep(1);
    setMaxUnlockedStep(1);
    setError('');
    setFieldErrors({});
    setCustomerMode('new');
    setSelectedCustomerId('');
    setCustomerSearch('');
    setShowCustomerDropdown(false);
    setIsCustomerLocked(false);
    setCustomerEdited(false);
    setPhotoUrl('');
    setCustomerName('');
    setCustomerPhone('');
    setAltPhone('');
    setFatherOrSpouseName('');
    setDoorNo('');
    setStreet('');
    setVillageTown('');
    setCustomerArea('');
    setOccupation('');
    setAadhaar('');
    setIdProofUrl('');
    setGuarantorName('');
    setGuarantorPhone('');
    setGuarantorRelation('');

    setProductName('');
    setShowProductSuggestions(false);
    setBrandModel('');
    setCategory('');
    setSerialImei('');
    setSerialPhotoUrl('');
    setProductPrice('');
    setDownPayment('');
    setSaveProduct(false);

    setInterestMode('rate');
    setTenureMonths(12);
    setAnnualRate('14');
    setMethod('reducing');
    setInterestAmount('');
    setInterestBasis('total');

    setCharges(createInitialCharges());
    setDeductionMethod('collect_separately');
    setStartDate(new Date().toISOString().split('T')[0]);
    setAssignedAgentId(!isOwner && user?._id ? user._id : '');
    setNotes('');
    setShowFullSchedule(false);

    const loadReferenceData = async () => {
      try {
        const [custRes, prodRes] = await Promise.all([
          api.getEMICustomers(),
          api.getEMIProducts(),
        ]);
        if (custRes?.success) setCustomers(custRes.customers || []);
        if (prodRes?.success) setSavedProducts(prodRes.products || []);
        if (isOwner) {
          const agentRes = await api.getAgentsList();
          if (agentRes?.success) {
            setAgents((agentRes.agents || []).filter((a) => a.role === 'emi_agent' || a.role === 'agent'));
          }
        }
      } catch (e) {}
    };

    loadReferenceData();

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, isOwner, user?._id]);

  // Debounce EMI recalculations smoothly on input changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedParams({
        productPrice,
        downPayment,
        interestMode,
        annualRate,
        method,
        interestAmount,
        interestBasis,
        tenureMonths,
        charges,
        deductionMethod,
        startDate,
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [
    productPrice,
    downPayment,
    interestMode,
    annualRate,
    method,
    interestAmount,
    interestBasis,
    tenureMonths,
    charges,
    deductionMethod,
    startDate,
  ]);

  const calc = useMemo(() => {
    if (!debouncedParams) {
      return calculateProductEMI({
        productPrice,
        downPayment,
        interestMode,
        annualRate,
        method,
        interestAmount,
        interestBasis,
        tenureMonths,
        charges,
        deductionMethod,
        startDate,
      });
    }
    return calculateProductEMI(debouncedParams);
  }, [
    debouncedParams,
    productPrice,
    downPayment,
    interestMode,
    annualRate,
    method,
    interestAmount,
    interestBasis,
    tenureMonths,
    charges,
    deductionMethod,
    startDate,
  ]);

  // Instant Finance Amount calculation for Section 2 display
  const liveFinanceAmount = Math.max(0, (Number(productPrice) || 0) - (Number(downPayment) || 0));

  // Duplicate phone detection in New mode
  const duplicateCustomerMatch = useMemo(() => {
    if (customerMode !== 'new') return null;
    const cleanPhone = normalizePhone(customerPhone);
    if (cleanPhone.length !== 10) return null;
    return customers.find((c) => normalizePhone(c.phone) === cleanPhone) || null;
  }, [customerMode, customerPhone, customers]);

  const filteredExistingCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers.slice(0, 30);
    return customers
      .filter(
        (c) =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.phone || '').includes(q) ||
          (c.area || '').toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [customers, customerSearch]);

  const productSuggestions = useMemo(() => {
    const q = productName.trim().toLowerCase();
    if (!q || !savedProducts.length) return [];
    return savedProducts
      .filter(
        (p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.brandModel || '').toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [productName, savedProducts]);

  const fillCustomerFromRecord = (cust) => {
    if (!cust) return;
    setSelectedCustomerId(cust._id);
    setCustomerSearch(`${cust.name} (${cust.phone})`);
    setShowCustomerDropdown(false);
    setIsCustomerLocked(true);
    setCustomerEdited(false);

    setPhotoUrl(cust.photoUrl || '');
    setCustomerName(cust.name || '');
    setCustomerPhone(normalizePhone(cust.phone || ''));
    setAltPhone(normalizePhone(cust.altPhone || ''));
    setFatherOrSpouseName(cust.fatherOrSpouseName || '');
    setDoorNo(cust.doorNo || '');
    setStreet(cust.street || '');
    setVillageTown(cust.villageTown || cust.address || '');
    setCustomerArea(cust.area || '');
    setOccupation(cust.occupation || '');
    setAadhaar(cust.idProofNumber ? maskAadhaar(cust.idProofNumber) : '');
    setIdProofUrl(cust.idProofUrl || '');
    setGuarantorName(cust.guarantor?.name || '');
    setGuarantorPhone(normalizePhone(cust.guarantor?.phone || ''));
    setGuarantorRelation(cust.guarantor?.relationship || '');
    setFieldErrors((prev) => ({
      ...prev,
      customerName: '',
      customerPhone: '',
      customerArea: '',
    }));
  };

  const resetCustomerFields = () => {
    setSelectedCustomerId('');
    setCustomerSearch('');
    setIsCustomerLocked(false);
    setCustomerEdited(false);
    setPhotoUrl('');
    setCustomerName('');
    setCustomerPhone('');
    setAltPhone('');
    setFatherOrSpouseName('');
    setDoorNo('');
    setStreet('');
    setVillageTown('');
    setCustomerArea('');
    setOccupation('');
    setAadhaar('');
    setIdProofUrl('');
    setGuarantorName('');
    setGuarantorPhone('');
    setGuarantorRelation('');
  };

  const handleImageUpload = async (file, setter) => {
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file);
      setter(dataUrl);
      if (customerMode === 'existing') setCustomerEdited(true);
    } catch (e) {
      setError('Could not process selected image file.');
    }
  };

  const handleUpdateCharge = (key, updater) => {
    setCharges((prev) =>
      prev.map((c) => {
        if (c.key !== key) return c;
        return { ...c, ...(typeof updater === 'function' ? updater(c) : updater) };
      })
    );
  };

  const handleAddCustomCharge = () => {
    const customKey = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    setCharges((prev) => [
      ...prev,
      {
        key: customKey,
        label: 'Custom Charge',
        labelTa: 'தனி கட்டணம்',
        inputValue: 0,
        chargeType: 'fixed',
        enabled: true,
        isCustom: true,
        isConditionalRate: false,
      },
    ]);
  };

  const handleRemoveCustomCharge = (key) => {
    setCharges((prev) => prev.filter((c) => c.key !== key));
  };

  const getStepErrors = (step) => {
    const errs = {};

    if (step === 1) {
      const digits = normalizePhone(customerPhone);
      if (!customerName.trim()) errs.customerName = 'Customer full name is required / பெயர் தேவை';
      if (digits.length !== 10) errs.customerPhone = 'Valid 10-digit mobile number required / 10 இலக்க எண் தேவை';
      if (!customerArea.trim()) errs.customerArea = 'Area is required / பகுதி தேவை';
    } else if (step === 2) {
      if (!productName.trim()) errs.productName = 'Product name is required / பொருள் பெயர் தேவை';
      const priceNum = Number(productPrice);
      if (!productPrice || Number.isNaN(priceNum) || priceNum <= 0) {
        errs.productPrice = 'Product price must be greater than 0 / பொருள் விலை தேவை';
      } else if (liveFinanceAmount <= 0) {
        errs.financeAmount = 'Finance amount must be greater than ₹0 (reduce down payment)';
      }
    } else if (step === 3) {
      const tNum = Number(tenureMonths);
      if (!tNum || tNum < 1 || tNum > 120) {
        errs.tenure = 'Tenure must be between 1 and 120 months';
      }
      if (interestMode === 'amount') {
        if (interestAmount === '' || Number(interestAmount) < 0 || Number.isNaN(Number(interestAmount))) {
          errs.interest = 'Interest amount must be 0 or greater';
        }
      } else if (annualRate === '' || Number(annualRate) < 0 || Number.isNaN(Number(annualRate))) {
        errs.interest = 'Interest rate must be 0 or greater';
      }
    } else if (step === 4) {
      if (!startDate) {
        errs.startDate = 'Start date is required / தொடக்க தேதி தேவை';
      }
    }

    return errs;
  };

  const validateStep = (step) => {
    const stepErrs = getStepErrors(step);
    const stepKeys = LEVEL_FIELD_KEYS[step] || [];

    setFieldErrors((prev) => {
      const next = { ...prev };
      stepKeys.forEach((k) => {
        delete next[k];
      });
      return { ...next, ...stepErrs };
    });

    const firstMsg = Object.values(stepErrs)[0] || '';
    setError(firstMsg);
    return !firstMsg;
  };

  const validateForm = () => {
    const allErrs = {};
    let firstFailingStep = null;

    for (const level of [1, 2, 3, 4]) {
      const stepErrs = getStepErrors(level);
      if (Object.keys(stepErrs).length > 0 && firstFailingStep === null) {
        firstFailingStep = level;
      }
      Object.assign(allErrs, stepErrs);
    }

    setFieldErrors(allErrs);
    const firstMsg = Object.values(allErrs)[0] || '';
    if (firstMsg) {
      setError(firstMsg);
      if (firstFailingStep !== null) {
        setCurrentStep(firstFailingStep);
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
      }
      return false;
    }
    setError('');
    return true;
  };

  const handleNextStep = () => {
    if (!validateStep(currentStep)) return;
    const nextStep = Math.min(5, currentStep + 1);
    goToStep(nextStep);
  };

  const handlePrevStep = () => {
    if (currentStep <= 1) return;
    setError('');
    goToStep(currentStep - 1);
  };

  const handleStepSelect = (targetStep) => {
    if (targetStep === currentStep || loading) return;
    if (targetStep < currentStep) {
      setError('');
      goToStep(targetStep);
      return;
    }

    // Moving forward: validate intermediate steps cleanly up to targetStep - 1
    for (let s = currentStep; s < targetStep; s += 1) {
      if (!validateStep(s)) {
        if (s !== currentStep) {
          setCurrentStep(s);
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = 0;
          }
        }
        return;
      }
    }
    goToStep(targetStep);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (currentStep < 5) {
      handleNextStep();
      return;
    }
    if (submittingRef.current || loading) return;
    if (!validateForm()) return;

    submittingRef.current = true;
    setLoading(true);
    setError('');

    try {
      const composedAddress = [doorNo, street, villageTown, customerArea]
        .filter((part) => part && String(part).trim())
        .join(', ');

      const payload = {
        customerMode,
        customerId: customerMode === 'existing' ? selectedCustomerId : '',
        customerEdited,
        customer: {
          name: customerName.trim(),
          phone: normalizePhone(customerPhone),
          altPhone: normalizePhone(altPhone),
          fatherOrSpouseName: fatherOrSpouseName.trim(),
          doorNo: doorNo.trim(),
          street: street.trim(),
          villageTown: villageTown.trim(),
          address: composedAddress || customerArea.trim(),
          area: customerArea.trim(),
          occupation: occupation.trim(),
          photoUrl,
          idProofNumber: aadhaar.trim(),
          idProofUrl,
          guarantor: {
            name: guarantorName.trim(),
            phone: normalizePhone(guarantorPhone),
            relationship: guarantorRelation.trim(),
          },
        },
        customerName: customerName.trim(),
        customerPhone: normalizePhone(customerPhone),
        customerArea: customerArea.trim(),
        product: {
          name: productName.trim(),
          brandModel: brandModel.trim(),
          category,
          serialImei: serialImei.trim(),
          serialPhotoUrl,
          price: Number(productPrice) || 0,
          downPayment: Math.max(0, Number(downPayment) || 0),
          financeAmount: liveFinanceAmount,
        },
        saveProduct: Boolean(saveProduct),
        charges: calc.computedCharges,
        totalCharges: calc.totalCharges,
        chargeDeductionMethod: deductionMethod,
        latePenaltyPerDay: calc.latePenaltyPerDay,
        foreclosurePercent: calc.foreclosurePercent,
        interestMode,
        interestAmount: interestMode === 'amount' ? Number(interestAmount) || 0 : 0,
        interestBasis,
        rate: interestMode === 'rate' ? Number(annualRate) || 0 : calc.equivalentFlatRate,
        tenure: Math.max(1, Math.round(Number(tenureMonths) || 1)),
        method: calc.effectiveMethod,
        principal: calc.effectiveFinanceAmount,
        interestRatePercent: interestMode === 'rate' ? Number(annualRate) || 0 : calc.equivalentFlatRate,
        interestCalculationType: calc.effectiveMethod,
        tenureMonths: Math.max(1, Math.round(Number(tenureMonths) || 1)),
        documentationCharges: calc.totalCharges,
        startDate,
        assignedAgentId: assignedAgentId || '',
        notes: notes.trim(),
      };

      const res = await api.createEMILoan(payload);
      if (res?.success) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('fintrack:toast', {
              detail: {
                type: 'saved',
                title: 'EMI loan sanctioned ✅',
                message: `${res.loan?.emiNo || 'New Product EMI'} • ${productName.trim()}`,
              },
            })
          );
          window.dispatchEvent(new CustomEvent('fintrack:emi-updated'));
        }
        if (onSuccess) onSuccess(res.loan);
        if (onClose) onClose();
      } else {
        setError(res?.message || 'Failed to sanction product EMI loan');
      }
    } catch (err) {
      setError(err.message || 'Failed to sanction product EMI loan');
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const displayedSchedule = showFullSchedule ? calc.schedule : calc.schedule.slice(0, 6);
  const priceEntered = Number(productPrice) > 0 && calc.baseFinanceAmount > 0;
  const conditionalChargesNotes = calc.computedCharges.filter((c) => c.enabled && c.isConditionalRate && c.amount > 0);

  const modalNode = (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-[#183653]/60 backdrop-blur-sm"
      style={{ fontFamily: "'Inter', 'Plus Jakarta Sans', 'Noto Sans Tamil', sans-serif" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="New product EMI"
    >
      <div
        className="w-full max-w-[760px] max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-[#D5E9FA] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Modal Header + 5-Level Stepper */}
        <div className="bg-white border-b border-[#D5E9FA] shrink-0">
          <div className="px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0B6FD6] to-[#0A4FA3] text-white flex items-center justify-center shadow-sm shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-extrabold text-[#183653] leading-tight">
                    New product EMI / புதிய பொருள் EMI
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-[#EAF5FF] border border-[#BFE0FB] text-[10px] font-black text-[#0B6FD6] uppercase tracking-wide">
                    Level {currentStep} / 5
                  </span>
                </div>
                <p className="text-xs text-[#647C95]">
                  {EMI_LEVELS[currentStep - 1]?.title} · {EMI_LEVELS[currentStep - 1]?.titleTa}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#F3F9FF] hover:bg-[#EAF5FF] text-[#647C95] hover:text-[#183653] flex items-center justify-center transition"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 5-Level Progress Rail */}
          <div className="px-4 sm:px-5 pb-3 pt-1">
            <div className="h-1.5 w-full rounded-full bg-[#EAF5FF] overflow-hidden mb-2.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#0EA5E9] via-[#0B6FD6] to-[#0A4FA3] transition-all duration-300"
                style={{ width: `${(currentStep / EMI_LEVELS.length) * 100}%` }}
              />
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {EMI_LEVELS.map((lvl) => {
                const isActive = currentStep === lvl.step;
                const isCompleted = lvl.step < currentStep || (lvl.step < maxUnlockedStep && !isActive);
                const isReachable = lvl.step <= maxUnlockedStep || lvl.step === currentStep + 1;

                return (
                  <button
                    key={lvl.step}
                    type="button"
                    onClick={() => handleStepSelect(lvl.step)}
                    className={`group flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2 px-1.5 sm:px-2.5 py-1.5 rounded-xl border text-left transition ${
                      isActive
                        ? 'bg-[#EAF5FF] border-[#0B6FD6] shadow-xs ring-2 ring-[#0EA5E9]/20'
                        : isCompleted
                        ? 'bg-[#F3F9FF] border-[#BFE0FB] hover:border-[#0B6FD6]'
                        : isReachable
                        ? 'bg-white border-[#E2EEF9] hover:border-[#BFE0FB]'
                        : 'bg-[#F9FBFE] border-[#EAF2FA] opacity-80 hover:opacity-100'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full text-[11px] font-black flex items-center justify-center shrink-0 transition ${
                        isActive
                          ? 'bg-gradient-to-br from-[#0B6FD6] to-[#0A4FA3] text-white shadow-xs'
                          : isCompleted
                          ? 'bg-emerald-500 text-white'
                          : 'bg-[#EAF5FF] text-[#647C95]'
                      }`}
                    >
                      {isCompleted ? <Check className="w-3.5 h-3.5" /> : lvl.step}
                    </span>
                    <div className="min-w-0 text-center sm:text-left">
                      <div
                        className={`text-[10px] sm:text-[11px] font-extrabold leading-tight truncate ${
                          isActive ? 'text-[#0A4FA3]' : isCompleted ? 'text-[#183653]' : 'text-[#647C95]'
                        }`}
                      >
                        {lvl.title}
                      </div>
                      <div className="hidden sm:block text-[9px] font-semibold text-[#647C95] leading-tight truncate">
                        {lvl.titleTa}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ONE Internal Scrollable Form Area (renders current level) */}
        <form
          id="new-product-emi-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5 bg-[#F9FBFE]"
          ref={scrollContainerRef}
        >
          {/* ════════════════════════════════════════════════════════════════
              LEVEL 1: CUSTOMER
          ════════════════════════════════════════════════════════════════ */}
          {currentStep === 1 && (
          <section className="rounded-2xl bg-white border border-[#D5E9FA] p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#EAF5FF]">
              <div className="flex items-center space-x-2.5">
                <span className="w-7 h-7 rounded-full bg-[#0B6FD6] text-white text-xs font-black flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-[#183653]">
                    Customer / வாடிக்கையாளர்
                  </h3>
                  <p className="text-[11px] text-[#647C95]">
                    Register new borrower or pick existing / புதியவர் அல்லது ஏற்கனவே உள்ளவர்
                  </p>
                </div>
              </div>

              {/* [New | Existing] Toggle */}
              <div className="inline-flex p-1 rounded-full bg-[#EAF5FF] border border-[#D5E9FA] self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setCustomerMode('new');
                    resetCustomerFields();
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                    customerMode === 'new'
                      ? 'bg-[#0EA5E9] text-white shadow-xs'
                      : 'text-[#647C95] hover:text-[#183653]'
                  }`}
                >
                  New / புதிய
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCustomerMode('existing');
                    setIsCustomerLocked(false);
                    setShowCustomerDropdown(true);
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                    customerMode === 'existing'
                      ? 'bg-[#0EA5E9] text-white shadow-xs'
                      : 'text-[#647C95] hover:text-[#183653]'
                  }`}
                >
                  Existing / பழைய
                </button>
              </div>
            </div>

            {/* Existing Customer Searchable Dropdown */}
            {customerMode === 'existing' && (
              <div className="space-y-2 relative">
                <label className="block text-xs font-bold text-[#183653]">
                  Search Existing Borrower / வாடிக்கையாளரைத் தேடு
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-[#0B6FD6] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={customerSearch}
                      onFocus={() => setShowCustomerDropdown(true)}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      placeholder="Type name, 10-digit phone or area..."
                      className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#D5E9FA] bg-[#F8FBFF] text-xs font-semibold text-[#183653] outline-none focus:border-[#0B6FD6]"
                    />
                  </div>
                  {selectedCustomerId && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isCustomerLocked) {
                          setIsCustomerLocked(false);
                          setCustomerEdited(true);
                          setAadhaar(''); // Avoid saving masked XXXX value
                        } else {
                          setIsCustomerLocked(true);
                        }
                      }}
                      className="h-10 px-3 rounded-xl border border-[#D5E9FA] bg-white hover:bg-[#EAF5FF] text-xs font-bold text-[#0B6FD6] flex items-center space-x-1.5 shrink-0 transition"
                    >
                      {isCustomerLocked ? (
                        <>
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit / திருத்து</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Lock</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {showCustomerDropdown && (
                  <div className="max-h-44 overflow-y-auto rounded-xl border border-[#D5E9FA] bg-white shadow-lg divide-y divide-[#EAF5FF] z-20">
                    {filteredExistingCustomers.length === 0 ? (
                      <div className="p-3 text-xs text-[#647C95] text-center">
                        No matching borrowers found
                      </div>
                    ) : (
                      filteredExistingCustomers.map((c) => (
                        <button
                          key={c._id}
                          type="button"
                          onClick={() => fillCustomerFromRecord(c)}
                          className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between hover:bg-[#EAF5FF] transition ${
                            selectedCustomerId === c._id ? 'bg-[#EAF5FF]' : ''
                          }`}
                        >
                          <div>
                            <div className="font-bold text-[#183653]">{c.name}</div>
                            <div className="text-[11px] text-[#647C95]">
                              {c.phone} · {c.area || 'Main Area'}
                            </div>
                          </div>
                          {selectedCustomerId === c._id && (
                            <Check className="w-4 h-4 text-[#0EA5E9]" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Duplicate Phone Alert */}
            {duplicateCustomerMatch && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="text-xs text-amber-900 font-semibold">
                  Customer already exists (<strong>{duplicateCustomerMatch.name}</strong> · {duplicateCustomerMatch.area}), use existing? / வாடிக்கையாளர் ஏற்கனவே உள்ளார்
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCustomerMode('existing');
                    fillCustomerFromRecord(duplicateCustomerMatch);
                  }}
                  className="px-3 py-1.5 rounded-full bg-[#0EA5E9] hover:bg-[#0B6FD6] text-white text-xs font-bold shrink-0 transition"
                >
                  Use existing / பயன்படுத்து
                </button>
              </div>
            )}

            {/* Photo Row */}
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-[#F3F9FF]/70 border border-[#D5E9FA]">
              <div className="w-14 h-14 rounded-full bg-[#EAF5FF] border-2 border-[#D5E9FA] overflow-hidden flex items-center justify-center shrink-0">
                {photoUrl ? (
                  <img src={photoUrl} alt="Borrower" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-[#0B6FD6]" />
                )}
              </div>
              <div className="flex-1 min-w-[180px]">
                <p className="text-xs font-bold text-[#183653]">
                  Borrower Photo / வாடிக்கையாளர் புகைப்படம்
                </p>
                <p className="text-[11px] text-[#647C95]">Camera or gallery upload (optional)</p>
              </div>
              {!isCustomerLocked && (
                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 rounded-full bg-white border border-[#D5E9FA] hover:bg-[#EAF5FF] text-xs font-bold text-[#0B6FD6] cursor-pointer flex items-center space-x-1">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Camera</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e.target.files?.[0], setPhotoUrl)}
                    />
                  </label>
                  <label className="px-3 py-1.5 rounded-full bg-white border border-[#D5E9FA] hover:bg-[#EAF5FF] text-xs font-bold text-[#183653] cursor-pointer flex items-center space-x-1">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e.target.files?.[0], setPhotoUrl)}
                    />
                  </label>
                  {photoUrl && (
                    <button
                      type="button"
                      onClick={() => setPhotoUrl('')}
                      className="p-1.5 rounded-full text-rose-500 hover:bg-rose-50"
                      title="Remove photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Customer Core Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#183653] mb-1">
                  Full name* / முழுப் பெயர்*
                </label>
                <input
                  type="text"
                  disabled={isCustomerLocked}
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    if (customerMode === 'existing') setCustomerEdited(true);
                  }}
                  placeholder="Enter full name"
                  className={`w-full h-10 px-3 rounded-xl border text-xs font-semibold outline-none transition ${
                    isCustomerLocked ? 'bg-slate-100 text-slate-600' : 'bg-white text-[#183653]'
                  } ${fieldErrors.customerName ? 'border-rose-400' : 'border-[#D5E9FA] focus:border-[#0B6FD6]'}`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#183653] mb-1">
                  Phone (10 digits)* / தொலைபேசி*
                </label>
                <input
                  type="tel"
                  disabled={isCustomerLocked}
                  value={customerPhone}
                  maxLength={10}
                  onChange={(e) => {
                    setCustomerPhone(normalizePhone(e.target.value));
                    if (customerMode === 'existing') setCustomerEdited(true);
                  }}
                  placeholder="9876543210"
                  className={`w-full h-10 px-3 rounded-xl border text-xs font-semibold outline-none transition ${
                    isCustomerLocked ? 'bg-slate-100 text-slate-600' : 'bg-white text-[#183653]'
                  } ${fieldErrors.customerPhone ? 'border-rose-400' : 'border-[#D5E9FA] focus:border-[#0B6FD6]'}`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#183653] mb-1">
                  Alternate phone / மாற்று எண்
                </label>
                <input
                  type="tel"
                  disabled={isCustomerLocked}
                  value={altPhone}
                  maxLength={10}
                  onChange={(e) => {
                    setAltPhone(normalizePhone(e.target.value));
                    if (customerMode === 'existing') setCustomerEdited(true);
                  }}
                  placeholder="Optional alternate phone"
                  className={`w-full h-10 px-3 rounded-xl border border-[#D5E9FA] text-xs outline-none focus:border-[#0B6FD6] ${
                    isCustomerLocked ? 'bg-slate-100 text-slate-600' : 'bg-white text-[#183653]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#183653] mb-1">
                  Father / Spouse name · தந்தை / கணவர்
                </label>
                <input
                  type="text"
                  disabled={isCustomerLocked}
                  value={fatherOrSpouseName}
                  onChange={(e) => {
                    setFatherOrSpouseName(e.target.value);
                    if (customerMode === 'existing') setCustomerEdited(true);
                  }}
                  placeholder="Father or spouse name"
                  className={`w-full h-10 px-3 rounded-xl border border-[#D5E9FA] text-xs outline-none focus:border-[#0B6FD6] ${
                    isCustomerLocked ? 'bg-slate-100 text-slate-600' : 'bg-white text-[#183653]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#183653] mb-1">
                  Area* / பகுதி*
                </label>
                <input
                  type="text"
                  disabled={isCustomerLocked}
                  value={customerArea}
                  onChange={(e) => {
                    setCustomerArea(e.target.value);
                    if (customerMode === 'existing') setCustomerEdited(true);
                  }}
                  placeholder="e.g. Gandhipuram"
                  className={`w-full h-10 px-3 rounded-xl border text-xs font-semibold outline-none ${
                    isCustomerLocked ? 'bg-slate-100 text-slate-600' : 'bg-white text-[#183653]'
                  } ${fieldErrors.customerArea ? 'border-rose-400' : 'border-[#D5E9FA] focus:border-[#0B6FD6]'}`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#183653] mb-1">
                  Occupation / தொழில்
                </label>
                <input
                  type="text"
                  disabled={isCustomerLocked}
                  value={occupation}
                  onChange={(e) => {
                    setOccupation(e.target.value);
                    if (customerMode === 'existing') setCustomerEdited(true);
                  }}
                  placeholder="e.g. Shop owner, driver"
                  className={`w-full h-10 px-3 rounded-xl border border-[#D5E9FA] text-xs outline-none focus:border-[#0B6FD6] ${
                    isCustomerLocked ? 'bg-slate-100 text-slate-600' : 'bg-white text-[#183653]'
                  }`}
                />
              </div>
            </div>

            {/* Address Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#183653] mb-1">
                  Door no / கதவு எண்
                </label>
                <input
                  type="text"
                  disabled={isCustomerLocked}
                  value={doorNo}
                  onChange={(e) => {
                    setDoorNo(e.target.value);
                    if (customerMode === 'existing') setCustomerEdited(true);
                  }}
                  placeholder="e.g. 12A"
                  className={`w-full h-10 px-3 rounded-xl border border-[#D5E9FA] text-xs outline-none focus:border-[#0B6FD6] ${
                    isCustomerLocked ? 'bg-slate-100 text-slate-600' : 'bg-white text-[#183653]'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#183653] mb-1">
                  Street / தெரு
                </label>
                <input
                  type="text"
                  disabled={isCustomerLocked}
                  value={street}
                  onChange={(e) => {
                    setStreet(e.target.value);
                    if (customerMode === 'existing') setCustomerEdited(true);
                  }}
                  placeholder="Street name"
                  className={`w-full h-10 px-3 rounded-xl border border-[#D5E9FA] text-xs outline-none focus:border-[#0B6FD6] ${
                    isCustomerLocked ? 'bg-slate-100 text-slate-600' : 'bg-white text-[#183653]'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#183653] mb-1">
                  Village / Town · ஊர் / நகரம்
                </label>
                <input
                  type="text"
                  disabled={isCustomerLocked}
                  value={villageTown}
                  onChange={(e) => {
                    setVillageTown(e.target.value);
                    if (customerMode === 'existing') setCustomerEdited(true);
                  }}
                  placeholder="Village or town"
                  className={`w-full h-10 px-3 rounded-xl border border-[#D5E9FA] text-xs outline-none focus:border-[#0B6FD6] ${
                    isCustomerLocked ? 'bg-slate-100 text-slate-600' : 'bg-white text-[#183653]'
                  }`}
                />
              </div>
            </div>

            {/* Aadhaar & ID Proof Upload */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#183653] mb-1">
                  Aadhaar (Optional) / ஆதார் எண்
                </label>
                <input
                  type="text"
                  disabled={isCustomerLocked}
                  value={aadhaar}
                  onChange={(e) => {
                    setAadhaar(e.target.value);
                    if (customerMode === 'existing') setCustomerEdited(true);
                  }}
                  placeholder="12-digit Aadhaar (optional)"
                  className={`w-full h-10 px-3 rounded-xl border border-[#D5E9FA] text-xs outline-none focus:border-[#0B6FD6] ${
                    isCustomerLocked ? 'bg-slate-100 text-slate-600 font-mono' : 'bg-white text-[#183653]'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#183653] mb-1">
                  ID proof upload / அடையாள ஆவணம்
                </label>
                <div className="flex items-center gap-2 h-10 px-3 rounded-xl border border-[#D5E9FA] bg-[#F8FBFF]">
                  {!isCustomerLocked && (
                    <label className="text-xs font-bold text-[#0B6FD6] cursor-pointer flex items-center space-x-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{idProofUrl ? 'Change ID image' : 'Upload / Capture ID'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageUpload(e.target.files?.[0], setIdProofUrl)}
                      />
                    </label>
                  )}
                  {idProofUrl ? (
                    <div className="ml-auto flex items-center gap-2">
                      <img src={idProofUrl} alt="ID Proof" className="w-7 h-7 rounded object-cover border border-[#D5E9FA]" />
                      {!isCustomerLocked && (
                        <button type="button" onClick={() => setIdProofUrl('')} className="text-rose-500 text-xs">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="ml-auto text-[11px] text-[#647C95]">No file attached</span>
                  )}
                </div>
              </div>
            </div>

            {/* Guarantor (Optional) */}
            <div className="p-3 rounded-xl bg-[#F8FBFF] border border-[#D5E9FA] space-y-2">
              <span className="text-[11px] font-bold text-[#647C95] uppercase tracking-wider block">
                Guarantor (Optional) / ஜாமீன்தாரர் (விருப்பம்)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  disabled={isCustomerLocked}
                  value={guarantorName}
                  onChange={(e) => {
                    setGuarantorName(e.target.value);
                    if (customerMode === 'existing') setCustomerEdited(true);
                  }}
                  placeholder="Guarantor name / பெயர்"
                  className={`h-9 px-3 rounded-xl border border-[#D5E9FA] text-xs outline-none focus:border-[#0B6FD6] ${
                    isCustomerLocked ? 'bg-slate-100 text-slate-600' : 'bg-white text-[#183653]'
                  }`}
                />
                <input
                  type="tel"
                  disabled={isCustomerLocked}
                  value={guarantorPhone}
                  maxLength={10}
                  onChange={(e) => {
                    setGuarantorPhone(normalizePhone(e.target.value));
                    if (customerMode === 'existing') setCustomerEdited(true);
                  }}
                  placeholder="Guarantor phone / எண்"
                  className={`h-9 px-3 rounded-xl border border-[#D5E9FA] text-xs outline-none focus:border-[#0B6FD6] ${
                    isCustomerLocked ? 'bg-slate-100 text-slate-600' : 'bg-white text-[#183653]'
                  }`}
                />
                <input
                  type="text"
                  disabled={isCustomerLocked}
                  value={guarantorRelation}
                  onChange={(e) => {
                    setGuarantorRelation(e.target.value);
                    if (customerMode === 'existing') setCustomerEdited(true);
                  }}
                  placeholder="Relation / உறவு (e.g. Brother)"
                  className={`h-9 px-3 rounded-xl border border-[#D5E9FA] text-xs outline-none focus:border-[#0B6FD6] ${
                    isCustomerLocked ? 'bg-slate-100 text-slate-600' : 'bg-white text-[#183653]'
                  }`}
                />
              </div>
            </div>
          </section>
          )}

          {/* ════════════════════════════════════════════════════════════════
              LEVEL 2: PRODUCT (Manual only, NO defaults/presets)
          ════════════════════════════════════════════════════════════════ */}
          {currentStep === 2 && (
          <section className="rounded-2xl bg-white border border-[#D5E9FA] p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-[#EAF5FF]">
              <span className="w-7 h-7 rounded-full bg-[#0B6FD6] text-white text-xs font-black flex items-center justify-center shrink-0">
                2
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-[#183653]">
                  Product / பொருள் விவரம்
                </h3>
                <p className="text-[11px] text-[#647C95]">
                  Manual entry for financed item · கடன் வழங்கப்படும் பொருள்
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Product Name + Saved Autocomplete */}
              <div className="relative">
                <label className="block text-xs font-bold text-[#183653] mb-1">
                  Product name* / பொருள் பெயர்*
                </label>
                <input
                  type="text"
                  value={productName}
                  onFocus={() => setShowProductSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowProductSuggestions(false), 180)}
                  onChange={(e) => {
                    setProductName(e.target.value);
                    setShowProductSuggestions(true);
                  }}
                  placeholder="Enter product name"
                  className={`w-full h-10 px-3 rounded-xl border text-xs font-semibold text-[#183653] outline-none ${
                    fieldErrors.productName ? 'border-rose-400' : 'border-[#D5E9FA] focus:border-[#0B6FD6]'
                  }`}
                />
                {showProductSuggestions && productSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 rounded-xl border border-[#D5E9FA] bg-white shadow-lg max-h-40 overflow-y-auto z-30 divide-y divide-[#EAF5FF]">
                    {productSuggestions.map((sp) => (
                      <button
                        key={sp._id || sp.name}
                        type="button"
                        onMouseDown={(ev) => {
                          ev.preventDefault();
                          setProductName(sp.name || '');
                          if (sp.brandModel) setBrandModel(sp.brandModel);
                          if (sp.category) setCategory(sp.category);
                          if (Number(sp.price) > 0) setProductPrice(String(sp.price));
                          setShowProductSuggestions(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-[#EAF5FF] flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-[#183653]">{sp.name}</span>
                          {sp.brandModel && (
                            <span className="text-[#647C95] ml-1.5">· {sp.brandModel}</span>
                          )}
                        </div>
                        {Number(sp.price) > 0 && (
                          <span className="font-bold text-[#0B6FD6] tabular-nums">
                            {formatINR(sp.price)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#183653] mb-1">
                  Brand / Model · பிராண்ட் / மாடல்
                </label>
                <input
                  type="text"
                  value={brandModel}
                  onChange={(e) => setBrandModel(e.target.value)}
                  placeholder="Enter brand & model"
                  className="w-full h-10 px-3 rounded-xl border border-[#D5E9FA] text-xs text-[#183653] outline-none focus:border-[#0B6FD6]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#183653] mb-1">
                  Category / வகை
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#D5E9FA] bg-white text-xs text-[#183653] font-medium outline-none focus:border-[#0B6FD6]"
                >
                  <option value="">Select category / தேர்ந்தெடு</option>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Serial / IMEI + Camera */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#183653] mb-1">
                  Serial / IMEI · சீரியல் / IMEI
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={serialImei}
                    onChange={(e) => setSerialImei(e.target.value)}
                    placeholder="Enter serial number or IMEI"
                    className="flex-1 h-10 px-3 rounded-xl border border-[#D5E9FA] text-xs text-[#183653] font-mono outline-none focus:border-[#0B6FD6]"
                  />
                  <label
                    className="h-10 px-3 rounded-xl border border-[#D5E9FA] bg-[#F3F9FF] hover:bg-[#EAF5FF] text-[#0B6FD6] text-xs font-bold flex items-center space-x-1 cursor-pointer shrink-0"
                    title="Capture or upload serial/product photo"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e.target.files?.[0], setSerialPhotoUrl)}
                    />
                  </label>
                  {serialPhotoUrl && (
                    <div className="relative shrink-0">
                      <img src={serialPhotoUrl} alt="Serial" className="w-10 h-10 rounded-lg object-cover border border-[#D5E9FA]" />
                      <button
                        type="button"
                        onClick={() => setSerialPhotoUrl('')}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px]"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-end pb-1">
                <label className="inline-flex items-center space-x-2 text-xs font-semibold text-[#183653] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={saveProduct}
                    onChange={(e) => setSaveProduct(e.target.checked)}
                    className="w-4 h-4 rounded border-[#D5E9FA] text-[#0B6FD6] focus:ring-[#0EA5E9]"
                  />
                  <span>
                    Save this product to my list for next time / அடுத்த முறைக்காக சேமி
                  </span>
                </label>
              </div>
            </div>

            {/* Price, Down payment, Finance amount */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#183653] mb-1">
                  Product price (₹)* / பொருள் விலை*
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-[#647C95]">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    placeholder="Enter price"
                    className={`w-full h-11 pl-7 pr-3 rounded-xl border text-sm font-black text-[#183653] outline-none tabular-nums ${
                      fieldErrors.productPrice ? 'border-rose-400' : 'border-[#D5E9FA] focus:border-[#0B6FD6]'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#183653] mb-1">
                  Down payment (₹) / முன்பணம்
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-[#647C95]">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={downPayment}
                    onChange={(e) => setDownPayment(e.target.value)}
                    placeholder="0"
                    className="w-full h-11 pl-7 pr-3 rounded-xl border border-[#D5E9FA] text-sm font-bold text-[#183653] outline-none focus:border-[#0B6FD6] tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0A4FA3] mb-1">
                  Finance amount / கடன் தொகை
                </label>
                <div
                  className={`h-11 px-3 rounded-xl border bg-[#EAF5FF] flex items-center justify-between ${
                    fieldErrors.financeAmount ? 'border-rose-400' : 'border-[#0EA5E9]/40'
                  }`}
                >
                  <span className="text-[11px] font-bold text-[#0B6FD6]">Auto</span>
                  <span className="text-base font-black text-[#0A4FA3] tabular-nums">
                    {formatINR(liveFinanceAmount)}
                  </span>
                </div>
              </div>
            </div>
          </section>
          )}

          {/* ════════════════════════════════════════════════════════════════
              LEVEL 3: EMI TERMS
          ════════════════════════════════════════════════════════════════ */}
          {currentStep === 3 && (
          <section className="rounded-2xl bg-white border border-[#D5E9FA] p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#EAF5FF]">
              <div className="flex items-center space-x-2.5">
                <span className="w-7 h-7 rounded-full bg-[#0B6FD6] text-white text-xs font-black flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-[#183653]">
                    EMI terms / தவணை விதிமுறைகள்
                  </h3>
                  <p className="text-[11px] text-[#647C95]">
                    Choose annual rate % or manual interest amount
                  </p>
                </div>
              </div>

              {/* Top Segmented Switch */}
              <div className="inline-flex p-1 rounded-full bg-[#EAF5FF] border border-[#D5E9FA] self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setInterestMode('rate')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                    interestMode === 'rate'
                      ? 'bg-[#0EA5E9] text-white shadow-xs'
                      : 'text-[#647C95] hover:text-[#183653]'
                  }`}
                >
                  Rate % per year
                </button>
                <button
                  type="button"
                  onClick={() => setInterestMode('amount')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                    interestMode === 'amount'
                      ? 'bg-[#0EA5E9] text-white shadow-xs'
                      : 'text-[#647C95] hover:text-[#183653]'
                  }`}
                >
                  Interest amount (type manually)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tenure Card (Both Modes) */}
              <div className="p-4 rounded-2xl bg-[#F8FBFF] border border-[#D5E9FA] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#183653]">
                    Tenure / தவணைக் காலம்
                  </span>
                  <span className="text-[11px] font-bold text-[#647C95]">1 – 120 months</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setTenureMonths((t) => Math.max(1, (Number(t) || 1) - 1))}
                    className="w-10 h-10 rounded-full bg-white border border-[#D5E9FA] hover:bg-[#EAF5FF] text-[#183653] flex items-center justify-center shadow-2xs shrink-0"
                    aria-label="Decrease tenure"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <div className="flex items-baseline justify-center gap-1.5 flex-1">
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={tenureMonths}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') setTenureMonths('');
                        else setTenureMonths(Math.max(1, Math.min(120, Math.round(Number(raw)))));
                      }}
                      className="w-20 h-12 text-center text-2xl font-black text-[#183653] bg-white rounded-xl border border-[#D5E9FA] outline-none focus:border-[#0B6FD6] tabular-nums"
                    />
                    <span className="text-xs font-bold text-[#647C95]">months / மாதம்</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setTenureMonths((t) => Math.min(120, (Number(t) || 1) + 1))}
                    className="w-10 h-10 rounded-full bg-white border border-[#D5E9FA] hover:bg-[#EAF5FF] text-[#183653] flex items-center justify-center shadow-2xs shrink-0"
                    aria-label="Increase tenure"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {TENURE_CHIPS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTenureMonths(m)}
                      className={`px-3 py-1 rounded-full text-xs font-bold border transition ${
                        Number(tenureMonths) === m
                          ? 'bg-[#0EA5E9] text-white border-[#0EA5E9]'
                          : 'bg-white text-[#183653] border-[#D5E9FA] hover:bg-[#EAF5FF]'
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode A: Rate % Card vs Mode B: Interest Amount Card */}
              {interestMode === 'rate' ? (
                <div className="p-4 rounded-2xl bg-[#F8FBFF] border-2 border-[#0B6FD6] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-[#183653]">
                      Interest rate / வட்டி விகிதம்
                    </span>
                    <span className="text-[11px] font-bold text-[#0B6FD6]">% per year</span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={annualRate}
                      onChange={(e) => setAnnualRate(e.target.value)}
                      placeholder="14"
                      className="w-32 h-14 px-3 rounded-xl bg-white border border-[#D5E9FA] text-[30px] leading-none font-black text-[#0A4FA3] outline-none focus:border-[#0B6FD6] tabular-nums"
                    />
                    <span className="text-sm font-bold text-[#647C95]">% per year / ஆண்டுக்கு %</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {RATE_CHIPS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setAnnualRate(String(r))}
                        className={`px-3 py-1 rounded-full text-xs font-bold border transition ${
                          Number(annualRate) === r
                            ? 'bg-[#0EA5E9] text-white border-[#0EA5E9]'
                            : 'bg-white text-[#183653] border-[#D5E9FA] hover:bg-[#EAF5FF]'
                        }`}
                      >
                        {r}%
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#F8FBFF] border-2 border-[#0B6FD6] space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-[#183653]">
                      Interest amount / வட்டி தொகை
                    </span>
                    <div className="inline-flex p-0.5 rounded-full bg-white border border-[#D5E9FA]">
                      <button
                        type="button"
                        onClick={() => setInterestBasis('total')}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition ${
                          interestBasis === 'total' ? 'bg-[#0EA5E9] text-white' : 'text-[#647C95]'
                        }`}
                      >
                        Total / மொத்தம்
                      </button>
                      <button
                        type="button"
                        onClick={() => setInterestBasis('monthly')}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition ${
                          interestBasis === 'monthly' ? 'bg-[#0EA5E9] text-white' : 'text-[#647C95]'
                        }`}
                      >
                        Per month / மாதம்
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-black text-[#0B6FD6]">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={interestAmount}
                      onChange={(e) => setInterestAmount(e.target.value)}
                      placeholder="0"
                      className="w-full h-14 pl-8 pr-3 rounded-xl bg-white border border-[#D5E9FA] text-2xl font-black text-[#0A4FA3] outline-none focus:border-[#0B6FD6] tabular-nums"
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {INTEREST_AMOUNT_CHIPS.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setInterestAmount(String(amt))}
                        className={`px-3 py-1 rounded-full text-xs font-bold border transition ${
                          Number(interestAmount) === amt
                            ? 'bg-[#0EA5E9] text-white border-[#0EA5E9]'
                            : 'bg-white text-[#183653] border-[#D5E9FA] hover:bg-[#EAF5FF]'
                        }`}
                      >
                        {formatINR(amt)}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#EAF5FF] text-xs">
                    <span className="font-semibold text-[#647C95]">
                      Equivalent flat rate / இணையான வட்டி:
                    </span>
                    <span className="font-black text-[#0A4FA3] tabular-nums">
                      {calc.equivalentFlatRate.toFixed(2)}% p.a.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Mode A: Two Selectable Method Cards */}
            {interestMode === 'rate' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    id: 'reducing',
                    title: 'Reducing balance / குறையும் இருப்பு',
                    desc: 'Reducing balance - interest on the remaining balance each month',
                  },
                  {
                    id: 'flat',
                    title: 'Flat rate / நிலையான வட்டி',
                    desc: 'Flat rate - interest on the full finance amount',
                  },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMethod(opt.id)}
                    className={`p-3.5 rounded-xl border-2 text-left transition flex items-start space-x-2.5 ${
                      method === opt.id
                        ? 'border-[#0B6FD6] bg-[#EAF5FF]'
                        : 'border-[#D5E9FA] bg-white hover:bg-[#F8FBFF]'
                    }`}
                  >
                    <span
                      className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        method === opt.id ? 'border-[#0B6FD6] bg-[#0B6FD6]' : 'border-slate-300'
                      }`}
                    >
                      {method === opt.id && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <div>
                      <div className="text-xs font-extrabold text-[#183653]">{opt.title}</div>
                      <div className="text-[11px] text-[#647C95] mt-0.5">{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Summary Pill */}
            <div className="px-3.5 py-2 rounded-full bg-[#EAF5FF] border border-[#D5E9FA] text-xs font-bold text-[#0A4FA3] text-center">
              {interestMode === 'rate'
                ? `${Number(annualRate) || 0}% per year, ${Number(tenureMonths) || 0} months, ${
                    method === 'reducing' ? 'Reducing balance' : 'Flat rate'
                  }`
                : `Fixed interest ${formatINR(calc.totalInterest)} on finance amount ${formatINR(
                    calc.effectiveFinanceAmount
                  )} for ${Number(tenureMonths) || 0} months, equal monthly EMI`}
            </div>
          </section>
          )}

          {/* ════════════════════════════════════════════════════════════════
              LEVEL 4: MANUAL CHARGE CARDS
          ════════════════════════════════════════════════════════════════ */}
          {currentStep === 4 && (
          <section className="rounded-2xl bg-white border border-[#D5E9FA] p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#EAF5FF]">
              <div className="flex items-center space-x-2.5">
                <span className="w-7 h-7 rounded-full bg-[#0B6FD6] text-white text-xs font-black flex items-center justify-center shrink-0">
                  4
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-[#183653]">
                    Charges / கட்டணங்கள்
                  </h3>
                  <p className="text-[11px] text-[#647C95]">
                    All optional — switch ON and enter fees as needed
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddCustomCharge}
                className="px-3 py-1.5 rounded-full border border-[#0B6FD6] bg-[#EAF5FF] hover:bg-[#D5E9FA] text-[#0A4FA3] text-xs font-bold inline-flex items-center space-x-1 self-start sm:self-auto transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add custom charge / தனி கட்டணம்</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {charges.map((c) => {
                const IconComp = CHARGE_ICONS[c.key] || Wallet;
                const computedCard = calc.computedCharges.find((cc) => cc.key === c.key);
                const computedDisplay = computedCard ? computedCard.amount : 0;

                return (
                  <div
                    key={c.key}
                    className={`p-3 rounded-xl border transition space-y-2 ${
                      c.enabled
                        ? 'border-[#0EA5E9] bg-[#F3F9FF]'
                        : 'border-[#D5E9FA] bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            c.enabled ? 'bg-[#0EA5E9] text-white' : 'bg-white text-[#647C95] border border-[#D5E9FA]'
                          }`}
                        >
                          <IconComp className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          {c.isCustom ? (
                            <input
                              type="text"
                              value={c.label}
                              onChange={(e) => handleUpdateCharge(c.key, { label: e.target.value })}
                              placeholder="Custom name"
                              className="w-full text-xs font-bold text-[#183653] bg-white border border-[#D5E9FA] rounded px-1.5 py-0.5 outline-none"
                            />
                          ) : (
                            <>
                              <div className="text-xs font-bold text-[#183653] truncate">{c.label}</div>
                              <div className="text-[10px] text-[#647C95] truncate">{c.labelTa}</div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateCharge(c.key, { enabled: !c.enabled })}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold transition ${
                            c.enabled
                              ? 'bg-[#0EA5E9] text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {c.enabled ? 'ON' : 'OFF'}
                        </button>
                        {c.isCustom && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomCharge(c.key)}
                            className="p-0.5 text-rose-500 hover:text-rose-700"
                            title="Remove custom charge"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Input + Fixed / % toggle */}
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#647C95]">
                          {c.chargeType === 'percent' ? '%' : '₹'}
                        </span>
                        <input
                          type="number"
                          min="0"
                          step={c.chargeType === 'percent' ? '0.1' : '1'}
                          value={c.inputValue === 0 && !c.enabled ? '' : c.inputValue}
                          placeholder="0"
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                            handleUpdateCharge(c.key, {
                              inputValue: val,
                              enabled: val > 0 ? true : c.enabled,
                            });
                          }}
                          className="w-full h-8 pl-6 pr-2 rounded-lg border border-[#D5E9FA] bg-white text-xs font-bold text-[#183653] outline-none focus:border-[#0B6FD6] tabular-nums"
                        />
                      </div>

                      <div className="inline-flex rounded-lg border border-[#D5E9FA] bg-white overflow-hidden shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateCharge(c.key, { chargeType: 'fixed' })}
                          className={`px-2 py-1 text-[10px] font-bold ${
                            c.chargeType === 'fixed' ? 'bg-[#0EA5E9] text-white' : 'text-[#647C95]'
                          }`}
                        >
                          ₹
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateCharge(c.key, { chargeType: 'percent' })}
                          className={`px-2 py-1 text-[10px] font-bold ${
                            c.chargeType === 'percent' ? 'bg-[#0EA5E9] text-white' : 'text-[#647C95]'
                          }`}
                          title="% of finance amount"
                        >
                          %
                        </button>
                      </div>
                    </div>

                    {/* Quick Chips: ₹0, ₹250, ₹500, ₹1000 */}
                    <div className="flex flex-wrap gap-1">
                      {CHARGE_QUICK_CHIPS.map((chipVal) => (
                        <button
                          key={chipVal}
                          type="button"
                          onClick={() =>
                            handleUpdateCharge(c.key, {
                              chargeType: 'fixed',
                              inputValue: chipVal,
                              enabled: chipVal > 0,
                            })
                          }
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition ${
                            c.chargeType === 'fixed' &&
                            Number(c.inputValue) === chipVal &&
                            (chipVal === 0 ? !c.enabled : c.enabled)
                              ? 'bg-[#0EA5E9] text-white border-[#0EA5E9]'
                              : 'bg-white text-[#647C95] border-[#D5E9FA] hover:bg-[#EAF5FF]'
                          }`}
                        >
                          ₹{chipVal}
                        </button>
                      ))}
                    </div>

                    {c.enabled && c.chargeType === 'percent' && !c.isConditionalRate && liveFinanceAmount > 0 && (
                      <div className="text-[10px] font-bold text-[#0B6FD6]">
                        = {formatINR(computedDisplay)} ({c.inputValue}% of finance)
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Live Total Charges Strip */}
            <div className="p-3 rounded-xl bg-[#EAF5FF] border border-[#D5E9FA] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="font-bold text-[#183653]">Total charges / மொத்த கட்டணம்:</span>
                {conditionalChargesNotes.length > 0 && (
                  <span className="ml-2 text-[11px] text-[#647C95]">
                    (Extra terms: {conditionalChargesNotes.map((c) => `${c.label}: ${c.key === 'foreclosure' ? `${c.amount}%` : formatINR(c.amount)}`).join(', ')})
                  </span>
                )}
              </div>
              <span className="text-base font-black text-[#0A4FA3] tabular-nums">
                {formatINR(calc.totalCharges)}
              </span>
            </div>

            {/* Deduction Method, Start Date, Agent */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-[#183653] mb-1">
                  Deduction method / கட்டண வசூல் முறை
                </label>
                <select
                  value={deductionMethod}
                  onChange={(e) => setDeductionMethod(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#D5E9FA] bg-white text-xs font-semibold text-[#183653] outline-none focus:border-[#0B6FD6]"
                >
                  <option value="collect_separately">Collect separately / தனியாக வசூலிக்கவும்</option>
                  <option value="upfront">Upfront deduction / முன்பே கழிக்கவும்</option>
                  <option value="add_to_finance">Add to finance amount / கடன் தொகையில் சேர்</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#183653] mb-1">
                  Start date / தொடக்க தேதி
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-[#D5E9FA] bg-white text-xs font-semibold text-[#183653] outline-none focus:border-[#0B6FD6]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#183653] mb-1">
                  Assign EMI agent / முகவர்
                </label>
                <select
                  value={assignedAgentId}
                  onChange={(e) => setAssignedAgentId(e.target.value)}
                  disabled={!isOwner}
                  className="w-full h-10 px-3 rounded-xl border border-[#D5E9FA] bg-white text-xs font-semibold text-[#183653] outline-none focus:border-[#0B6FD6] disabled:bg-slate-100"
                >
                  <option value="">Unassigned (office)</option>
                  {agents.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>
          )}

          {/* ════════════════════════════════════════════════════════════════
              LEVEL 5: BREAKDOWN & SCHEDULE
          ════════════════════════════════════════════════════════════════ */}
          {currentStep === 5 && (
          <div className="space-y-4">
            {/* Compact quick-jump summary of Levels 1-3 */}
            <div className="rounded-2xl bg-white border border-[#D5E9FA] px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStepSelect(1)}
                  className="px-2.5 py-1 rounded-full bg-[#F3F9FF] hover:bg-[#EAF5FF] border border-[#D5E9FA] font-bold text-[#183653] transition"
                >
                  {customerName.trim() || 'Customer'} ({normalizePhone(customerPhone) || '—'})
                </button>
                <button
                  type="button"
                  onClick={() => handleStepSelect(2)}
                  className="px-2.5 py-1 rounded-full bg-[#F3F9FF] hover:bg-[#EAF5FF] border border-[#D5E9FA] font-bold text-[#183653] transition"
                >
                  {productName.trim() || 'Product'} · {formatINR(Number(productPrice) || 0)}
                </button>
                <button
                  type="button"
                  onClick={() => handleStepSelect(3)}
                  className="px-2.5 py-1 rounded-full bg-[#EAF5FF] hover:bg-[#DCEEFF] border border-[#BFE0FB] font-bold text-[#0A4FA3] transition"
                >
                  {tenureMonths}m ·{' '}
                  {interestMode === 'rate'
                    ? `${annualRate || 0}% (${method === 'reducing' ? 'Reducing' : 'Flat'})`
                    : `Interest ${formatINR(calc.totalInterest)}`}
                </button>
              </div>
              <span className="text-[11px] font-semibold text-[#647C95]">
                Tap pill to edit / மாற்ற தட்டவும்
              </span>
            </div>

          <section className="rounded-2xl bg-white border border-[#D5E9FA] p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-[#EAF5FF]">
              <span className="w-7 h-7 rounded-full bg-[#0B6FD6] text-white text-xs font-black flex items-center justify-center shrink-0">
                5
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-[#183653]">
                  Breakdown / கணக்கீடு &amp; அட்டவணை
                </h3>
                <p className="text-[11px] text-[#647C95]">
                  Live calculation &amp; monthly installment schedule preview
                </p>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-[#EAF5FF] border border-[#D5E9FA]">
                <span className="text-[11px] font-bold text-[#647C95] block">
                  Finance amount / கடன் தொகை
                </span>
                <span className="text-lg font-black text-[#183653] tabular-nums">
                  {priceEntered ? formatINR(calc.effectiveFinanceAmount) : '₹0'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#EAF5FF] border border-[#0EA5E9]/40">
                <span className="text-[11px] font-bold text-[#0B6FD6] block">
                  Monthly EMI / மாத தவணை
                </span>
                <span className="text-lg font-black text-[#0A4FA3] tabular-nums">
                  {priceEntered ? formatINR(calc.monthlyEMI) : '₹0'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8FBFF] border border-[#D5E9FA]">
                <span className="text-[11px] font-bold text-[#647C95] block">
                  Total interest / மொத்த வட்டி
                </span>
                <span className="text-lg font-black text-[#183653] tabular-nums">
                  {priceEntered ? formatINR(calc.totalInterest) : '₹0'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8FBFF] border border-[#D5E9FA]">
                <span className="text-[11px] font-bold text-[#647C95] block">
                  Total payback / மொத்த தொகை
                </span>
                <span className="text-lg font-black text-[#183653] tabular-nums">
                  {priceEntered ? formatINR(calc.totalPayable) : '₹0'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8FBFF] border border-[#D5E9FA]">
                <span className="text-[11px] font-bold text-[#647C95] block">
                  Net charges / நிகர கட்டணம்
                </span>
                <span className="text-lg font-black text-[#183653] tabular-nums">
                  {formatINR(calc.totalCharges)}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8FBFF] border border-[#D5E9FA]">
                <span className="text-[11px] font-bold text-[#647C95] block">
                  Due end date / முடிவு தேதி
                </span>
                <span className="text-lg font-black text-[#183653] tabular-nums">
                  {priceEntered && calc.endDate ? formatDDMMYYYY(calc.endDate) : '-'}
                </span>
              </div>
            </div>

            {!priceEntered ? (
              <div className="p-5 rounded-xl bg-[#F8FBFF] border border-dashed border-[#D5E9FA] text-center text-xs font-semibold text-[#647C95]">
                Enter the product price to see the schedule preview. / அட்டவணையைப் பார்க்க பொருள் விலையை உள்ளிடவும்.
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#183653]">
                    Repayment Schedule ({calc.schedule.length} installments)
                  </span>
                  {deductionMethod === 'upfront' && calc.totalCharges > 0 && (
                    <span className="text-[11px] font-bold text-[#0B6FD6]">
                      Net financed payout after upfront charges: {formatINR(calc.netDisbursed)}
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto rounded-xl border border-[#D5E9FA]">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#EAF5FF] text-[#183653] font-bold border-b border-[#D5E9FA]">
                      <tr>
                        <th className="py-2 px-3">Inst.</th>
                        <th className="py-2 px-3">Due date</th>
                        <th className="py-2 px-3 text-right">EMI</th>
                        <th className="py-2 px-3 text-right">Principal</th>
                        <th className="py-2 px-3 text-right">Interest</th>
                        <th className="py-2 px-3 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAF5FF] bg-white">
                      {displayedSchedule.map((row) => (
                        <tr key={row.installmentNo} className="hover:bg-[#F3F9FF]">
                          <td className="py-2 px-3 font-bold text-[#183653]">#{row.installmentNo}</td>
                          <td className="py-2 px-3 text-[#647C95] font-mono">{row.dueDateLabel}</td>
                          <td className="py-2 px-3 text-right font-black text-[#0A4FA3] tabular-nums">
                            {formatINR(row.amount)}
                          </td>
                          <td className="py-2 px-3 text-right text-[#183653] tabular-nums">
                            {formatINR(row.principalPart)}
                          </td>
                          <td className="py-2 px-3 text-right text-[#647C95] tabular-nums">
                            {formatINR(row.interestPart)}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-[#183653] tabular-nums">
                            {formatINR(row.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {calc.schedule.length > 6 && (
                  <button
                    type="button"
                    onClick={() => setShowFullSchedule((prev) => !prev)}
                    className="w-full py-2 rounded-xl border border-[#D5E9FA] bg-[#F8FBFF] hover:bg-[#EAF5FF] text-xs font-bold text-[#0B6FD6] flex items-center justify-center space-x-1 transition"
                  >
                    {showFullSchedule ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        <span>Show first 6 installments</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        <span>
                          View full schedule ({calc.schedule.length} installments) / முழு அட்டவணை
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Notes (optional) */}
            <div>
              <label className="block text-xs font-bold text-[#183653] mb-1">
                Notes (Optional) / குறிப்புகள்
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any remarks, shop invoice no, or delivery notes..."
                className="w-full h-10 px-3 rounded-xl border border-[#D5E9FA] text-xs text-[#183653] outline-none focus:border-[#0B6FD6]"
              />
            </div>
          </section>
          </div>
          )}
        </form>

        {/* Sticky Modal Footer */}
        <div className="px-4 sm:px-6 py-3.5 bg-white border-t border-[#D5E9FA] space-y-2.5 shrink-0">
          {error && (
            <div className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="h-11 px-4 rounded-xl bg-[#F3F9FF] hover:bg-[#EAF5FF] border border-[#D5E9FA] text-xs font-bold text-[#183653] transition disabled:opacity-50"
              >
                Cancel / ரத்து
              </button>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={loading}
                  className="h-11 px-4 rounded-xl bg-white hover:bg-[#F3F9FF] border border-[#BFE0FB] text-xs font-bold text-[#0A4FA3] flex items-center gap-1 transition disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous / முந்தைய</span>
                </button>
              )}
            </div>

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="h-11 px-5 sm:px-6 rounded-xl bg-gradient-to-r from-[#0B6FD6] to-[#0A4FA3] hover:brightness-105 text-xs sm:text-sm font-extrabold text-white shadow-md flex items-center justify-center gap-1.5 transition active:scale-[0.99]"
              >
                <span>
                  Next: {EMI_LEVELS[currentStep]?.title} / அடுத்து
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                form="new-product-emi-form"
                disabled={loading}
                className="h-11 px-5 sm:px-6 rounded-xl bg-gradient-to-r from-[#0B6FD6] to-[#0A4FA3] hover:brightness-105 text-xs sm:text-sm font-extrabold text-white shadow-md flex items-center justify-center space-x-2 transition active:scale-[0.99] disabled:opacity-60"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>
                  {loading
                    ? 'Saving & sanctioning...'
                    : 'Save customer and sanction EMI / சேமித்து கடன் வழங்குக'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
};

export default NewEMILoanModal;
