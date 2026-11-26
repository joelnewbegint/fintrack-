import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import EMICustomer from '../models/EMICustomer.js';
import EMILoan from '../models/EMILoan.js';
import EMIPayment from '../models/EMIPayment.js';
import EMIDailyClosing from '../models/EMIDailyClosing.js';
import EMIAuditLog from '../models/EMIAuditLog.js';
import EMIProduct from '../models/EMIProduct.js';
import User from '../models/User.js';

// Helper: Calculate Reducing Balance EMI
export const calculateReducingEMI = (principal, annualRatePercent, months) => {
  const p = Number(principal);
  const r = (Number(annualRatePercent) / 12) / 100;
  const n = Number(months);

  if (r === 0) {
    const emi = Math.round(p / n);
    return { emi, totalPayable: p, totalInterest: 0 };
  }

  const emi = Math.round((p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
  let currBal = p;
  let totalPayable = 0;
  for (let i = 1; i <= n; i++) {
    const intPart = Math.round(currBal * r);
    const prinPart = i === n ? currBal : Math.min(currBal, Math.max(0, emi - intPart));
    totalPayable += prinPart + intPart;
    currBal = Math.max(0, currBal - prinPart);
  }
  const totalInterest = totalPayable - p;
  return { emi, totalPayable, totalInterest };
};

// Helper: Calculate Flat Interest EMI
export const calculateFlatEMI = (principal, annualRatePercent, months, fixedTotalInterest = null) => {
  const p = Number(principal);
  const n = Number(months);
  const totalInterest = fixedTotalInterest !== null
    ? Math.max(0, Math.round(Number(fixedTotalInterest) || 0))
    : Math.round((p * (Number(annualRatePercent) / 100) * (n / 12)));
  const totalPayable = p + totalInterest;
  const emi = Math.round(totalPayable / n);
  return { emi, totalPayable, totalInterest };
};

// Helper: Generate Amortization Schedule (Flat Adjusted Last Row / Manual Fixed Interest / Reducing Balance)
export const generateEMISchedule = (
  principal,
  annualRatePercent,
  months,
  type = 'reducing',
  startDate = new Date(),
  options = {}
) => {
  const p = Number(principal);
  const n = Number(months);
  const start = new Date(startDate);
  const schedule = [];
  const { interestMode = 'rate', interestAmount = 0, interestBasis = 'total' } = options;

  const isFlat = interestMode === 'amount' || type === 'flat';
  if (isFlat) {
    const fixedInt = interestMode === 'amount'
      ? (interestBasis === 'monthly' ? Math.round(Number(interestAmount || 0) * n) : Math.round(Number(interestAmount || 0)))
      : null;

    const { emi, totalInterest, totalPayable } = calculateFlatEMI(p, annualRatePercent, n, fixedInt);
    const baseMonthlyInterest = Math.round(totalInterest / n);
    let runningEMI = 0;
    let runningInt = 0;
    let runningPrin = 0;

    for (let i = 1; i <= n; i++) {
      const dueDate = new Date(start);
      dueDate.setMonth(dueDate.getMonth() + i);

      let instAmount;
      let instInt;
      let instPrin;

      if (i === n) {
        instAmount = Math.max(0, totalPayable - runningEMI);
        instPrin = Math.max(0, p - runningPrin);
        instInt = instAmount - instPrin;
      } else {
        instAmount = emi;
        instInt = Math.min(baseMonthlyInterest, instAmount);
        instPrin = instAmount - instInt;
      }

      runningEMI += instAmount;
      runningInt += instInt;
      runningPrin += instPrin;

      schedule.push({
        installmentNo: i,
        dueDate,
        amount: instAmount,
        principalPart: instPrin,
        interestPart: instInt,
        paidAmount: 0,
        penaltyAmount: 0,
        status: 'pending',
      });
    }
    return schedule;
  }

  // Reducing Balance Schedule
  const { emi } = calculateReducingEMI(p, annualRatePercent, n);
  const r = (Number(annualRatePercent) / 12) / 100;
  let currentBalance = p;

  for (let i = 1; i <= n; i++) {
    const dueDate = new Date(start);
    dueDate.setMonth(dueDate.getMonth() + i);

    const interestPart = r === 0 ? 0 : Math.round(currentBalance * r);
    const principalPart = i === n ? currentBalance : Math.min(currentBalance, Math.max(0, emi - interestPart));
    const amount = principalPart + interestPart;
    currentBalance = Math.max(0, currentBalance - principalPart);

    schedule.push({
      installmentNo: i,
      dueDate,
      amount,
      principalPart,
      interestPart,
      paidAmount: 0,
      penaltyAmount: 0,
      status: 'pending',
    });
  }

  return schedule;
};

/**
 * 1. EMI DASHBOARD METRICS
 */
export const getEMIDashboardStats = async (req, res, next) => {
  try {
    let agentFilter = {};
    if (!req.user.isOwner) {
      agentFilter = {
        $or: [
          { assignedAgentId: req.user._id },
          { assignedAgentId: null },
          { assignedAgentId: { $exists: false } },
          ...(Array.isArray(req.user.assignedAreas) && req.user.assignedAreas.length > 0
            ? [{ customerArea: { $in: req.user.assignedAreas } }]
            : []),
        ],
      };
    } else if (req.query.agentId && req.query.agentId !== 'all') {
      agentFilter = { assignedAgentId: req.query.agentId };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. Collections today
    const paymentsToday = await EMIPayment.find({
      ...(req.user.isOwner
        ? (req.query.agentId && req.query.agentId !== 'all' ? { collectedBy: req.query.agentId } : {})
        : { collectedBy: req.user._id }),
      paymentDate: { $gte: today, $lt: tomorrow },
      status: 'valid',
    });

    const collectedToday = paymentsToday.reduce((sum, p) => sum + (p.amount || 0), 0);
    const collectedCashToday = paymentsToday.filter(p => p.mode === 'cash').reduce((sum, p) => sum + p.amount, 0);
    const collectedUpiToday = paymentsToday.filter(p => p.mode === 'upi').reduce((sum, p) => sum + p.amount, 0);

    // 2. Active EMI Loans
    const loans = await EMILoan.find({ ...agentFilter, status: { $in: ['active', 'overdue'] } })
      .populate('customerId', 'name phone area');

    let totalPrincipalLent = 0;
    let totalPayableSum = 0;
    let totalCollectedSum = 0;
    let remainingBalanceSum = 0;

    let todayDueAmount = 0;
    let todayDueList = [];
    let overdueList = [];

    loans.forEach((loan) => {
      totalPrincipalLent += loan.principal || 0;
      totalPayableSum += loan.totalPayable || 0;
      totalCollectedSum += loan.totalCollected || 0;
      remainingBalanceSum += loan.remainingBalance || 0;

      // Check installments
      (loan.schedule || []).forEach((inst) => {
        const d = new Date(inst.dueDate);
        d.setHours(0, 0, 0, 0);

        if (d.getTime() === today.getTime() && inst.status !== 'paid') {
          const pending = (inst.amount || 0) - (inst.paidAmount || 0);
          if (pending > 0) {
            todayDueAmount += pending;
            todayDueList.push({
              loanId: loan._id,
              emiNo: loan.emiNo,
              customerId: loan.customerId?._id,
              customerName: loan.customerName,
              customerPhone: loan.customerPhone,
              customerArea: loan.customerArea,
              installmentNo: inst.installmentNo,
              amount: pending,
              installmentAmount: inst.amount,
              pendingAmount: pending,
              remainingBalance: loan.remainingBalance,
              dueDate: inst.dueDate,
              status: inst.status,
            });
          }
        } else if (d.getTime() < today.getTime() && inst.status !== 'paid') {
          const pending = (inst.amount || 0) - (inst.paidAmount || 0);
          if (pending > 0) {
            overdueList.push({
              loanId: loan._id,
              emiNo: loan.emiNo,
              customerId: loan.customerId?._id,
              customerName: loan.customerName,
              customerPhone: loan.customerPhone,
              customerArea: loan.customerArea,
              installmentNo: inst.installmentNo,
              amount: pending,
              installmentAmount: inst.amount,
              pendingAmount: pending,
              remainingBalance: loan.remainingBalance,
              dueDate: inst.dueDate,
              status: inst.status,
            });
          }
        }
      });
    });

    // 3. Weekly Trends (Last 7 Days)
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    // 4. Monthly Trends (Last 6 Months) & Mode Breakdown
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);
    const paymentScopeFilter = req.user.isOwner
      ? (req.query.agentId && req.query.agentId !== 'all' ? { collectedBy: req.query.agentId } : {})
      : { collectedBy: req.user._id };

    const sixMonthPayments = await EMIPayment.find({
      ...paymentScopeFilter,
      paymentDate: { $gte: sixMonthsAgo },
      status: 'valid',
    });

    const recentPayments = sixMonthPayments.filter(
      (p) => new Date(p.paymentDate) >= sevenDaysAgo
    );

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyChart = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);

      const dayTotal = recentPayments
        .filter(p => new Date(p.paymentDate) >= dayStart && new Date(p.paymentDate) <= dayEnd)
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      weeklyChart.push({
        day: dayLabels[d.getDay()],
        date: d.toISOString().split('T')[0],
        amount: dayTotal,
      });
    }

    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyChart = [];
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const mEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const monthTotal = sixMonthPayments
        .filter((p) => new Date(p.paymentDate) >= mStart && new Date(p.paymentDate) <= mEnd)
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      monthlyChart.push({
        day: `${monthLabels[mStart.getMonth()]} ${mStart.getFullYear().toString().slice(-2)}`,
        month: monthLabels[mStart.getMonth()],
        amount: monthTotal,
      });
    }

    const allValidPayments = await EMIPayment.find({
      ...paymentScopeFilter,
      status: 'valid',
    });
    const modeBreakdown = {
      cash: allValidPayments.filter((p) => p.mode === 'cash').reduce((s, p) => s + (p.amount || 0), 0),
      upi: allValidPayments.filter((p) => p.mode === 'upi').reduce((s, p) => s + (p.amount || 0), 0),
      cheque: allValidPayments.filter((p) => p.mode === 'cheque').reduce((s, p) => s + (p.amount || 0), 0),
    };

    const totalIssuedCount = await EMILoan.countDocuments(agentFilter);
    const activeCount = loans.length;
    let customersCount = 0;
    try {
      customersCount = await EMICustomer.countDocuments(agentFilter);
    } catch (e) {
      customersCount = activeCount;
    }

    res.status(200).json({
      success: true,
      stats: {
        collectedToday,
        collectedCashToday,
        collectedUpiToday,
        todayTarget: todayDueAmount,
        targetProgressPercent: todayDueAmount > 0 ? Math.min(100, Math.round((collectedToday / todayDueAmount) * 100)) : 0,
        todayDueCount: todayDueList.length,
        todayDueList,
        overdueCount: overdueList.length,
        overdueList: overdueList.slice(0, 15),
        activeLoansCount: activeCount,
        customersCount,
        loansIssuedCount: totalIssuedCount,
        totalPrincipalLent,
        totalPayable: totalPayableSum,
        totalCollected: totalCollectedSum,
        pendingBalance: remainingBalanceSum,
        weeklyChart,
        monthlyChart,
        modeBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. EMI LOANS CRUD
 */
export const getEMILoans = async (req, res, next) => {
  try {
    const { status, search, area, agentId, page = 1, limit = 50 } = req.query;
    const andConditions = [];

    if (!req.user.isOwner) {
      andConditions.push({
        $or: [
          { assignedAgentId: req.user._id },
          { assignedAgentId: null },
          { assignedAgentId: { $exists: false } },
          ...(Array.isArray(req.user.assignedAreas) && req.user.assignedAreas.length > 0
            ? [{ customerArea: { $in: req.user.assignedAreas } }]
            : []),
        ],
      });
    } else if (agentId && agentId !== 'all') {
      andConditions.push({ assignedAgentId: agentId });
    }

    if (status && status !== 'all') {
      if (status === 'due_today') {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        andConditions.push({
          status: { $in: ['active', 'overdue'] },
          schedule: {
            $elemMatch: {
              dueDate: { $gte: startOfDay, $lte: endOfDay },
              status: { $ne: 'paid' },
            },
          },
        });
      } else if (status === 'completed' || status === 'paid') {
        andConditions.push({ status: { $in: ['completed', 'foreclosed', 'paid'] } });
      } else {
        andConditions.push({ status });
      }
    }

    if (area && area !== 'all') {
      andConditions.push({ customerArea: new RegExp(area, 'i') });
    }

    if (search) {
      const s = search.trim();
      andConditions.push({
        $or: [
          { customerName: new RegExp(s, 'i') },
          { emiNo: new RegExp(s, 'i') },
          { customerPhone: new RegExp(s, 'i') },
        ],
      });
    }

    const query = andConditions.length > 0 ? { $and: andConditions } : {};

    const total = await EMILoan.countDocuments(query);
    const loans = await EMILoan.find(query)
      .populate('customerId', 'name phone area address photoUrl idProofNumber guarantor')
      .populate('assignedAgentId', 'name username phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: loans.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      loans,
    });
  } catch (error) {
    next(error);
  }
};

export const getEMILoanById = async (req, res, next) => {
  try {
    const loan = await EMILoan.findById(req.params.id)
      .populate('customerId')
      .populate('assignedAgentId', 'name username phone');

    if (!loan) {
      return res.status(404).json({ success: false, message: 'EMI Loan record not found' });
    }

    // Role safety check
    if (!req.user.isOwner) {
      const isAssigned =
        !loan.assignedAgentId ||
        String(loan.assignedAgentId?._id || loan.assignedAgentId) === String(req.user._id) ||
        (Array.isArray(req.user.assignedAreas) && req.user.assignedAreas.includes(loan.customerArea));
      if (!isAssigned) {
        return res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this EMI loan' });
      }
    }

    // Fetch payments associated with this EMI loan
    const payments = await EMIPayment.find({ emiLoanId: loan._id }).sort({ paymentDate: -1 });

    res.status(200).json({
      success: true,
      loan,
      payments,
    });
  } catch (error) {
    next(error);
  }
};

export const createEMILoan = async (req, res, next) => {
  let createdCustomerId = null;
  let createdProductId = null;

  try {
    const {
      customerId,
      customerMode = 'existing',
      customerEdited = false,
      customer: customerPayload = null,
      customerName,
      customerPhone,
      customerArea,
      assignedAgentId,
      product = null,
      saveProduct = false,
      charges = [],
      chargeDeductionMethod = 'collect_separately',
      interestMode = 'rate',
      interestAmount = 0,
      interestBasis = 'total',
      rate,
      tenure,
      method,
      principal,
      interestRatePercent,
      interestCalculationType = 'reducing',
      tenureMonths,
      documentationCharges = 0,
      latePenaltyPerDay = 0,
      foreclosurePercent = 0,
      startDate = new Date(),
      notes = '',
    } = req.body;

    const finalTenure = Number(tenure || tenureMonths) || 0;
    const finalMethod = interestMode === 'amount' ? 'flat' : (method || interestCalculationType || 'reducing');
    const finalRate = rate !== undefined ? Number(rate) : Number(interestRatePercent || 0);

    // Product EMI support: calculate effective principal from product financeAmount or legacy principal
    const productPrice = Number(product?.price) || 0;
    const productDown = Math.max(0, Number(product?.downPayment) || 0);
    const baseFinance = product?.name
      ? Math.max(0, productPrice - productDown)
      : Number(principal || 0);

    // Compute sanction fee charges total & conditional rates
    const safeCharges = Array.isArray(charges) ? charges : [];
    const sanctionChargesTotal = safeCharges.reduce((sum, c) => {
      if (!c?.enabled) return sum;
      if (c.key === 'late_fee' || c.key === 'foreclosure' || c.isConditionalRate) return sum;
      return sum + Math.max(0, Number(c.amount) || 0);
    }, 0) || (Number(documentationCharges) || 0);

    const effectivePrincipal =
      chargeDeductionMethod === 'add_to_finance'
        ? baseFinance + sanctionChargesTotal
        : baseFinance;

    const netDisbursed =
      chargeDeductionMethod === 'upfront'
        ? Math.max(0, baseFinance - sanctionChargesTotal)
        : baseFinance;

    if (!effectivePrincipal || effectivePrincipal <= 0 || !finalTenure || finalTenure < 1) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid finance amount (> 0) and tenure (>= 1 month).',
      });
    }

    if (product && (!product.name || !String(product.name).trim() || productPrice <= 0 || baseFinance <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Product name, price (> 0), and finance amount (> 0) are required.',
      });
    }

    if (interestMode === 'amount' && Number(interestAmount) < 0) {
      return res.status(400).json({ success: false, message: 'Interest amount cannot be negative.' });
    }
    if (interestMode === 'rate' && finalRate < 0) {
      return res.status(400).json({ success: false, message: 'Interest rate cannot be negative.' });
    }

    const cData = customerPayload || {};
    const cName = (cData.name || customerName || '').trim();
    const cPhoneRaw = (cData.phone || customerPhone || '').replace(/\D/g, '');
    const cArea = (cData.area || customerArea || '').trim();

    // Lookup existing customer cleanly (or create new atomic inside try/rollback)
    let cust = null;
    if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
      cust = await EMICustomer.findById(customerId);
    }
    if (!cust && customerId && customerId !== 'temp_cust') {
      cust = await EMICustomer.findOne({ clientId: customerId });
    }
    if (!cust && cPhoneRaw && customerMode !== 'new') {
      cust = await EMICustomer.findOne({ phone: cPhoneRaw });
    }

    const finalCustomerName = (cName || (cust ? cust.name : '') || '').trim();
    const finalCustomerPhone = (cPhoneRaw || (cust ? cust.phone : '') || '').trim();
    const finalCustomerArea = (cArea || (cust ? cust.area : '') || '').trim();

    if (!finalCustomerName || !finalCustomerPhone || !finalCustomerArea) {
      return res.status(400).json({
        success: false,
        message: 'Customer name, 10-digit phone number, and area are required.',
      });
    }

    let agent = null;
    if (assignedAgentId && mongoose.Types.ObjectId.isValid(assignedAgentId)) {
      agent = await User.findById(assignedAgentId);
    } else if (!req.user.isOwner && !assignedAgentId) {
      agent = req.user;
    }

    // Build composed address from door/street/village if provided
    const composedAddress = [cData.doorNo, cData.street, cData.villageTown, finalCustomerArea]
      .filter((part) => part && String(part).trim())
      .join(', ');

    if (!cust) {
      cust = await EMICustomer.create({
        clientId: `emi_cust_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        createdBy: req.user._id,
        assignedAgentId: agent ? agent._id : (req.user.isOwner ? null : req.user._id),
        name: finalCustomerName,
        phone: finalCustomerPhone,
        altPhone: (cData.altPhone || '').trim(),
        fatherOrSpouseName: (cData.fatherOrSpouseName || '').trim(),
        doorNo: (cData.doorNo || '').trim(),
        street: (cData.street || '').trim(),
        villageTown: (cData.villageTown || '').trim(),
        address: (cData.address || composedAddress || finalCustomerArea).trim(),
        area: finalCustomerArea,
        occupation: (cData.occupation || '').trim(),
        photoUrl: cData.photoUrl || '',
        idProofType: cData.idProofType || 'Aadhaar Card',
        idProofNumber: (cData.idProofNumber || '').trim(),
        idProofUrl: cData.idProofUrl || '',
        guarantor: {
          name: (cData.guarantor?.name || '').trim(),
          phone: (cData.guarantor?.phone || '').trim(),
          relationship: (cData.guarantor?.relationship || '').trim(),
        },
        status: 'active',
      });
      createdCustomerId = cust._id;
    } else if (customerEdited && customerPayload) {
      cust.name = finalCustomerName;
      cust.phone = finalCustomerPhone;
      if (cData.altPhone !== undefined) cust.altPhone = String(cData.altPhone || '').trim();
      if (cData.fatherOrSpouseName !== undefined) cust.fatherOrSpouseName = String(cData.fatherOrSpouseName || '').trim();
      if (cData.doorNo !== undefined) cust.doorNo = String(cData.doorNo || '').trim();
      if (cData.street !== undefined) cust.street = String(cData.street || '').trim();
      if (cData.villageTown !== undefined) cust.villageTown = String(cData.villageTown || '').trim();
      cust.area = finalCustomerArea;
      cust.address = (cData.address || composedAddress || finalCustomerArea).trim();
      if (cData.occupation !== undefined) cust.occupation = String(cData.occupation || '').trim();
      if (cData.photoUrl !== undefined && cData.photoUrl) cust.photoUrl = cData.photoUrl;
      if (cData.idProofNumber !== undefined && !String(cData.idProofNumber).includes('XXXX')) {
        cust.idProofNumber = String(cData.idProofNumber || '').trim();
      }
      if (cData.idProofUrl !== undefined && cData.idProofUrl) cust.idProofUrl = cData.idProofUrl;
      if (cData.guarantor) {
        cust.guarantor = {
          ...(cust.guarantor || {}),
          name: (cData.guarantor.name || '').trim(),
          phone: (cData.guarantor.phone || '').trim(),
          relationship: (cData.guarantor.relationship || '').trim(),
        };
      }
      await cust.save();
    }

    // Generate schedule using requested rate/amount parameters
    const schedule = generateEMISchedule(
      effectivePrincipal,
      finalRate,
      finalTenure,
      finalMethod,
      startDate,
      { interestMode, interestAmount, interestBasis }
    );

    const totalPayable = schedule.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const totalInterest = Math.max(0, totalPayable - effectivePrincipal);
    const emiAmt = schedule.length > 0 ? schedule[0].amount : 0;
    const computedFlatRate = effectivePrincipal > 0 && finalTenure > 0
      ? Number((((totalInterest / effectivePrincipal) / (finalTenure / 12)) * 100).toFixed(2))
      : 0;
    const storedRate = interestMode === 'amount' ? computedFlatRate : finalRate;

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const emiNo = `EMI-${new Date().getFullYear().toString().slice(-2)}-${randomSuffix}`;
    const endDate = schedule[schedule.length - 1].dueDate;

    const lateFeeCard = safeCharges.find((c) => c.key === 'late_fee' && c.enabled);
    const foreclosureCard = safeCharges.find((c) => c.key === 'foreclosure' && c.enabled);

    const emiLoan = await EMILoan.create({
      emiNo,
      customerId: cust._id,
      customerName: finalCustomerName,
      customerPhone: finalCustomerPhone,
      customerArea: finalCustomerArea,
      assignedAgentId: agent ? agent._id : null,
      assignedAgentName: agent ? agent.name : 'Unassigned (office)',
      principal: effectivePrincipal,
      interestRatePercent: storedRate,
      interestCalculationType: finalMethod,
      interestMode,
      interestAmount: Number(interestAmount) || 0,
      interestBasis,
      method: finalMethod,
      product: product
        ? {
            name: String(product.name || '').trim(),
            brandModel: String(product.brandModel || '').trim(),
            category: String(product.category || '').trim(),
            serialImei: String(product.serialImei || '').trim(),
            serialPhotoUrl: product.serialPhotoUrl || '',
            price: productPrice,
            downPayment: productDown,
            financeAmount: baseFinance,
          }
        : undefined,
      charges: safeCharges,
      totalCharges: sanctionChargesTotal,
      chargeDeductionMethod,
      netDisbursed,
      foreclosurePercent: Number(foreclosurePercent || foreclosureCard?.amount || 0),
      latePenaltyPerDay: Number(latePenaltyPerDay || lateFeeCard?.amount || 0),
      tenureMonths: finalTenure,
      documentationCharges: sanctionChargesTotal,
      installmentAmount: emiAmt,
      totalPayable,
      totalInterest,
      totalCollected: 0,
      remainingBalance: totalPayable,
      startDate: new Date(startDate),
      endDate,
      status: 'active',
      schedule,
      notes,
      createdBy: req.user._id,
    });

    if (saveProduct && product?.name) {
      const cleanName = String(product.name).trim();
      const cleanBrand = String(product.brandModel || '').trim();
      const existingProd = await EMIProduct.findOne({
        name: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
        brandModel: cleanBrand,
      });
      if (existingProd) {
        existingProd.category = String(product.category || existingProd.category || '').trim();
        existingProd.price = productPrice > 0 ? productPrice : existingProd.price;
        existingProd.lastUsedAt = new Date();
        await existingProd.save();
      } else {
        const savedProd = await EMIProduct.create({
          name: cleanName,
          brandModel: cleanBrand,
          category: String(product.category || '').trim(),
          price: productPrice,
          createdBy: req.user._id,
          lastUsedAt: new Date(),
        });
        createdProductId = savedProd._id;
      }
    }

    await EMIAuditLog.create({
      action: 'CREATE_EMI',
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      emiLoanId: emiLoan._id,
      details: {
        emiNo,
        principal: effectivePrincipal,
        tenureMonths: finalTenure,
        interestRatePercent: storedRate,
        interestMode,
        productName: product?.name || '',
      },
    });

    const populatedLoan = await EMILoan.findById(emiLoan._id)
      .populate('customerId')
      .populate('assignedAgentId', 'name username phone');

    res.status(201).json({
      success: true,
      message: 'New EMI loan sanctioned successfully',
      loan: populatedLoan || emiLoan,
      customer: cust,
    });
  } catch (error) {
    // Atomic rollback if any step failed after creating customer/product
    try {
      if (createdCustomerId) await EMICustomer.findByIdAndDelete(createdCustomerId);
      if (createdProductId) await EMIProduct.findByIdAndDelete(createdProductId);
    } catch (rollbackErr) {
      console.error('[EMI Atomic Rollback Error]:', rollbackErr);
    }
    next(error);
  }
};

export const getEMIProducts = async (req, res, next) => {
  try {
    const products = await EMIProduct.find({}).sort({ lastUsedAt: -1, createdAt: -1 }).limit(200);
    res.status(200).json({ success: true, products });
  } catch (error) {
    next(error);
  }
};

export const saveEMIProduct = async (req, res, next) => {
  try {
    const { name, brandModel = '', category = '', price = 0 } = req.body;
    const cleanName = String(name || '').trim();
    if (!cleanName) {
      return res.status(400).json({ success: false, message: 'Product name is required' });
    }
    const cleanBrand = String(brandModel || '').trim();
    const existing = await EMIProduct.findOne({
      name: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      brandModel: cleanBrand,
    });
    if (existing) {
      existing.category = String(category || existing.category || '').trim();
      if (Number(price) > 0) existing.price = Number(price);
      existing.lastUsedAt = new Date();
      await existing.save();
      return res.status(200).json({ success: true, product: existing });
    }
    const product = await EMIProduct.create({
      name: cleanName,
      brandModel: cleanBrand,
      category: String(category || '').trim(),
      price: Number(price) || 0,
      createdBy: req.user._id,
      lastUsedAt: new Date(),
    });
    res.status(201).json({ success: true, product });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. RECORD EMI PAYMENT / INSTALLMENT COLLECTION
 */
export const recordEMIPayment = async (req, res, next) => {
  try {
    const {
      emiLoanId,
      amount,
      installmentNo,
      mode = 'cash',
      referenceNo = '',
      notes = '',
      penaltyAmount = 0,
      paymentDate = new Date(),
    } = req.body;

    if (!emiLoanId || !amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid EMI loan ID and collection amount are required.',
      });
    }

    const loan = await EMILoan.findById(emiLoanId);
    if (!loan) {
      return res.status(404).json({ success: false, message: 'EMI loan not found' });
    }

    // Role access check
    if (!req.user.isOwner) {
      const isAssigned =
        !loan.assignedAgentId ||
        String(loan.assignedAgentId?._id || loan.assignedAgentId) === String(req.user._id) ||
        (Array.isArray(req.user.assignedAreas) && req.user.assignedAreas.includes(loan.customerArea));
      if (!isAssigned) {
        return res.status(403).json({ success: false, message: 'Access denied: You are not assigned to this loan' });
      }
    }

    const payNum = Number(amount);
    let remainingToDistribute = payNum;
    const paidInstallmentNos = [];
    const receiptNo = `RCP-EMI-${new Date().getFullYear().toString().slice(-2)}-${Math.floor(10000 + Math.random() * 90000)}`;

    // Distribute collection across schedule installments (prioritize specific installment if requested)
    if (installmentNo) {
      const targetInst = loan.schedule.find((s) => s.installmentNo === Number(installmentNo));
      if (targetInst && targetInst.status !== 'paid') {
        const instDue = Math.max(0, (targetInst.amount || 0) - (targetInst.paidAmount || 0));
        if (remainingToDistribute >= instDue) {
          targetInst.paidAmount = targetInst.amount;
          targetInst.status = 'paid';
          targetInst.paidDate = new Date(paymentDate);
          targetInst.paymentMode = mode;
          targetInst.receiptNo = receiptNo;
          remainingToDistribute -= instDue;
          paidInstallmentNos.push(targetInst.installmentNo);
        } else {
          targetInst.paidAmount = (targetInst.paidAmount || 0) + remainingToDistribute;
          targetInst.status = 'partial';
          targetInst.paidDate = new Date(paymentDate);
          targetInst.paymentMode = mode;
          targetInst.receiptNo = receiptNo;
          remainingToDistribute = 0;
          paidInstallmentNos.push(targetInst.installmentNo);
        }
      }
    }

    for (let i = 0; i < loan.schedule.length; i++) {
      if (remainingToDistribute <= 0) break;
      const inst = loan.schedule[i];

      if (inst.status !== 'paid') {
        const instDue = Math.max(0, (inst.amount || 0) - (inst.paidAmount || 0));

        if (remainingToDistribute >= instDue) {
          inst.paidAmount = inst.amount;
          inst.status = 'paid';
          inst.paidDate = new Date(paymentDate);
          inst.paymentMode = mode;
          inst.receiptNo = receiptNo;
          remainingToDistribute -= instDue;
          paidInstallmentNos.push(inst.installmentNo);
        } else {
          inst.paidAmount = (inst.paidAmount || 0) + remainingToDistribute;
          inst.status = 'partial';
          inst.paidDate = new Date(paymentDate);
          inst.paymentMode = mode;
          inst.receiptNo = receiptNo;
          remainingToDistribute = 0;
          paidInstallmentNos.push(inst.installmentNo);
        }
      }
    }

    // Update loan totals
    loan.totalCollected = (loan.totalCollected || 0) + payNum;
    loan.remainingBalance = Math.max(0, (loan.remainingBalance || 0) - payNum);

    if (loan.remainingBalance <= 0) {
      loan.status = 'completed';
    } else {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const stillOverdue = loan.schedule.some(
        (s) => s.status !== 'paid' && new Date(s.dueDate) < todayStart
      );
      loan.status = stillOverdue ? 'overdue' : 'active';
    }

    await loan.save();

    const payment = await EMIPayment.create({
      receiptNo,
      emiLoanId: loan._id,
      customerId: loan.customerId,
      customerName: loan.customerName,
      installmentNos: paidInstallmentNos.length > 0 ? paidInstallmentNos : [Number(installmentNo) || 1],
      amount: payNum,
      penaltyPortion: Number(penaltyAmount) || 0,
      paymentDate: new Date(paymentDate),
      mode,
      referenceNo,
      collectedBy: req.user._id,
      collectedByName: req.user.name,
      notes,
      status: 'valid',
    });

    await EMIAuditLog.create({
      action: 'COLLECT_EMI',
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      emiLoanId: loan._id,
      receiptNo,
      details: { amount: payNum, mode, installmentNos: paidInstallmentNos },
    });

    res.status(201).json({
      success: true,
      message: 'EMI installment payment recorded successfully',
      receipt: payment,
      loan,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 4. REVERSE / CANCEL EMI PAYMENT (Owner only)
 */
export const reverseEMIPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason = 'Incorrect entry / Voided' } = req.body;

    const payment = await EMIPayment.findById(id);
    if (!payment) {
      return res.status(404).json({ success: false, message: 'EMI Payment receipt not found' });
    }

    if (payment.status === 'reversed') {
      return res.status(400).json({ success: false, message: 'This payment has already been reversed.' });
    }

    const loan = await EMILoan.findById(payment.emiLoanId);
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Associated EMI Loan not found' });
    }

    // Revert amounts on loan
    loan.totalCollected = Math.max(0, (loan.totalCollected || 0) - payment.amount);
    loan.remainingBalance = Math.min(loan.totalPayable || Infinity, (loan.remainingBalance || 0) + payment.amount);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Rollback installments that were marked paid or partial by this collection
    const targetNos = payment.installmentNos || [];
    loan.schedule.forEach((inst) => {
      if (targetNos.includes(inst.installmentNo) && (inst.status === 'paid' || inst.status === 'partial')) {
        inst.status = new Date(inst.dueDate) < todayStart ? 'overdue' : 'pending';
        inst.paidAmount = 0;
        inst.paidDate = null;
        inst.paymentMode = '';
        inst.receiptNo = '';
      }
    });

    if (loan.remainingBalance > 0) {
      const hasOverdue = loan.schedule.some(
        (s) => s.status !== 'paid' && new Date(s.dueDate) < todayStart
      );
      loan.status = hasOverdue ? 'overdue' : 'active';
    }

    await loan.save();

    payment.status = 'reversed';
    payment.reversedAt = new Date();
    payment.reversedBy = req.user._id;
    payment.reversalReason = reason;
    await payment.save();

    await EMIAuditLog.create({
      action: 'REVERSE_EMI_PAYMENT',
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      emiLoanId: loan._id,
      receiptNo: payment.receiptNo,
      details: { amount: payment.amount, reason },
    });

    res.status(200).json({
      success: true,
      message: `Receipt ${payment.receiptNo} reversed successfully. Balance restored.`,
      loan,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 5. FORECLOSURE QUOTE & SETTLEMENT
 */
export const getForeclosureQuote = async (req, res, next) => {
  try {
    const loan = await EMILoan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ success: false, message: 'EMI Loan not found' });
    }

    // Unpaid installments
    const unpaidInstallments = loan.schedule.filter(s => s.status !== 'paid');
    const remainingPrincipal = unpaidInstallments.reduce((sum, i) => sum + (i.principalPart || 0), 0);
    const unearnedInterest = unpaidInstallments.reduce((sum, i) => sum + (i.interestPart || 0), 0);

    // Standard foreclosure rebate: 80% discount on unearned future interest
    const interestDiscount = Math.round(unearnedInterest * 0.8);
    const quoteAmount = Math.max(0, loan.remainingBalance - interestDiscount);

    res.status(200).json({
      success: true,
      quote: {
        loanId: loan._id,
        emiNo: loan.emiNo,
        customerName: loan.customerName,
        totalRemainingBalance: loan.remainingBalance,
        remainingPrincipal,
        unearnedInterest,
        recommendedDiscount: interestDiscount,
        settlementAmount: quoteAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const forecloseEMILoan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { settlementAmount, discountGiven = 0, paymentMode = 'cash', notes = '' } = req.body;

    const loan = await EMILoan.findById(id);
    if (!loan) {
      return res.status(404).json({ success: false, message: 'EMI Loan not found' });
    }

    const payNum = Number(settlementAmount);
    const discNum = Number(discountGiven) || 0;

    // Close all pending installments
    loan.schedule.forEach((inst) => {
      if (inst.status !== 'paid') {
        inst.status = 'paid';
        inst.paidAmount = inst.amount;
        inst.paidDate = new Date();
      }
    });

    loan.totalCollected = (loan.totalCollected || 0) + payNum;
    loan.remainingBalance = 0;
    loan.status = 'foreclosed';
    loan.foreclosure = {
      isForeclosed: true,
      quoteAmount: payNum,
      discountGiven: discNum,
      foreclosureDate: new Date(),
      notes,
      settledBy: req.user._id,
    };

    await loan.save();

    // Create settlement payment receipt
    const receiptNo = `RCP-EMI-SETTLE-${Math.floor(1000 + Math.random() * 9000)}`;
    await EMIPayment.create({
      receiptNo,
      emiLoanId: loan._id,
      customerId: loan.customerId,
      customerName: loan.customerName,
      installmentNos: [0],
      amount: payNum,
      discountPortion: discNum,
      paymentDate: new Date(),
      mode: paymentMode,
      collectedBy: req.user._id,
      collectedByName: req.user.name,
      notes: `One-Time Early Closure Settlement (Discount ₹${discNum})`,
    });

    await EMIAuditLog.create({
      action: 'FORECLOSE_EMI',
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      emiLoanId: loan._id,
      receiptNo,
      details: { settlementAmount: payNum, discountGiven: discNum },
    });

    res.status(200).json({
      success: true,
      message: 'Loan successfully foreclosed and marked as settled.',
      loan,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. RESCHEDULE INSTALLMENT / HOLIDAY
 */
export const rescheduleInstallment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { installmentNo, newDueDate, reason } = req.body;

    if (!installmentNo || !newDueDate) {
      return res.status(400).json({ success: false, message: 'Please provide installment number and new due date.' });
    }

    const loan = await EMILoan.findById(id);
    if (!loan) {
      return res.status(404).json({ success: false, message: 'EMI Loan not found' });
    }

    const inst = loan.schedule.find(s => s.installmentNo === Number(installmentNo));
    if (!inst) {
      return res.status(404).json({ success: false, message: `Installment #${installmentNo} not found` });
    }

    const oldDueDate = inst.dueDate;
    inst.dueDate = new Date(newDueDate);
    inst.status = 'rescheduled';

    loan.reschedules.push({
      installmentNo: Number(installmentNo),
      oldDueDate,
      newDueDate: new Date(newDueDate),
      reason: reason || 'Customer requested date postponement',
      approvedBy: req.user._id,
    });

    await loan.save();

    await EMIAuditLog.create({
      action: 'RESCHEDULE_INSTALLMENT',
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      emiLoanId: loan._id,
      details: { installmentNo, oldDueDate, newDueDate, reason },
    });

    res.status(200).json({
      success: true,
      message: `Installment #${installmentNo} rescheduled to ${new Date(newDueDate).toLocaleDateString()}`,
      loan,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 7. EMI CUSTOMERS CRUD
 */
export const getEMICustomers = async (req, res, next) => {
  try {
    const { search, area, page = 1, limit = 50 } = req.query;
    const andConditions = [];

    if (!req.user.isOwner) {
      andConditions.push({
        $or: [
          { assignedAgentId: req.user._id },
          { assignedAgentId: null },
          { assignedAgentId: { $exists: false } },
          ...(Array.isArray(req.user.assignedAreas) && req.user.assignedAreas.length > 0
            ? [{ area: { $in: req.user.assignedAreas } }]
            : []),
        ],
      });
    }

    if (area && area !== 'all') {
      andConditions.push({ area: new RegExp(area, 'i') });
    }

    if (search) {
      const s = search.trim();
      andConditions.push({
        $or: [
          { name: new RegExp(s, 'i') },
          { phone: new RegExp(s, 'i') },
          { area: new RegExp(s, 'i') },
        ],
      });
    }

    const query = andConditions.length > 0 ? { $and: andConditions } : {};

    const total = await EMICustomer.countDocuments(query);
    const customers = await EMICustomer.find(query)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: customers.length,
      total,
      customers,
    });
  } catch (error) {
    next(error);
  }
};

export const createEMICustomer = async (req, res, next) => {
  try {
    const {
      name,
      tamilName = '',
      phone,
      altPhone = '',
      address,
      area,
      photoUrl = '',
      idProofType = 'Aadhaar Card',
      idProofNumber = '',
      guarantor = {},
      notes = '',
    } = req.body;

    if (!name || !phone || !address || !area) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone, address and area are required fields.',
      });
    }

    const clientId = `emi_cust_${Date.now()}`;
    let customerAgentId = null;
    if (!req.user.isOwner) {
      customerAgentId = req.user._id;
    } else {
      const activeEmiAgent = await User.findOne({ role: 'emi_agent', status: 'active' });
      customerAgentId = activeEmiAgent ? activeEmiAgent._id : null;
    }

    const customer = await EMICustomer.create({
      clientId,
      createdBy: req.user._id,
      assignedAgentId: customerAgentId,
      name: name.trim(),
      tamilName: tamilName.trim(),
      phone: phone.trim(),
      altPhone: altPhone.trim(),
      address: address.trim(),
      area: area.trim(),
      photoUrl,
      idProofType,
      idProofNumber: idProofNumber.trim(),
      guarantor,
      notes,
      status: 'active',
    });

    res.status(201).json({
      success: true,
      message: 'EMI customer registered successfully',
      customer,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 8. EMI EXCEL REPORT EXPORT
 */
export const exportEMIExcelReport = async (req, res, next) => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "VK Banker's & Finance - FinTrack EMI Suite";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('EMI Portfolio');

    sheet.columns = [
      { header: 'EMI No', key: 'emiNo', width: 16 },
      { header: 'Customer Name', key: 'customerName', width: 24 },
      { header: 'Phone', key: 'customerPhone', width: 15 },
      { header: 'Area', key: 'customerArea', width: 18 },
      { header: 'Principal (₹)', key: 'principal', width: 15 },
      { header: 'Interest %', key: 'interestRatePercent', width: 12 },
      { header: 'Tenure (Mo)', key: 'tenureMonths', width: 12 },
      { header: 'Monthly EMI (₹)', key: 'installmentAmount', width: 16 },
      { header: 'Total Payable (₹)', key: 'totalPayable', width: 16 },
      { header: 'Collected (₹)', key: 'totalCollected', width: 15 },
      { header: 'Balance (₹)', key: 'remainingBalance', width: 15 },
      { header: 'Status', key: 'status', width: 14 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0878D1' } };

    let query = {};
    if (!req.user.isOwner) {
      query = {
        $or: [
          { assignedAgentId: req.user._id },
          { assignedAgentId: null },
          { assignedAgentId: { $exists: false } },
        ],
      };
    }
    const loans = await EMILoan.find(query).sort({ createdAt: -1 });

    loans.forEach((l) => {
      sheet.addRow({
        emiNo: l.emiNo,
        customerName: l.customerName,
        customerPhone: l.customerPhone,
        customerArea: l.customerArea,
        principal: l.principal,
        interestRatePercent: l.interestRatePercent,
        tenureMonths: l.tenureMonths,
        installmentAmount: l.installmentAmount,
        totalPayable: l.totalPayable,
        totalCollected: l.totalCollected,
        remainingBalance: l.remainingBalance,
        status: l.status.toUpperCase(),
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="VK_Bankers_EMI_Report_${new Date().toISOString().split('T')[0]}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

/**
 * 9. GET ALL EMI PAYMENTS / RECEIPTS
 */
export const getEMIPayments = async (req, res, next) => {
  try {
    const { loanId, mode, status, search, limit = 200 } = req.query;
    const andConditions = [];

    if (!req.user.isOwner) {
      andConditions.push({ collectedBy: req.user._id });
    }
    if (loanId && mongoose.Types.ObjectId.isValid(loanId)) {
      andConditions.push({ emiLoanId: loanId });
    }
    if (mode && mode !== 'all') {
      andConditions.push({ mode });
    }
    if (status && status !== 'all') {
      andConditions.push({ status });
    }
    if (search && search.trim()) {
      const s = search.trim();
      andConditions.push({
        $or: [
          { customerName: new RegExp(s, 'i') },
          { receiptNo: new RegExp(s, 'i') },
        ],
      });
    }

    const query = andConditions.length > 0 ? { $and: andConditions } : {};
    const payments = await EMIPayment.find(query)
      .populate('emiLoanId', 'emiNo principal installmentAmount customerPhone customerArea remainingBalance product')
      .sort({ paymentDate: -1, createdAt: -1 })
      .limit(Number(limit));

    const formatted = payments.map((p) => {
      const obj = p.toObject();
      return {
        ...obj,
        loanNo: obj.emiLoanId?.emiNo || 'EMI',
        product: obj.emiLoanId?.product || null,
        customerPhone: obj.emiLoanId?.customerPhone || '',
        customerArea: obj.emiLoanId?.customerArea || '',
        installmentNo: Array.isArray(obj.installmentNos) && obj.installmentNos.length > 0 ? obj.installmentNos.join(', ') : '1',
      };
    });

    res.status(200).json({
      success: true,
      count: formatted.length,
      payments: formatted,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 10. UPDATE & DELETE EMI LOAN (Owner Only)
 */
export const updateEMILoan = async (req, res, next) => {
  try {
    const loan = await EMILoan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ success: false, message: 'EMI loan not found' });
    }

    const { customerName, customerPhone, customerArea, assignedAgentId, notes, status } = req.body;
    if (customerName !== undefined) loan.customerName = customerName;
    if (customerPhone !== undefined) loan.customerPhone = customerPhone;
    if (customerArea !== undefined) loan.customerArea = customerArea;
    if (notes !== undefined) loan.notes = notes;
    if (status !== undefined) loan.status = status;
    if (assignedAgentId !== undefined) {
      if (assignedAgentId && mongoose.Types.ObjectId.isValid(assignedAgentId)) {
        const agent = await User.findById(assignedAgentId);
        loan.assignedAgentId = agent ? agent._id : null;
        loan.assignedAgentName = agent ? agent.name : 'Unassigned';
      } else {
        loan.assignedAgentId = null;
        loan.assignedAgentName = 'Unassigned';
      }
    }

    await loan.save();
    res.status(200).json({ success: true, message: 'EMI loan updated', loan });
  } catch (error) {
    next(error);
  }
};

export const deleteEMILoan = async (req, res, next) => {
  try {
    const loan = await EMILoan.findById(req.params.id);
    if (!loan) {
      return res.status(404).json({ success: false, message: 'EMI loan not found' });
    }

    await EMIPayment.deleteMany({ emiLoanId: loan._id });
    await EMILoan.findByIdAndDelete(loan._id);

    await EMIAuditLog.create({
      action: 'DELETE_EMI_LOAN',
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      emiLoanId: loan._id,
      details: { emiNo: loan.emiNo, customerName: loan.customerName, principal: loan.principal },
    });

    res.status(200).json({
      success: true,
      message: `EMI Loan ${loan.emiNo} deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 11. UPDATE & DELETE EMI CUSTOMER
 */
export const updateEMICustomer = async (req, res, next) => {
  try {
    const customer = await EMICustomer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'EMI customer not found' });
    }

    const { name, tamilName, phone, altPhone, address, area, idProofType, idProofNumber, guarantor, notes } = req.body;
    if (name !== undefined) customer.name = name.trim();
    if (tamilName !== undefined) customer.tamilName = tamilName.trim();
    if (phone !== undefined) customer.phone = phone.trim();
    if (altPhone !== undefined) customer.altPhone = altPhone.trim();
    if (address !== undefined) customer.address = address.trim();
    if (area !== undefined) customer.area = area.trim();
    if (idProofType !== undefined) customer.idProofType = idProofType;
    if (idProofNumber !== undefined) customer.idProofNumber = idProofNumber.trim();
    if (guarantor !== undefined) customer.guarantor = guarantor;
    if (notes !== undefined) customer.notes = notes;

    await customer.save();
    res.status(200).json({ success: true, message: 'Borrower updated', customer });
  } catch (error) {
    next(error);
  }
};

export const deleteEMICustomer = async (req, res, next) => {
  try {
    const customer = await EMICustomer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'EMI customer not found' });
    }

    const loans = await EMILoan.find({ customerId: customer._id });
    const hasActive = loans.some((l) => l.status === 'active' || l.status === 'overdue');
    if (hasActive && req.query.force !== 'true') {
      return res.status(400).json({
        success: false,
        message: 'Borrower has active EMI loans. Close or delete those loans first, or confirm full deletion.',
      });
    }

    const loanIds = loans.map((l) => l._id);
    if (loanIds.length > 0) {
      await EMIPayment.deleteMany({ emiLoanId: { $in: loanIds } });
      await EMILoan.deleteMany({ _id: { $in: loanIds } });
    }
    await EMICustomer.findByIdAndDelete(customer._id);

    res.status(200).json({
      success: true,
      message: `Borrower ${customer.name} removed successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 12. CLEAR ALL EMI DATA (Owner Only - removes sample/unwanted EMI records)
 */
export const clearEMIData = async (req, res, next) => {
  try {
    await Promise.all([
      EMICustomer.deleteMany({}),
      EMILoan.deleteMany({}),
      EMIPayment.deleteMany({}),
      EMIAuditLog.deleteMany({}),
      EMIDailyClosing.deleteMany({}),
    ]);

    res.status(200).json({
      success: true,
      message: 'All EMI accounts, borrowers, and receipts have been cleared cleanly.',
    });
  } catch (error) {
    next(error);
  }
};

