// Shared live calculator for Product EMI (Rate % Reducing/Flat & Manual Interest Amount)

export const formatINR = (val) => {
  const num = Math.round(Number(val) || 0);
  return '₹' + num.toLocaleString('en-IN');
};

export const formatDDMMYYYY = (dateInput) => {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '-';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

export const maskAadhaar = (raw = '') => {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length <= 4) return digits;
  const last4 = digits.slice(-4);
  return `XXXX XXXX ${last4}`;
};

export const DEFAULT_CHARGE_DEFINITIONS = [
  { key: 'documentation', label: 'Documentation', labelTa: 'ஆவண கட்டணம்', defaultType: 'fixed', isConditionalRate: false },
  { key: 'processing', label: 'Processing', labelTa: 'செயலாக்க கட்டணம்', defaultType: 'fixed', isConditionalRate: false },
  { key: 'service', label: 'Service', labelTa: 'சேவை கட்டணம்', defaultType: 'fixed', isConditionalRate: false },
  { key: 'insurance', label: 'Insurance', labelTa: 'காப்பீடு', defaultType: 'fixed', isConditionalRate: false },
  { key: 'stamp', label: 'Stamp / Agreement', labelTa: 'முத்திரை கட்டணம்', defaultType: 'fixed', isConditionalRate: false },
  { key: 'late_fee', label: 'Late fee per day', labelTa: 'தாமத அபராதம் / நாள்', defaultType: 'fixed', isConditionalRate: true },
  { key: 'foreclosure', label: 'Foreclosure %', labelTa: 'முன்கூட்டியே மூடும் %', defaultType: 'percent', isConditionalRate: true },
  { key: 'other', label: 'Other', labelTa: 'இதர கட்டணம்', defaultType: 'fixed', isConditionalRate: false },
];

export const createInitialCharges = () =>
  DEFAULT_CHARGE_DEFINITIONS.map((def) => ({
    ...def,
    inputValue: 0,
    chargeType: def.defaultType,
    enabled: false,
    isCustom: false,
  }));

export const computeChargesSummary = (charges = [], baseFinanceAmount = 0) => {
  const finance = Math.max(0, Number(baseFinanceAmount) || 0);
  let sanctionChargesTotal = 0;
  let latePenaltyPerDay = 0;
  let foreclosurePercent = 0;

  const computedList = (charges || []).map((c) => {
    const val = Math.max(0, Number(c.inputValue) || 0);
    const enabled = Boolean(c.enabled);
    let computedAmt = 0;

    if (enabled && val > 0) {
      if (c.isConditionalRate) {
        if (c.key === 'late_fee') {
          computedAmt = c.chargeType === 'percent' ? Math.round((finance * val) / 100) : Math.round(val);
          latePenaltyPerDay = computedAmt;
        } else if (c.key === 'foreclosure') {
          computedAmt = c.chargeType === 'percent' ? val : (finance > 0 ? Number(((val / finance) * 100).toFixed(2)) : 0);
          foreclosurePercent = computedAmt;
        }
      } else {
        computedAmt = c.chargeType === 'percent' ? Math.round((finance * val) / 100) : Math.round(val);
        sanctionChargesTotal += computedAmt;
      }
    }

    return {
      key: c.key,
      label: c.label,
      labelTa: c.labelTa || '',
      chargeType: c.chargeType || 'fixed',
      inputValue: val,
      amount: computedAmt,
      enabled,
      isConditionalRate: Boolean(c.isConditionalRate),
    };
  });

  return {
    computedCharges: computedList,
    totalCharges: sanctionChargesTotal,
    latePenaltyPerDay,
    foreclosurePercent,
  };
};

export const calculateProductEMI = ({
  productPrice = 0,
  downPayment = 0,
  interestMode = 'rate', // 'rate' | 'amount'
  annualRate = 14,
  method = 'reducing', // 'reducing' | 'flat'
  interestAmount = 0,
  interestBasis = 'total', // 'total' | 'monthly'
  tenureMonths = 12,
  charges = [],
  deductionMethod = 'collect_separately', // 'upfront' | 'add_to_finance' | 'collect_separately'
  startDate = new Date().toISOString().split('T')[0],
}) => {
  const price = Math.max(0, Number(productPrice) || 0);
  const down = Math.max(0, Number(downPayment) || 0);
  const baseFinanceAmount = Math.max(0, price - down);
  const n = Math.max(1, Math.min(120, Math.round(Number(tenureMonths) || 1)));

  const {
    computedCharges,
    totalCharges,
    latePenaltyPerDay,
    foreclosurePercent,
  } = computeChargesSummary(charges, baseFinanceAmount);

  const effectiveFinanceAmount =
    deductionMethod === 'add_to_finance'
      ? baseFinanceAmount + totalCharges
      : baseFinanceAmount;

  const netDisbursed =
    deductionMethod === 'upfront'
      ? Math.max(0, baseFinanceAmount - totalCharges)
      : baseFinanceAmount;

  if (baseFinanceAmount <= 0) {
    return {
      baseFinanceAmount: 0,
      effectiveFinanceAmount: 0,
      netDisbursed: 0,
      totalCharges,
      computedCharges,
      latePenaltyPerDay,
      foreclosurePercent,
      monthlyEMI: 0,
      totalInterest: 0,
      totalPayable: 0,
      equivalentFlatRate: 0,
      effectiveMethod: interestMode === 'amount' ? 'flat' : method,
      endDate: null,
      schedule: [],
    };
  }

  const start = startDate ? new Date(startDate) : new Date();
  const safeStart = Number.isNaN(start.getTime()) ? new Date() : start;
  const effectiveMethod = interestMode === 'amount' ? 'flat' : method;

  let monthlyEMI = 0;
  let totalInterest = 0;
  let totalPayable = 0;
  let equivalentFlatRate = 0;
  const schedule = [];

  if (effectiveMethod === 'flat') {
    if (interestMode === 'amount') {
      const rawInt = Math.max(0, Number(interestAmount) || 0);
      totalInterest = interestBasis === 'monthly' ? Math.round(rawInt * n) : Math.round(rawInt);
    } else {
      const rate = Math.max(0, Number(annualRate) || 0);
      totalInterest = Math.round(effectiveFinanceAmount * (rate / 100) * (n / 12));
    }

    totalPayable = effectiveFinanceAmount + totalInterest;
    monthlyEMI = Math.round(totalPayable / n);
    equivalentFlatRate =
      effectiveFinanceAmount > 0 && n > 0
        ? Number((((totalInterest / effectiveFinanceAmount) / (n / 12)) * 100).toFixed(2))
        : 0;

    const baseMonthlyInt = Math.round(totalInterest / n);
    let runningEMI = 0;
    let runningInt = 0;
    let runningPrin = 0;
    let currBalance = effectiveFinanceAmount;

    for (let i = 1; i <= n; i++) {
      const dueDate = new Date(safeStart);
      dueDate.setMonth(dueDate.getMonth() + i);

      let instAmount;
      let instInt;
      let instPrin;

      if (i === n) {
        instAmount = Math.max(0, totalPayable - runningEMI);
        instInt = Math.max(0, totalInterest - runningInt);
        instPrin = Math.max(0, effectiveFinanceAmount - runningPrin);
        // Ensure exact row arithmetic: instAmount === instPrin + instInt
        instInt = instAmount - instPrin;
      } else {
        instAmount = monthlyEMI;
        instInt = Math.min(baseMonthlyInt, instAmount);
        instPrin = instAmount - instInt;
      }

      runningEMI += instAmount;
      runningInt += instInt;
      runningPrin += instPrin;
      currBalance = i === n ? 0 : Math.max(0, currBalance - instPrin);

      schedule.push({
        installmentNo: i,
        dueDate,
        dueDateLabel: formatDDMMYYYY(dueDate),
        amount: instAmount,
        principalPart: instPrin,
        interestPart: instInt,
        balance: currBalance,
        paidAmount: 0,
        penaltyAmount: 0,
        status: 'pending',
      });
    }
  } else {
    // Reducing balance EMI
    const annual = Math.max(0, Number(annualRate) || 0);
    const monthlyR = annual / 100 / 12;

    if (monthlyR === 0) {
      monthlyEMI = Math.round(effectiveFinanceAmount / n);
      let runningPrin = 0;
      let currBalance = effectiveFinanceAmount;
      for (let i = 1; i <= n; i++) {
        const dueDate = new Date(safeStart);
        dueDate.setMonth(dueDate.getMonth() + i);
        const instPrin = i === n ? Math.max(0, effectiveFinanceAmount - runningPrin) : monthlyEMI;
        runningPrin += instPrin;
        currBalance = i === n ? 0 : Math.max(0, currBalance - instPrin);

        schedule.push({
          installmentNo: i,
          dueDate,
          dueDateLabel: formatDDMMYYYY(dueDate),
          amount: instPrin,
          principalPart: instPrin,
          interestPart: 0,
          balance: currBalance,
          paidAmount: 0,
          penaltyAmount: 0,
          status: 'pending',
        });
      }
      totalPayable = effectiveFinanceAmount;
      totalInterest = 0;
      equivalentFlatRate = 0;
    } else {
      monthlyEMI = Math.round(
        (effectiveFinanceAmount * monthlyR * Math.pow(1 + monthlyR, n)) /
          (Math.pow(1 + monthlyR, n) - 1)
      );
      let currBalance = effectiveFinanceAmount;
      let sumPayable = 0;
      let sumInt = 0;

      for (let i = 1; i <= n; i++) {
        const dueDate = new Date(safeStart);
        dueDate.setMonth(dueDate.getMonth() + i);
        const instInt = Math.round(currBalance * monthlyR);
        const instPrin = i === n ? currBalance : Math.min(currBalance, Math.max(0, monthlyEMI - instInt));
        const instAmount = instPrin + instInt;
        currBalance = i === n ? 0 : Math.max(0, currBalance - instPrin);

        sumPayable += instAmount;
        sumInt += instInt;

        schedule.push({
          installmentNo: i,
          dueDate,
          dueDateLabel: formatDDMMYYYY(dueDate),
          amount: instAmount,
          principalPart: instPrin,
          interestPart: instInt,
          balance: currBalance,
          paidAmount: 0,
          penaltyAmount: 0,
          status: 'pending',
        });
      }

      totalPayable = sumPayable;
      totalInterest = sumInt;
      equivalentFlatRate =
        effectiveFinanceAmount > 0 && n > 0
          ? Number((((totalInterest / effectiveFinanceAmount) / (n / 12)) * 100).toFixed(2))
          : 0;
    }
  }

  return {
    baseFinanceAmount,
    effectiveFinanceAmount,
    netDisbursed,
    totalCharges,
    computedCharges,
    latePenaltyPerDay,
    foreclosurePercent,
    monthlyEMI,
    totalInterest,
    totalPayable,
    equivalentFlatRate,
    effectiveMethod,
    endDate: schedule.length > 0 ? schedule[schedule.length - 1].dueDate : null,
    schedule,
  };
};
