import * as XLSX from 'xlsx';
import { calculateProductEMI, createInitialCharges } from './emiCalculator.js';

export const EMI_CSV_COLUMNS = [
  { key: 'customerName', required: true, sample1: 'Rajesh Kumar', sample2: 'Priya Sundar', description: 'Customer full name' },
  { key: 'customerPhone', required: true, sample1: '9876543210', sample2: '9842112345', description: '10-digit mobile number' },
  { key: 'customerArea', required: true, sample1: 'Gandhipuram', sample2: 'RS Puram', description: 'Area / locality' },
  { key: 'productName', required: true, sample1: 'iPhone 15 128GB', sample2: 'Honda Activa 6G', description: 'Product name' },
  { key: 'brandModel', required: false, sample1: 'Apple A3090', sample2: 'Honda DLX', description: 'Brand & model' },
  { key: 'category', required: false, sample1: 'Mobile & Tablet', sample2: 'Two-Wheeler', description: 'Product category' },
  { key: 'productPrice', required: true, sample1: '65000', sample2: '92000', description: 'Total price in INR' },
  { key: 'downPayment', required: false, sample1: '15000', sample2: '22000', description: 'Down payment in INR (default 0)' },
  { key: 'interestMode', required: false, sample1: 'rate', sample2: 'amount', description: 'rate or amount' },
  { key: 'rate', required: false, sample1: '14', sample2: '0', description: 'Annual rate % (if interestMode=rate)' },
  { key: 'method', required: false, sample1: 'reducing', sample2: 'flat', description: 'reducing or flat' },
  { key: 'interestAmount', required: false, sample1: '0', sample2: '10500', description: 'Fixed interest INR (if interestMode=amount)' },
  { key: 'interestBasis', required: false, sample1: 'total', sample2: 'total', description: 'total or monthly (if interestMode=amount)' },
  { key: 'tenureMonths', required: true, sample1: '12', sample2: '18', description: 'Tenure in months (1-120)' },
  { key: 'startDate', required: true, sample1: '2026-11-26', sample2: '2026-09-15', description: 'YYYY-MM-DD or DD/MM/YYYY' },
  { key: 'paidInstallments', required: false, sample1: '0', sample2: '2', description: 'Already paid EMIs count (0 for new loan)' },
  { key: 'paidPaymentMode', required: false, sample1: 'cash', sample2: 'upi', description: 'cash, upi, or cheque' },
  { key: 'serialImei', required: false, sample1: '358912098765432', sample2: 'ME4JF502MP81234', description: 'Serial / IMEI / Frame no' },
  { key: 'documentationFee', required: false, sample1: '500', sample2: '0', description: 'Documentation charge INR' },
  { key: 'processingFee', required: false, sample1: '0', sample2: '1000', description: 'Processing fee INR' },
  { key: 'insuranceFee', required: false, sample1: '0', sample2: '1500', description: 'Insurance fee INR' },
  { key: 'chargeDeductionMethod', required: false, sample1: 'collect_separately', sample2: 'add_to_finance', description: 'collect_separately, upfront, or add_to_finance' },
  { key: 'latePenaltyPerDay', required: false, sample1: '50', sample2: '100', description: 'Late fee per day INR' },
  { key: 'foreclosurePercent', required: false, sample1: '3', sample2: '2', description: 'Foreclosure penalty %' },
  { key: 'altPhone', required: false, sample1: '9842200011', sample2: '', description: 'Alternate 10-digit phone' },
  { key: 'fatherOrSpouseName', required: false, sample1: 'Kumarasamy', sample2: 'Sundaram', description: 'Father or spouse name' },
  { key: 'address', required: false, sample1: '12A Cross Cut Road', sample2: '44 DB Road', description: 'Door no / Street / Town' },
  { key: 'occupation', required: false, sample1: 'Shop Owner', sample2: 'Accountant', description: 'Occupation' },
  { key: 'aadhaar', required: false, sample1: '', sample2: '', description: '12-digit Aadhaar (optional)' },
  { key: 'guarantorName', required: false, sample1: 'Suresh', sample2: 'Karthik', description: 'Guarantor name (optional)' },
  { key: 'guarantorPhone', required: false, sample1: '9894011223', sample2: '', description: 'Guarantor 10-digit phone' },
  { key: 'guarantorRelation', required: false, sample1: 'Brother', sample2: 'Spouse', description: 'Guarantor relation' },
  { key: 'notes', required: false, sample1: 'Sample new mobile EMI', sample2: 'Sample existing EMI with 2 pre-paid months', description: 'Invoice no or remarks' },
];

const escapeCsvCell = (value) => {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Generates an Excel-friendly UTF-8 BOM CSV template matching all Product EMI fields.
 */
export const buildEMICsvTemplateContent = () => {
  const headers = EMI_CSV_COLUMNS.map((c) => escapeCsvCell(c.key)).join(',');
  const row1 = EMI_CSV_COLUMNS.map((c) => escapeCsvCell(c.sample1)).join(',');
  const row2 = EMI_CSV_COLUMNS.map((c) => escapeCsvCell(c.sample2)).join(',');
  return `\uFEFF${headers}\n${row1}\n${row2}\n`;
};

export const downloadEMICsvTemplate = () => {
  const csv = buildEMICsvTemplateContent();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'VK_Bankers_EMI_Import_Template.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

const normalizeKey = (raw = '') =>
  String(raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const HEADER_ALIASES = {
  customername: 'customerName',
  name: 'customerName',
  borrowername: 'customerName',
  customerphone: 'customerPhone',
  phone: 'customerPhone',
  mobile: 'customerPhone',
  phonenumber: 'customerPhone',
  customerarea: 'customerArea',
  area: 'customerArea',
  location: 'customerArea',
  productname: 'productName',
  product: 'productName',
  item: 'productName',
  brandmodel: 'brandModel',
  brand: 'brandModel',
  model: 'brandModel',
  category: 'category',
  productprice: 'productPrice',
  price: 'productPrice',
  downpayment: 'downPayment',
  advance: 'downPayment',
  interestmode: 'interestMode',
  rate: 'rate',
  interestrate: 'rate',
  interestratepercent: 'rate',
  method: 'method',
  interestcalculationtype: 'method',
  interestamount: 'interestAmount',
  interestbasis: 'interestBasis',
  tenuremonths: 'tenureMonths',
  tenure: 'tenureMonths',
  months: 'tenureMonths',
  startdate: 'startDate',
  date: 'startDate',
  paidinstallments: 'paidInstallments',
  paidemis: 'paidInstallments',
  paidcount: 'paidInstallments',
  paidpaymentmode: 'paidPaymentMode',
  paymentmode: 'paidPaymentMode',
  serialimei: 'serialImei',
  imei: 'serialImei',
  serialno: 'serialImei',
  documentationfee: 'documentationFee',
  docfee: 'documentationFee',
  processingfee: 'processingFee',
  insurancefee: 'insuranceFee',
  chargedeductionmethod: 'chargeDeductionMethod',
  deductionmethod: 'chargeDeductionMethod',
  latepenaltyperday: 'latePenaltyPerDay',
  latefee: 'latePenaltyPerDay',
  foreclosurepercent: 'foreclosurePercent',
  altphone: 'altPhone',
  alternatephone: 'altPhone',
  fatherorspousename: 'fatherOrSpouseName',
  fathername: 'fatherOrSpouseName',
  spousename: 'fatherOrSpouseName',
  address: 'address',
  occupation: 'occupation',
  aadhaar: 'aadhaar',
  idproofnumber: 'aadhaar',
  guarantorname: 'guarantorName',
  guarantorphone: 'guarantorPhone',
  guarantorrelation: 'guarantorRelation',
  notes: 'notes',
  remarks: 'notes',
};

const normalizePhoneDigits = (raw) => {
  if (raw === null || raw === undefined || raw === '') return '';
  let digits = String(raw).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
};

const toNum = (raw, fallback = 0) => {
  if (raw === null || raw === undefined || raw === '') return fallback;
  const cleaned = String(raw).replace(/[₹,\s]/g, '');
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? NaN : parsed;
};

const parseFlexibleDate = (raw) => {
  if (!raw) return '';
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    const yyyy = raw.getFullYear();
    const mm = String(raw.getMonth() + 1).padStart(2, '0');
    const dd = String(raw.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
  }

  const str = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const first = Number(dmy[1]);
    const second = Number(dmy[2]);
    const year = Number(dmy[3]);
    // Assume Indian DD/MM/YYYY unless second > 12 (then MM/DD/YYYY)
    const day = second > 12 ? second : first;
    const month = second > 12 ? first : second;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const fallback = new Date(str);
  if (!Number.isNaN(fallback.getTime())) {
    const yyyy = fallback.getFullYear();
    const mm = String(fallback.getMonth() + 1).padStart(2, '0');
    const dd = String(fallback.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return '';
};

/**
 * Parses an uploaded .csv / .xlsx / .xls file into validated Product EMI loan payloads.
 */
export const parseEMIImportFile = async (file, existingLoans = []) => {
  if (!file) throw new Error('Please choose a CSV or Excel file');

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('The uploaded file contains no readable sheets');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    throw new Error('No data rows found under the header row');
  }

  const existingSignatures = new Set(
    (existingLoans || []).map((l) => {
      const phone = normalizePhoneDigits(l.customerPhone);
      const prod = String(l.product?.name || '').trim().toLowerCase();
      const sDate = l.startDate ? new Date(l.startDate).toISOString().slice(0, 10) : '';
      return `${phone}|${prod}|${sDate}`;
    })
  );

  return rawRows.map((rawRow, idx) => {
    const mapped = {};
    Object.entries(rawRow).forEach(([header, val]) => {
      const canonical = HEADER_ALIASES[normalizeKey(header)];
      if (canonical && mapped[canonical] === undefined) {
        mapped[canonical] = val;
      }
    });

    const errors = [];
    const customerName = String(mapped.customerName || '').trim();
    const customerPhone = normalizePhoneDigits(mapped.customerPhone);
    const customerArea = String(mapped.customerArea || '').trim();
    const productName = String(mapped.productName || '').trim();
    const brandModel = String(mapped.brandModel || '').trim();
    const category = String(mapped.category || '').trim();
    const serialImei = String(mapped.serialImei || '').trim();

    const productPrice = toNum(mapped.productPrice, NaN);
    const downPayment = Math.max(0, toNum(mapped.downPayment, 0) || 0);
    const financeAmount = Number.isFinite(productPrice) ? Math.max(0, productPrice - downPayment) : 0;

    const rawInterestMode = String(mapped.interestMode || 'rate').trim().toLowerCase();
    const interestMode = rawInterestMode === 'amount' ? 'amount' : 'rate';

    const rawMethod = String(mapped.method || 'reducing').trim().toLowerCase();
    const method = rawMethod === 'flat' ? 'flat' : 'reducing';

    const rate = toNum(mapped.rate, 0);
    const interestAmount = toNum(mapped.interestAmount, 0);
    const rawBasis = String(mapped.interestBasis || 'total').trim().toLowerCase();
    const interestBasis = rawBasis === 'monthly' ? 'monthly' : 'total';

    const tenureMonths = Math.round(toNum(mapped.tenureMonths, NaN));
    const parsedStartDate = parseFlexibleDate(mapped.startDate);
    const startDate = parsedStartDate || new Date().toISOString().slice(0, 10);

    const paidInstallments = Math.max(0, Math.round(toNum(mapped.paidInstallments, 0) || 0));
    const rawPayMode = String(mapped.paidPaymentMode || 'cash').trim().toLowerCase();
    const paidPaymentMode = ['cash', 'upi', 'cheque'].includes(rawPayMode) ? rawPayMode : 'cash';

    const documentationFee = Math.max(0, toNum(mapped.documentationFee, 0) || 0);
    const processingFee = Math.max(0, toNum(mapped.processingFee, 0) || 0);
    const insuranceFee = Math.max(0, toNum(mapped.insuranceFee, 0) || 0);
    const latePenaltyPerDay = Math.max(0, toNum(mapped.latePenaltyPerDay, 0) || 0);
    const foreclosurePercent = Math.max(0, toNum(mapped.foreclosurePercent, 0) || 0);

    const rawDeduct = String(mapped.chargeDeductionMethod || 'collect_separately').trim().toLowerCase();
    const chargeDeductionMethod = ['collect_separately', 'upfront', 'add_to_finance'].includes(rawDeduct)
      ? rawDeduct
      : 'collect_separately';

    if (!customerName) errors.push('customerName required');
    if (customerPhone.length !== 10) errors.push('10-digit customerPhone required');
    if (!customerArea) errors.push('customerArea required');
    if (!productName) errors.push('productName required');
    if (!Number.isFinite(productPrice) || productPrice <= 0) errors.push('productPrice > 0 required');
    else if (financeAmount <= 0) errors.push('Finance amount (price - downPayment) must be > 0');
    if (!Number.isFinite(tenureMonths) || tenureMonths < 1 || tenureMonths > 120) errors.push('tenureMonths must be 1-120');
    if (!parsedStartDate) errors.push('Valid startDate (YYYY-MM-DD or DD/MM/YYYY) required');
    if (interestMode === 'rate' && (!Number.isFinite(rate) || rate < 0)) errors.push('Valid rate >= 0 required');
    if (interestMode === 'amount' && (!Number.isFinite(interestAmount) || interestAmount < 0)) errors.push('Valid interestAmount >= 0 required');
    if (Number.isFinite(tenureMonths) && paidInstallments > tenureMonths) {
      errors.push('paidInstallments exceeds tenureMonths');
    }

    const charges = createInitialCharges().map((card) => {
      if (card.key === 'documentation' && documentationFee > 0) {
        return { ...card, inputValue: documentationFee, enabled: true };
      }
      if (card.key === 'processing' && processingFee > 0) {
        return { ...card, inputValue: processingFee, enabled: true };
      }
      if (card.key === 'insurance' && insuranceFee > 0) {
        return { ...card, inputValue: insuranceFee, enabled: true };
      }
      if (card.key === 'late_fee' && latePenaltyPerDay > 0) {
        return { ...card, inputValue: latePenaltyPerDay, enabled: true };
      }
      if (card.key === 'foreclosure' && foreclosurePercent > 0) {
        return { ...card, inputValue: foreclosurePercent, chargeType: 'percent', enabled: true };
      }
      return card;
    });

    const calc = errors.length === 0
      ? calculateProductEMI({
          productPrice,
          downPayment,
          interestMode,
          annualRate: rate,
          method,
          interestAmount,
          interestBasis,
          tenureMonths,
          charges,
          deductionMethod: chargeDeductionMethod,
          startDate,
        })
      : {
          baseFinanceAmount: financeAmount,
          effectiveFinanceAmount: financeAmount,
          totalCharges: 0,
          computedCharges: [],
          latePenaltyPerDay,
          foreclosurePercent,
          monthlyEMI: 0,
          totalInterest: 0,
          totalPayable: 0,
          equivalentFlatRate: 0,
          effectiveMethod: interestMode === 'amount' ? 'flat' : method,
        };

    const signature = `${customerPhone}|${productName.toLowerCase()}|${startDate}`;
    const isDuplicate = Boolean(customerPhone && productName && existingSignatures.has(signature));

    const altPhone = normalizePhoneDigits(mapped.altPhone);
    const fatherOrSpouseName = String(mapped.fatherOrSpouseName || '').trim();
    const address = String(mapped.address || '').trim();
    const occupation = String(mapped.occupation || '').trim();
    const aadhaar = String(mapped.aadhaar || '').replace(/\D/g, '').slice(0, 12);
    const guarantorName = String(mapped.guarantorName || '').trim();
    const guarantorPhone = normalizePhoneDigits(mapped.guarantorPhone);
    const guarantorRelation = String(mapped.guarantorRelation || '').trim();
    const notes = String(mapped.notes || '').trim();

    const payload = {
      customerMode: 'existing', // reuses existing customer with matching phone, or creates new if not found
      customerId: '',
      customerEdited: false,
      customer: {
        name: customerName,
        phone: customerPhone,
        altPhone,
        fatherOrSpouseName,
        address: address || customerArea,
        area: customerArea,
        occupation,
        idProofNumber: aadhaar,
        guarantor: {
          name: guarantorName,
          phone: guarantorPhone,
          relationship: guarantorRelation,
        },
      },
      customerName,
      customerPhone,
      customerArea,
      product: {
        name: productName,
        brandModel,
        category,
        serialImei,
        price: Number.isFinite(productPrice) ? productPrice : 0,
        downPayment,
        financeAmount,
      },
      saveProduct: false,
      charges: calc.computedCharges,
      totalCharges: calc.totalCharges,
      chargeDeductionMethod,
      latePenaltyPerDay: calc.latePenaltyPerDay,
      foreclosurePercent: calc.foreclosurePercent,
      interestMode,
      interestAmount: interestMode === 'amount' ? interestAmount : 0,
      interestBasis,
      rate: interestMode === 'rate' ? rate : calc.equivalentFlatRate,
      tenure: Number.isFinite(tenureMonths) ? tenureMonths : 1,
      method: calc.effectiveMethod,
      principal: calc.effectiveFinanceAmount,
      interestRatePercent: interestMode === 'rate' ? rate : calc.equivalentFlatRate,
      interestCalculationType: calc.effectiveMethod,
      tenureMonths: Number.isFinite(tenureMonths) ? tenureMonths : 1,
      documentationCharges: calc.totalCharges,
      startDate,
      assignedAgentId: '',
      notes,
    };

    return {
      rowNumber: idx + 2,
      valid: errors.length === 0,
      errors,
      isDuplicate,
      customerName,
      customerPhone,
      customerArea,
      productName,
      productPrice: Number.isFinite(productPrice) ? productPrice : 0,
      downPayment,
      financeAmount: calc.effectiveFinanceAmount,
      tenureMonths: Number.isFinite(tenureMonths) ? tenureMonths : 0,
      interestMode,
      rate,
      interestAmount,
      method: calc.effectiveMethod,
      monthlyEMI: calc.monthlyEMI,
      totalPayable: calc.totalPayable,
      startDate,
      paidInstallments,
      paidPaymentMode,
      payload,
    };
  });
};
