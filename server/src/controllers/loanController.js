import mongoose from 'mongoose';
import Loan from '../models/Loan.js';
import Customer from '../models/Customer.js';
import Payment from '../models/Payment.js';
import AuditLog from '../models/AuditLog.js';
import {
  computeLoanStatusFromSchedule,
  computeNextPeriodDueDate,
  getEffectiveDueDate,
  getISTDateStr,
  getScheduleMaxDueDate,
  isInstallmentOverdue,
} from '../utils/installmentHelpers.js';

export const createLoan = async (req, res, next) => {
  try {
    if (req.user?.role === 'client') {
      return res.status(403).json({ success: false, message: 'Access denied: Clients cannot issue loans.' });
    }
    const {
      customerId,
      principal,
      interestPercent,
      financeType,
      duration,
      startDate,
      latePenaltyRate,
      notes,
      borrowerPhoto,
    } = req.body;

    const targetCustId = typeof customerId === 'object' && customerId !== null
      ? (customerId._id || customerId.id || customerId.clientId)
      : customerId;
    const isObjId = mongoose.Types.ObjectId.isValid(targetCustId);
    const customer = isObjId
      ? await Customer.findById(targetCustId)
      : await Customer.findOne({ clientId: targetCustId });

    const customerName = req.body.customerName || (customer ? customer.name : '');
    const customerPhone = req.body.customerPhone || (customer ? customer.phone : '');
    const customerArea = req.body.customerArea || (customer ? customer.area : '');

    const principalNum = Number(principal);
    const interestPercentNum = Number(interestPercent) || 0;
    const durationNum = Number(duration);
    const interestType = req.body.interestType || 'deduction';

    const calculatedInterest = Math.round((principalNum * interestPercentNum) / 100);
    const chargeAmountNum = req.body.chargeAmount !== undefined
      ? Number(req.body.chargeAmount)
      : calculatedInterest;

    // Disbursed (In-Hand Cash): Principal minus charge in deduction mode
    const disbursedAmount = interestType === 'deduction'
      ? Math.max(0, principalNum - chargeAmountNum)
      : principalNum;

    // Total Payable by borrower
    let totalPayable = req.body.totalPayable !== undefined
      ? Number(req.body.totalPayable)
      : (interestType === 'deduction' ? principalNum : principalNum + chargeAmountNum);

    let installmentAmount = req.body.installmentAmount !== undefined
      ? Number(req.body.installmentAmount)
      : Math.ceil(totalPayable / durationNum);

    const start = startDate ? new Date(startDate) : new Date();

    // Generate schedule
    const schedule = [];
    let currentDueDate = new Date(start);

    for (let i = 1; i <= durationNum; i++) {
      const nextDate = new Date(currentDueDate);
      if (financeType === 'daily') {
        nextDate.setDate(nextDate.getDate() + 1);
      } else if (financeType === 'weekly') {
        nextDate.setDate(nextDate.getDate() + 7);
      } else if (financeType === 'monthly') {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }

      currentDueDate = nextDate;

      // Adjust last installment for rounding if needed
      let instAmount = installmentAmount;
      if (i === durationNum) {
        const previousTotal = installmentAmount * (durationNum - 1);
        instAmount = totalPayable - previousTotal;
      }

      schedule.push({
        installmentNo: i,
        dueDate: new Date(currentDueDate),
        amount: instAmount,
        paidAmount: 0,
        status: 'pending',
        paidDate: null,
      });
    }

    const endDate = schedule[schedule.length - 1].dueDate;

    // Generate readable Loan Number
    const prefix = financeType === 'daily' ? 'D' : financeType === 'weekly' ? 'W' : 'M';
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const loanNo = req.body.loanNo || req.body.loanId || `LN-${prefix}${new Date().getFullYear().toString().slice(-2)}-${randomSuffix}`;
    const clientId = req.body.clientId || req.body._id || req.body.id || `loan_${Date.now()}`;
    const createdBy = req.user ? req.user._id : 'owner';

    // Idempotent sync check: If loan with clientId or loanNo already exists, return existing
    const existingLoan = await Loan.findOne({
      $or: [
        ...(clientId ? [{ clientId }] : []),
        ...(loanNo ? [{ loanNo }] : []),
      ],
    });
    if (existingLoan) {
      return res.status(200).json({
        success: true,
        loan: existingLoan,
        message: 'Loan already synced',
      });
    }

    const newLoan = await Loan.create({
      clientId,
      createdBy,
      loanNo,
      customerId: customer ? customer._id : targetCustId,
      customerName,
      customerPhone,
      customerArea,
      principal: principalNum,
      interestPercent: interestPercentNum,
      chargeAmount: chargeAmountNum,
      disbursedAmount,
      interestType,
      financeType,
      duration: durationNum,
      installmentAmount,
      totalPayable,
      startDate: start,
      endDate,
      status: 'active',
      latePenaltyRate: latePenaltyRate || 0,
      totalCollected: 0,
      remainingBalance: totalPayable,
      borrowerPhoto: borrowerPhoto || (customer ? customer.photoUrl : '') || '',
      schedule,
      notes: notes || '',
    });

    if (customer && borrowerPhoto && (!customer.photoUrl || customer.photoUrl !== borrowerPhoto)) {
      try {
        customer.photoUrl = borrowerPhoto;
        await customer.save();
      } catch (e) {
        console.warn('[LoanController] Could not update customer photoUrl:', e.message);
      }
    }

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      action: 'CREATE_LOAN',
      entity: 'Loan',
      entityId: newLoan._id.toString(),
      after: {
        loanNo: newLoan.loanNo,
        customer: customer.name,
        principal: newLoan.principal,
        financeType: newLoan.financeType,
        totalPayable: newLoan.totalPayable,
      },
    });

    await newLoan.populate('customerId', 'name phone area address photoUrl photo');

    res.status(201).json({
      success: true,
      message: 'Loan created successfully with installment schedule',
      loan: newLoan,
    });
  } catch (error) {
    next(error);
  }
};

// Helper calculation utilities ensuring identical formulas across views
export const calculateLoanProfit = (loan) => {
  if (!loan) return 0;

  const isClosed = loan.status === 'completed' || loan.status === 'closed' || (loan.remainingBalance != null && Number(loan.remainingBalance) <= 0);
  const interest = calculateLoanInterest(loan);
  const collected = Number(loan.totalCollected || 0);
  const payable = Number(loan.totalPayable || loan.principal || 0);

  // If loan is settled and completed, full interest/charge is realized profit
  if (isClosed) {
    if (Number(loan.profit) > 0) return Number(loan.profit);
    if (Number(loan.chargeAmount) > 0) return Number(loan.chargeAmount);
    return interest;
  }

  // For active loans: profit/charge earned and collected so far
  if (collected <= 0) return 0;
  if (payable > 0 && interest > 0) {
    return Math.min(interest, Math.round((collected / payable) * interest));
  }

  return 0;
};

export const calculateLoanInterest = (loan) => {
  if (!loan) return 0;
  if (Number(loan.chargeAmount) > 0) return Number(loan.chargeAmount);
  const pr = Number(loan.principal || 0);
  const payable = Number(loan.totalPayable || 0);
  if (payable > pr) return payable - pr;
  const disbursed = Number(loan.disbursedAmount || 0);
  if (disbursed > 0 && pr > disbursed) return pr - disbursed;
  if (Number(loan.interestPercent) > 0 && pr > 0) {
    return Math.round((pr * Number(loan.interestPercent)) / 100);
  }
  return 0;
};

// Detect legacy schedule mismatch where earlier non-final rows keep the standard amount (e.g. ₹200)
// while multiple subsequent non-final unpaid rows were lowered (e.g. ₹194) by prior extra-payment logic.
function needsLegacyScheduleRepair(loan) {
  if (!loan || !Array.isArray(loan.schedule) || loan.schedule.length < 3) return false;
  const firstAmt = Number(loan.schedule[0]?.amount) || 0;
  if (firstAmt <= 0) return false;

  const nonFinalRows = loan.schedule.slice(0, -1);
  const matchingFirstCount = nonFinalRows.filter((s) => Number(s.amount) === firstAmt).length;
  const mismatchedUnpaid = nonFinalRows.filter(
    (s) => s.status !== 'paid' && Number(s.amount) > 0 && Number(s.amount) !== firstAmt
  );
  const mismatchedAllUnpaid = loan.schedule.filter(
    (s) => s.status !== 'paid' && Number(s.amount) > 0 && Number(s.amount) !== firstAmt
  );

  return (
    matchingFirstCount >= 1 &&
    (mismatchedUnpaid.length >= 2 || (Number(loan.installmentAmount) !== firstAmt && mismatchedAllUnpaid.length >= 2))
  );
}

function rebalanceTailSchedule(loan, baseInstAmt, remainingBalance, excludedInstallmentNo = null) {
  const stepAmt = Math.max(1, Number(baseInstAmt) || 200);
  const targetRem = Math.max(0, Number(remainingBalance) || 0);
  const unpaidRows = (loan.schedule || [])
    .filter(
      (s) =>
        (excludedInstallmentNo === null || s.installmentNo !== excludedInstallmentNo) &&
        s.status !== 'paid' &&
        s.status !== 'holiday' &&
        s.status !== 'leave' &&
        s.status !== 'missed'
    )
    .sort((a, b) => a.installmentNo - b.installmentNo);

  let leftToAssign = targetRem;
  const keepNos = new Set();

  for (let i = 0; i < unpaidRows.length; i++) {
    const s = unpaidRows[i];
    if (leftToAssign <= 0) break;
    const alreadyPaid = Number(s.paidAmount) || 0;
    const normalDue = alreadyPaid > 0 ? Math.max(1, stepAmt - alreadyPaid) : stepAmt;
    const assignedDue = Math.min(leftToAssign, normalDue);
    s.amount = alreadyPaid + assignedDue;
    leftToAssign -= assignedDue;
    keepNos.add(s.installmentNo);
  }

  if (leftToAssign > 0 && keepNos.size > 0) {
    const lastKept = unpaidRows.filter((s) => keepNos.has(s.installmentNo)).pop();
    if (lastKept) {
      lastKept.amount = (Number(lastKept.amount) || 0) + leftToAssign;
    }
  }

  const dropNos = new Set(unpaidRows.filter((s) => !keepNos.has(s.installmentNo)).map((s) => s.installmentNo));
  if (dropNos.size > 0) {
    loan.schedule = loan.schedule.filter((s) => !dropNos.has(s.installmentNo));
  }

  loan.duration = loan.schedule.length;
  if (loan.schedule.length > 0) {
    loan.endDate = loan.schedule[loan.schedule.length - 1].dueDate;
  }
}

async function repairLegacyScheduleIfNeeded(loan) {
  if (!needsLegacyScheduleRepair(loan)) return false;

  const schedule = loan.schedule;
  const firstAmt = Number(schedule[0].amount);

  // Restore original principal and totalPayable if altered by prior logic
  const disbursed = Number(loan.disbursedAmount) || 0;
  const charge = Number(loan.chargeAmount) || 0;
  const it = loan.interestType || 'deduction';
  if (disbursed > 0) {
    const expectedPrincipal = it === 'deduction' ? disbursed + charge : disbursed;
    const expectedTotalPayable = it === 'deduction' ? expectedPrincipal : expectedPrincipal + charge;
    if (expectedPrincipal > 0) loan.principal = expectedPrincipal;
    if (expectedTotalPayable > 0) loan.totalPayable = expectedTotalPayable;
  } else {
    const expectedTotalPayable = schedule.length * firstAmt;
    if (expectedTotalPayable > 0) loan.totalPayable = expectedTotalPayable;
  }

  loan.installmentAmount = firstAmt;

  // Recompute collected amount from actual Payment documents (falling back to row sum if no Payment docs)
  const paymentQueryOr = [{ loanId: loan._id }];
  if (loan.clientId) paymentQueryOr.push({ loanId: loan.clientId });
  if (loan.loanNo) paymentQueryOr.push({ loanId: loan.loanNo });
  const payments = await Payment.find({ $or: paymentQueryOr }).select('amount notes paymentType');
  const sumPayments = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const paidSumFromRows = schedule.reduce((acc, s) => acc + (Number(s.paidAmount) || 0), 0);

  // Sync any Principal extra payment note onto its paid installment row if it was previously capped at due
  for (const p of payments) {
    if (p.paymentType === 'Principal' || /principal\s*payment|extra\s*payment/i.test(p.notes || '')) {
      const m = (p.notes || '').match(/#(\d+)/);
      if (m) {
        const instNo = Number(m[1]);
        const targetInst = schedule.find((s) => s.installmentNo === instNo && s.status === 'paid');
        if (targetInst && Number(targetInst.paidAmount || 0) <= Number(targetInst.amount || 0)) {
          targetInst.paidAmount = (Number(targetInst.paidAmount) || 0) + (Number(p.amount) || 0);
        }
      }
    }
  }

  loan.totalCollected = payments.length > 0 ? Math.max(sumPayments, paidSumFromRows) : paidSumFromRows;
  const newRemaining = Math.max(0, (Number(loan.totalPayable) || 0) - (Number(loan.totalCollected) || 0));
  loan.remainingBalance = newRemaining;

  rebalanceTailSchedule(loan, firstAmt, newRemaining, null);

  const now = new Date();
  loan.status = computeLoanStatusFromSchedule(loan, now);

  await loan.save();
  return true;
}

export const getLoans = async (req, res, next) => {
  try {
    const { status, financeType, customerId, search, excludeClosed, view } = req.query;
    let query = {};

    // Role-based Client / Loan Agent Isolation
    if (req.user?.role === 'client') {
      const clientCustIds = [req.user.customerId, req.user._id].filter(Boolean);
      const orList = [{ customerId: { $in: clientCustIds } }];
      if (req.user.phone) orList.push({ customerPhone: req.user.phone });
      query.$or = orList;
    } else if (
      (req.user?.role === 'loan_agent' || req.user?.role === 'agent') &&
      req.user.assignedAreas &&
      req.user.assignedAreas.length > 0
    ) {
      query.customerArea = { $in: req.user.assignedAreas };
    }

    if (view === 'closed' || status === 'closed' || status === 'completed') {
      query.$or = [
        { status: { $in: ['completed', 'closed'] } },
        { remainingBalance: { $lte: 0 } },
      ];
    } else if (excludeClosed === 'true' || excludeClosed === true || view === 'active' || status === 'active') {
      query.status = { $nin: ['completed', 'closed'] };
      query.remainingBalance = { $gt: 0 };
    } else if (status && status !== 'all') {
      query.status = status;
    }

    if (financeType && financeType !== 'all') {
      query.financeType = financeType;
    }

    if (customerId) {
      query.customerId = customerId;
    }

    let loans = await Loan.find(query)
      .populate('customerId', 'name phone area photoUrl')
      .sort({ createdAt: -1 });

    // Auto-repair any loan whose schedule was split to lower installment amounts by legacy extra-payment logic
    for (const l of loans) {
      if (needsLegacyScheduleRepair(l)) {
        await repairLegacyScheduleIfNeeded(l);
      }
    }

    // Ensure customer details are always populated and never undefined/Unknown
    loans = loans.map((l) => {
      const doc = l.toObject ? l.toObject() : l;
      if (!doc.customerId || typeof doc.customerId !== 'object') {
        doc.customerId = {
          _id: doc.customerId,
          name: doc.customerName || 'Borrower',
          phone: doc.customerPhone || '',
          area: doc.customerArea || '',
          photoUrl: doc.borrowerPhoto || '',
        };
      } else {
        if (!doc.customerId.name && doc.customerName) {
          doc.customerId.name = doc.customerName;
        }
        if (!doc.customerId.phone && doc.customerPhone) {
          doc.customerId.phone = doc.customerPhone;
        }
        if (!doc.customerId.area && doc.customerArea) {
          doc.customerId.area = doc.customerArea;
        }
        if (!doc.customerId.photoUrl && doc.borrowerPhoto) {
          doc.customerId.photoUrl = doc.borrowerPhoto;
        }
      }

      // Add computed financial properties
      const isClosed = doc.status === 'completed' || doc.status === 'closed' || (doc.remainingBalance != null && doc.remainingBalance <= 0);
      doc.isClosed = isClosed;
      doc.isActive = !isClosed;
      doc.computedProfit = calculateLoanProfit(doc);
      doc.computedInterest = calculateLoanInterest(doc);

      return doc;
    });

    if (search) {
      const searchLower = search.toLowerCase();
      loans = loans.filter((l) => {
        const custName = (l.customerId?.name || l.customerName || '').toLowerCase();
        const custPhone = l.customerId?.phone || l.customerPhone || '';
        const loanNo = (l.loanNo || '').toLowerCase();
        return (
          custName.includes(searchLower) ||
          custPhone.includes(searchLower) ||
          loanNo.includes(searchLower)
        );
      });
    }

    res.status(200).json({
      success: true,
      count: loans.length,
      loans,
    });
  } catch (error) {
    next(error);
  }
};

export const getLoanSummary = async (req, res, next) => {
  try {
    const { type } = req.query; // 'daily' | 'weekly' | 'monthly'
    let query = {};

    if (type && type !== 'all') {
      query.financeType = type;
    }

    // Role-based Client / Loan Agent Isolation
    if (req.user?.role === 'client') {
      const clientCustIds = [req.user.customerId, req.user._id].filter(Boolean);
      const orList = [{ customerId: { $in: clientCustIds } }];
      if (req.user.phone) orList.push({ customerPhone: req.user.phone });
      query.$or = orList;
    } else if (
      (req.user?.role === 'loan_agent' || req.user?.role === 'agent') &&
      req.user.assignedAreas &&
      req.user.assignedAreas.length > 0
    ) {
      query.customerArea = { $in: req.user.assignedAreas };
    }

    const rawLoans = await Loan.find(query)
      .populate('customerId', 'name phone area photoUrl')
      .sort({ createdAt: -1 });

    const loans = rawLoans.map((l) => {
      const doc = l.toObject ? l.toObject() : l;
      if (!doc.customerId || typeof doc.customerId !== 'object') {
        doc.customerId = {
          _id: doc.customerId,
          name: doc.customerName || 'Borrower',
          phone: doc.customerPhone || '',
          area: doc.customerArea || '',
          photoUrl: doc.borrowerPhoto || '',
        };
      }
      doc.computedInterest = calculateLoanInterest(doc);
      doc.computedProfit = calculateLoanProfit(doc);
      const isClosed = doc.status === 'completed' || doc.status === 'closed' || (doc.remainingBalance != null && doc.remainingBalance <= 0);
      doc.isClosed = isClosed;
      doc.isActive = !isClosed;
      return doc;
    });

    const activeLoans = loans.filter((l) => l.isActive);
    const closedLoans = loans.filter((l) => l.isClosed);

    const totalLoanAmount = loans.reduce((acc, l) => acc + (Number(l.principal) || 0), 0);
    const totalInterest = loans.reduce((acc, l) => acc + (Number(l.computedInterest) || 0), 0);
    const totalProfit = loans.reduce((acc, l) => acc + (Number(l.computedProfit) || 0), 0);
    const totalCollected = loans.reduce((acc, l) => acc + (Number(l.totalCollected) || 0), 0);
    const outstandingBalance = activeLoans.reduce((acc, l) => acc + Math.max(0, Number(l.remainingBalance) || 0), 0);

    const summary = {
      financeType: type || 'all',
      totalLoanAmount,
      totalInterest,
      totalProfit,
      totalCollected,
      outstandingBalance,
      activeLoansCount: activeLoans.length,
      closedLoansCount: closedLoans.length,
      totalLoansCount: loans.length,
    };

    // Detailed breakdown lists for modal popups
    const breakdowns = {
      loanAmount: loans.map((l) => ({
        loanNo: l.loanNo,
        customerName: l.customerId?.name || l.customerName,
        phone: l.customerId?.phone || l.customerPhone,
        area: l.customerId?.area || l.customerArea,
        principal: Number(l.principal) || 0,
        status: l.status,
        isActive: l.isActive,
      })),
      interest: loans.map((l) => ({
        loanNo: l.loanNo,
        customerName: l.customerId?.name || l.customerName,
        phone: l.customerId?.phone || l.customerPhone,
        area: l.customerId?.area || l.customerArea,
        principal: Number(l.principal) || 0,
        interest: Number(l.computedInterest) || 0,
        status: l.status,
        isActive: l.isActive,
      })),
      profit: loans.map((l) => ({
        loanNo: l.loanNo,
        customerName: l.customerId?.name || l.customerName,
        phone: l.customerId?.phone || l.customerPhone,
        area: l.customerId?.area || l.customerArea,
        profit: Number(l.computedProfit) || 0,
        totalCollected: Number(l.totalCollected) || 0,
        status: l.status,
        isActive: l.isActive,
      })),
      collected: loans
        .filter((l) => Number(l.totalCollected) > 0)
        .map((l) => ({
          loanNo: l.loanNo,
          customerName: l.customerId?.name || l.customerName,
          phone: l.customerId?.phone || l.customerPhone,
          area: l.customerId?.area || l.customerArea,
          totalCollected: Number(l.totalCollected) || 0,
          totalPayable: Number(l.totalPayable) || 0,
          status: l.status,
          isActive: l.isActive,
        })),
      outstanding: activeLoans.map((l) => ({
        loanNo: l.loanNo,
        customerName: l.customerId?.name || l.customerName,
        phone: l.customerId?.phone || l.customerPhone,
        area: l.customerId?.area || l.customerArea,
        remainingBalance: Number(l.remainingBalance) || 0,
        totalPayable: Number(l.totalPayable) || 0,
        status: l.status,
      })),
      active: activeLoans,
    };

    res.status(200).json({
      success: true,
      summary,
      breakdowns,
      activeLoans,
      closedLoans,
    });
  } catch (error) {
    next(error);
  }
};

export const getLoanOverallSummary = async (req, res, next) => {
  try {
    let query = {};

    // Role-based Client / Loan Agent Isolation
    if (req.user?.role === 'client') {
      const clientCustIds = [req.user.customerId, req.user._id].filter(Boolean);
      const orList = [{ customerId: { $in: clientCustIds } }];
      if (req.user.phone) orList.push({ customerPhone: req.user.phone });
      query.$or = orList;
    } else if (
      (req.user?.role === 'loan_agent' || req.user?.role === 'agent') &&
      req.user.assignedAreas &&
      req.user.assignedAreas.length > 0
    ) {
      query.customerArea = { $in: req.user.assignedAreas };
    }

    const rawLoans = await Loan.find(query)
      .populate('customerId', 'name phone area photoUrl')
      .sort({ createdAt: -1 });

    const loans = rawLoans.map((l) => {
      const doc = l.toObject ? l.toObject() : l;
      if (!doc.customerId || typeof doc.customerId !== 'object') {
        doc.customerId = {
          _id: doc.customerId,
          name: doc.customerName || 'Borrower',
          phone: doc.customerPhone || '',
          area: doc.customerArea || '',
          photoUrl: doc.borrowerPhoto || '',
        };
      }
      doc.computedInterest = calculateLoanInterest(doc);
      doc.computedProfit = calculateLoanProfit(doc);
      const isClosed = doc.status === 'completed' || doc.status === 'closed' || (doc.remainingBalance != null && doc.remainingBalance <= 0);
      doc.isClosed = isClosed;
      doc.isActive = !isClosed;
      return doc;
    });

    const computeMetricsForType = (typeList) => {
      const active = typeList.filter((l) => l.isActive);
      const closed = typeList.filter((l) => l.isClosed);
      return {
        totalLoanAmount: typeList.reduce((acc, l) => acc + (Number(l.principal) || 0), 0),
        totalInterest: typeList.reduce((acc, l) => acc + (Number(l.computedInterest) || 0), 0),
        totalProfit: typeList.reduce((acc, l) => acc + (Number(l.computedProfit) || 0), 0),
        totalCollected: typeList.reduce((acc, l) => acc + (Number(l.totalCollected) || 0), 0),
        outstandingBalance: active.reduce((acc, l) => acc + Math.max(0, Number(l.remainingBalance) || 0), 0),
        activeLoansCount: active.length,
        closedLoansCount: closed.length,
        totalLoansCount: typeList.length,
      };
    };

    const dailyLoans = loans.filter((l) => l.financeType === 'daily');
    const weeklyLoans = loans.filter((l) => l.financeType === 'weekly');
    const monthlyLoans = loans.filter((l) => l.financeType === 'monthly');

    const byType = {
      daily: computeMetricsForType(dailyLoans),
      weekly: computeMetricsForType(weeklyLoans),
      monthly: computeMetricsForType(monthlyLoans),
    };

    const overall = {
      totalLoanAmount: byType.daily.totalLoanAmount + byType.weekly.totalLoanAmount + byType.monthly.totalLoanAmount,
      totalInterest: byType.daily.totalInterest + byType.weekly.totalInterest + byType.monthly.totalInterest,
      totalProfit: byType.daily.totalProfit + byType.weekly.totalProfit + byType.monthly.totalProfit,
      totalCollected: byType.daily.totalCollected + byType.weekly.totalCollected + byType.monthly.totalCollected,
      outstandingBalance: byType.daily.outstandingBalance + byType.weekly.outstandingBalance + byType.monthly.outstandingBalance,
      activeLoansCount: byType.daily.activeLoansCount + byType.weekly.activeLoansCount + byType.monthly.activeLoansCount,
      closedLoansCount: byType.daily.closedLoansCount + byType.weekly.closedLoansCount + byType.monthly.closedLoansCount,
      totalLoansCount: loans.length,
    };

    res.status(200).json({
      success: true,
      overall,
      byType,
      activeLoans: loans.filter((l) => l.isActive),
      closedLoans: loans.filter((l) => l.isClosed),
    });
  } catch (error) {
    next(error);
  }
};

export const getLoanById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const isObjId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjId ? { _id: id } : { $or: [{ clientId: id }, { loanNo: id }] };
    const loan = await Loan.findOne(query).populate(
      'customerId',
      'name phone address area photoUrl guarantor'
    );

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found',
      });
    }

    await repairLegacyScheduleIfNeeded(loan);

    // Role-based Client Isolation
    if (req.user?.role === 'client') {
      const isOwner =
        (loan.customerId && (String(loan.customerId._id || loan.customerId) === String(req.user.customerId) || String(loan.customerId._id || loan.customerId) === String(req.user._id))) ||
        (loan.customerPhone && loan.customerPhone === req.user.phone);
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only view your own loan details.',
        });
      }
    }

    const payments = await Payment.find({
      $or: [{ loanId: loan._id }, { loanId: loan.clientId }, { loanId: loan.loanNo }],
    })
      .populate('collectedBy', 'name role')
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      loan,
      payments,
    });
  } catch (error) {
    next(error);
  }
};

export const updateLoanStatus = async (req, res, next) => {
  try {
    if (req.user?.role === 'client') {
      return res.status(403).json({ success: false, message: 'Access denied: Clients cannot modify loan status.' });
    }
    const { status, notes } = req.body;
    const id = req.params.id;
    const isObjId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjId ? { _id: id } : { $or: [{ clientId: id }, { loanNo: id }] };
    const loan = await Loan.findOne(query);

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found',
      });
    }

    // Role-based Client Isolation
    if (req.user?.role === 'client') {
      const isOwner =
        (loan.customerId && (String(loan.customerId._id || loan.customerId) === String(req.user.customerId) || String(loan.customerId._id || loan.customerId) === String(req.user._id))) ||
        (loan.customerPhone && loan.customerPhone === req.user.phone);
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only view your own loan details.',
        });
      }
    }

    const before = loan.toObject();
    loan.status = status || loan.status;
    if (notes) loan.notes = notes;
    await loan.save();

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      action: 'UPDATE_LOAN_STATUS',
      entity: 'Loan',
      entityId: loan._id.toString(),
      before: { status: before.status },
      after: { status: loan.status },
    });

    res.status(200).json({
      success: true,
      message: 'Loan status updated',
      loan,
    });
  } catch (error) {
    next(error);
  }
};

export const updateLoan = async (req, res, next) => {
  try {
    if (req.user?.role === 'client') {
      return res.status(403).json({ success: false, message: 'Access denied: Clients cannot update loan terms.' });
    }
    const id = req.params.id;
    const isObjId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjId ? { _id: id } : { $or: [{ clientId: id }, { loanNo: id }] };
    const loan = await Loan.findOne(query);
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found',
      });
    }

    // Role-based Client Isolation
    if (req.user?.role === 'client') {
      const isOwner =
        (loan.customerId && (String(loan.customerId._id || loan.customerId) === String(req.user.customerId) || String(loan.customerId._id || loan.customerId) === String(req.user._id))) ||
        (loan.customerPhone && loan.customerPhone === req.user.phone);
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only view your own loan details.',
        });
      }
    }

    const before = loan.toObject();
    const {
      principal,
      interestPercent,
      chargeAmount,
      interestType,
      financeType,
      duration,
      installmentAmount,
      totalPayable,
      startDate,
      endDate,
      status,
      borrowerPhoto,
      notes,
      latePenaltyRate,
    } = req.body;

    if (principal !== undefined) loan.principal = Number(principal);
    if (interestPercent !== undefined) loan.interestPercent = Number(interestPercent);
    if (chargeAmount !== undefined) loan.chargeAmount = Number(chargeAmount);
    if (interestType !== undefined) loan.interestType = interestType;
    if (financeType !== undefined) loan.financeType = financeType;
    if (duration !== undefined) loan.duration = Number(duration);
    if (latePenaltyRate !== undefined) loan.latePenaltyRate = Number(latePenaltyRate);
    if (notes !== undefined) loan.notes = notes;
    if (borrowerPhoto !== undefined) loan.borrowerPhoto = borrowerPhoto;
    if (req.body.customerName !== undefined) loan.customerName = req.body.customerName;
    if (req.body.customerPhone !== undefined) loan.customerPhone = req.body.customerPhone;
    if (req.body.customerArea !== undefined) loan.customerArea = req.body.customerArea;

    // Recalculate financial amounts
    const p = Number(loan.principal) || 0;
    const c = Number(loan.chargeAmount) || 0;
    const it = loan.interestType || 'deduction';

    // Disbursed
    loan.disbursedAmount = it === 'deduction' ? Math.max(0, p - c) : p;

    // Total payable
    if (totalPayable !== undefined) {
      loan.totalPayable = Number(totalPayable);
    } else {
      loan.totalPayable = it === 'deduction' ? p : p + c;
    }

    // Installment amount
    if (installmentAmount !== undefined) {
      loan.installmentAmount = Number(installmentAmount);
    } else if (loan.duration > 0) {
      loan.installmentAmount = Math.ceil(loan.totalPayable / loan.duration);
    }

    // Recalculate remaining balance accurately using existing repayments
    const collected = Number(loan.totalCollected || 0);
    loan.remainingBalance = Math.max(0, loan.totalPayable - collected);

    // Status synchronization
    if (status) {
      loan.status = status;
    } else if (loan.remainingBalance === 0 && collected > 0) {
      loan.status = 'completed';
    } else if (loan.remainingBalance > 0 && loan.status === 'completed') {
      loan.status = 'active';
    }

    // Dates
    if (startDate) {
      loan.startDate = new Date(startDate);
    }

    if (endDate) {
      loan.endDate = new Date(endDate);
    } else if (loan.startDate && loan.duration) {
      const calcEnd = new Date(loan.startDate);
      const dur = Number(loan.duration);
      if (loan.financeType === 'daily') calcEnd.setDate(calcEnd.getDate() + dur);
      else if (loan.financeType === 'weekly') calcEnd.setDate(calcEnd.getDate() + dur * 7);
      else if (loan.financeType === 'monthly') calcEnd.setMonth(calcEnd.getMonth() + dur);
      loan.endDate = calcEnd;
    }

    // If borrowerPhoto was updated, sync to customer record
    if (borrowerPhoto && loan.customerId) {
      try {
        await Customer.findByIdAndUpdate(loan.customerId, { photoUrl: borrowerPhoto });
      } catch (e) {
        console.warn('Could not update customer photo on loan edit:', e.message);
      }
    }

    await loan.save();

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      action: 'UPDATE_LOAN',
      entity: 'Loan',
      entityId: loan._id.toString(),
      before: {
        principal: before.principal,
        totalPayable: before.totalPayable,
        status: before.status,
      },
      after: {
        principal: loan.principal,
        totalPayable: loan.totalPayable,
        status: loan.status,
      },
    });

    await loan.populate('customerId', 'name phone area address photoUrl photo');

    res.status(200).json({
      success: true,
      message: 'Loan updated successfully',
      loan,
    });
  } catch (error) {
    next(error);
  }
};

export const declareLoanHoliday = async (req, res, next) => {
  try {
    const id = req.params.id;
    const isObjId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjId ? { _id: id } : { $or: [{ clientId: id }, { loanNo: id }] };
    const loan = await Loan.findOne(query);
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found',
      });
    }

    // Role-based Client Isolation
    if (req.user?.role === 'client') {
      const isOwner =
        (loan.customerId && (String(loan.customerId._id || loan.customerId) === String(req.user.customerId) || String(loan.customerId._id || loan.customerId) === String(req.user._id))) ||
        (loan.customerPhone && loan.customerPhone === req.user.phone);
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only view your own loan details.',
        });
      }
    }

    const { date, installmentNo, type = 'holiday', reason = '' } = req.body;
    const dateStr = date ? new Date(date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    if (!Array.isArray(loan.holidays)) {
      loan.holidays = [];
    }

    const existingIndex = loan.holidays.findIndex((h) => {
      if (installmentNo && h.installmentNo === Number(installmentNo)) return true;
      if (h.date && h.date.split('T')[0] === dateStr) return true;
      return false;
    });

    const newHolidayItem = {
      date: dateStr,
      installmentNo: installmentNo ? Number(installmentNo) : undefined,
      type: type === 'missed' ? 'missed' : 'holiday',
      reason: reason || (type === 'missed' ? 'Missed Collection / தவறிய நாள்' : 'Holiday / விடுமுறை'),
      createdAt: new Date(),
    };

    if (existingIndex >= 0) {
      loan.holidays[existingIndex] = newHolidayItem;
    } else {
      loan.holidays.push(newHolidayItem);
    }

    if (Array.isArray(loan.schedule)) {
      loan.schedule.forEach((inst) => {
        const instDate = inst.dueDate ? new Date(inst.dueDate).toISOString().split('T')[0] : '';
        if ((installmentNo && inst.installmentNo === Number(installmentNo)) || instDate === dateStr) {
          if (inst.status !== 'paid') {
            inst.status = newHolidayItem.type;
            inst.holidayReason = newHolidayItem.reason;
          }
        }
      });
    }

    await loan.save();

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      action: 'DECLARE_HOLIDAY',
      entity: 'Loan',
      entityId: loan._id.toString(),
      after: newHolidayItem,
    });

    await loan.populate('customerId', 'name phone area address photoUrl photo');

    res.status(200).json({
      success: true,
      message: `${newHolidayItem.type === 'missed' ? 'Missed Day' : 'Holiday'} recorded successfully`,
      loan,
    });
  } catch (error) {
    next(error);
  }
};

export const removeLoanHoliday = async (req, res, next) => {
  try {
    const id = req.params.id;
    const isObjId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjId ? { _id: id } : { $or: [{ clientId: id }, { loanNo: id }] };
    const loan = await Loan.findOne(query);
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found',
      });
    }

    // Role-based Client Isolation
    if (req.user?.role === 'client') {
      const isOwner =
        (loan.customerId && (String(loan.customerId._id || loan.customerId) === String(req.user.customerId) || String(loan.customerId._id || loan.customerId) === String(req.user._id))) ||
        (loan.customerPhone && loan.customerPhone === req.user.phone);
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only view your own loan details.',
        });
      }
    }

    const { date, installmentNo } = req.body;
    const dateStr = date ? new Date(date).toISOString().split('T')[0] : '';

    if (Array.isArray(loan.holidays)) {
      loan.holidays = loan.holidays.filter((h) => {
        if (installmentNo && h.installmentNo === Number(installmentNo)) return false;
        if (dateStr && h.date && h.date.split('T')[0] === dateStr) return false;
        return true;
      });
    }

    if (Array.isArray(loan.schedule)) {
      const now = new Date();
      loan.schedule.forEach((inst) => {
        const instDate = inst.dueDate ? new Date(inst.dueDate).toISOString().split('T')[0] : '';
        if ((installmentNo && inst.installmentNo === Number(installmentNo)) || instDate === dateStr) {
          if (inst.status === 'holiday' || inst.status === 'leave' || inst.status === 'missed') {
            if (inst.original_due_date) {
              inst.dueDate = inst.original_due_date;
            }
            const effStr = getISTDateStr(getEffectiveDueDate(inst));
            const todayStr = getISTDateStr(now);
            inst.status = effStr && effStr < todayStr ? 'overdue' : 'pending';
            inst.holidayReason = '';
            inst.holiday_reason = '';
            inst.original_due_date = null;
            inst.rescheduled_due_date = null;
            inst.adjusted_by = '';
            inst.adjusted_at = null;
          }
        }
      });
    }

    await loan.save();

    await loan.populate('customerId', 'name phone area address photoUrl photo');

    res.status(200).json({
      success: true,
      message: 'Holiday/Missed declaration removed',
      loan,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteLoan = async (req, res, next) => {
  try {
    if (req.user?.role === 'client') {
      return res.status(403).json({ success: false, message: 'Access denied: Clients cannot delete loans.' });
    }
    const id = req.params.id;
    const isObjId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjId ? { _id: id } : { $or: [{ clientId: id }, { loanNo: id }] };
    const loan = await Loan.findOne(query);
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found',
      });
    }

    // Role-based Client Isolation
    if (req.user?.role === 'client') {
      const isOwner =
        (loan.customerId && (String(loan.customerId._id || loan.customerId) === String(req.user.customerId) || String(loan.customerId._id || loan.customerId) === String(req.user._id))) ||
        (loan.customerPhone && loan.customerPhone === req.user.phone);
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only view your own loan details.',
        });
      }
    }

    const before = loan.toObject();

    // Remove associated payments
    await Payment.deleteMany({
      $or: [{ loanId: loan._id }, { loanId: loan.clientId }, { loanId: loan.loanNo }],
    });

    // Delete the loan
    await Loan.findOneAndDelete(query);

    // Audit log
    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      action: 'DELETE_LOAN',
      entity: 'Loan',
      entityId: loan._id.toString(),
      before: {
        loanNo: before.loanNo,
        customerId: before.customerId,
        principal: before.principal,
        totalPayable: before.totalPayable,
        status: before.status,
      },
    });

    res.status(200).json({
      success: true,
      message: `Loan ${before.loanNo} successfully deleted`,
    });
  } catch (error) {
    next(error);
  }
};

export const recordInstallmentAction = async (req, res, next) => {
  try {
    if (req.user?.role === 'client') {
      return res.status(403).json({ success: false, message: 'Access denied: Clients cannot perform installment actions.' });
    }

    const { id } = req.params;
    const isObjId = mongoose.Types.ObjectId.isValid(id);
    const loan = isObjId
      ? await Loan.findById(id).populate('customerId')
      : await Loan.findOne({ $or: [{ clientId: id }, { loanNo: id }] }).populate('customerId');

    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found / கடன் கணக்கு கிடைக்கவில்லை' });
    }

    await repairLegacyScheduleIfNeeded(loan);

    const {
      action = 'pay', // 'pay' | 'holiday' | 'leave' | 'reverse'
      installmentNo,
      amount,
      mode = 'cash',
      paidDate,
      notes = '',
      skipOption = 'move_next', // 'move_next' | 'extend_end' | 'skip_only'
      reason = '',
    } = req.body;

    // Helper: find target installment
    let inst = null;
    if (installmentNo !== undefined && installmentNo !== null) {
      inst = loan.schedule.find((s) => s.installmentNo === Number(installmentNo));
    }
    if (!inst && paidDate) {
      const pDateStr = new Date(paidDate).toISOString().slice(0, 10);
      inst = loan.schedule.find((s) => s.dueDate && new Date(s.dueDate).toISOString().slice(0, 10) === pDateStr);
    }
    if (!inst) {
      // Find first unpaid installment
      inst = loan.schedule.find((s) => s.status !== 'paid');
    }

    if (!inst && action !== 'reverse') {
      return res.status(400).json({ success: false, message: 'No pending installment found for this loan' });
    }

    const paymentDate = paidDate ? new Date(paidDate) : new Date();

    // ---------------------------------------------------------------------------
    // ACTION: REVERSE (Correct / undo a previously paid installment)
    // ---------------------------------------------------------------------------
    if (action === 'reverse') {
      if (!inst || inst.status !== 'paid') {
        return res.status(400).json({ success: false, message: 'Target installment is not marked as paid / இத்தவணை செலுத்தப்படவில்லை' });
      }

      const revAmt = Number(inst.paidAmount || inst.amount || 0);

      // Revert installment fields
      const isPastDue = new Date(inst.dueDate) < new Date();
      inst.status = isPastDue ? 'overdue' : 'pending';
      inst.paidAmount = 0;
      inst.paidDate = null;

      // Find and delete/adjust matching payment document(s) (handles split Installment + Principal rows)
      const matchingPayments = await Payment.find({
        loanId: loan._id,
      }).sort({ date: -1, createdAt: -1 });

      let remainingToRevert = revAmt;
      let anyDeleted = false;
      for (const p of matchingPayments) {
        if (remainingToRevert <= 0) break;
        const pNotes = p.notes || '';
        const matchesInst = new RegExp(`(?:installment|inst)\\s*#?${inst.installmentNo}\\b|#${inst.installmentNo}\\b`, 'i').test(pNotes);
        if (matchesInst) {
          const pAmt = Number(p.amount) || 0;
          if (pAmt <= remainingToRevert) {
            await Payment.findByIdAndDelete(p._id);
            remainingToRevert -= pAmt;
            anyDeleted = true;
          } else {
            p.amount = pAmt - remainingToRevert;
            await p.save();
            remainingToRevert = 0;
            anyDeleted = true;
          }
        }
      }

      // If no notes match, find by amount
      if (!anyDeleted) {
        for (const p of matchingPayments) {
          if (Number(p.amount) === revAmt) {
            await Payment.findByIdAndDelete(p._id);
            anyDeleted = true;
            break;
          }
        }
      }

      loan.totalCollected = Math.max(0, (loan.totalCollected || 0) - revAmt);
      loan.remainingBalance = Math.min(loan.totalPayable, (loan.totalPayable || 0) - loan.totalCollected);

      // Restore any reduced tail dates so unpaid schedule sum matches remainingBalance at the same installment amount
      const baseInstAmt = Math.max(1, Number(loan.installmentAmount) || Number(inst.amount) || 200);
      const unpaidRows = loan.schedule.filter(
        (s) => s.status !== 'paid' && s.status !== 'holiday' && s.status !== 'leave' && s.status !== 'missed'
      );
      const unpaidSum = unpaidRows.reduce(
        (acc, s) => acc + Math.max(0, (Number(s.amount) || 0) - (Number(s.paidAmount) || 0)),
        0
      );
      let deficit = Math.max(0, loan.remainingBalance - unpaidSum);

      if (deficit > 0) {
        for (const s of unpaidRows) {
          if (deficit <= 0) break;
          const curDue = Math.max(0, (Number(s.amount) || 0) - (Number(s.paidAmount) || 0));
          if (curDue < baseInstAmt) {
            const topUp = Math.min(deficit, baseInstAmt - curDue);
            s.amount = (Number(s.amount) || 0) + topUp;
            deficit -= topUp;
          }
        }
      }

      const getNextDueDate = (prevDate, type) => {
        const d = new Date(prevDate);
        if (type === 'weekly') d.setDate(d.getDate() + 7);
        else if (type === 'monthly') d.setMonth(d.getMonth() + 1);
        else d.setDate(d.getDate() + 1);
        return d;
      };

      while (deficit > 0) {
        const lastRow = loan.schedule[loan.schedule.length - 1];
        const nextNo = (lastRow?.installmentNo || loan.schedule.length) + 1;
        const nextDue = getNextDueDate(lastRow?.dueDate || new Date(), loan.financeType);
        const slotAmt = Math.min(deficit, baseInstAmt);
        loan.schedule.push({
          installmentNo: nextNo,
          dueDate: nextDue,
          amount: slotAmt,
          paidAmount: 0,
          status: nextDue < new Date() ? 'overdue' : 'pending',
          paidDate: null,
        });
        deficit -= slotAmt;
      }

      loan.duration = loan.schedule.length;
      if (loan.schedule.length > 0) {
        loan.endDate = loan.schedule[loan.schedule.length - 1].dueDate;
      }

      loan.status = loan.remainingBalance <= 0
        ? 'completed'
        : loan.schedule.some((s) => s.status === 'overdue')
          ? 'overdue'
          : 'active';

      await loan.save();

      try {
        await AuditLog.create({
          userId: req.user?._id || 'owner',
          userName: req.user?.name || 'Owner',
          action: 'REVERSE_INSTALLMENT',
          entity: 'Loan',
          entityId: loan._id.toString(),
          after: {
            installmentNo: inst.installmentNo,
            revertedAmount: revAmt,
            remainingBalance: loan.remainingBalance,
          },
        });
      } catch (e) {}

      return res.status(200).json({
        success: true,
        message: 'Installment reversed successfully / தவணை ரத்து செய்யப்பட்டது',
        loan,
      });
    }

    // ---------------------------------------------------------------------------
    // ACTION: UNDO HOLIDAY / LEAVE
    // ---------------------------------------------------------------------------
    if (action === 'undo_holiday_leave') {
      if (inst.status !== 'holiday' && inst.status !== 'leave') {
        return res.status(400).json({
          success: false,
          message: `Installment #${inst.installmentNo} is not marked as Holiday or Leave.`,
        });
      }

      const prevStatus = inst.status;
      const beforeSnapshot = {
        installmentNo: inst.installmentNo,
        status: inst.status,
        dueDate: inst.dueDate,
        original_due_date: inst.original_due_date || null,
        rescheduled_due_date: inst.rescheduled_due_date || null,
        holiday_reason: inst.holiday_reason || inst.holidayReason || '',
        duration: loan.duration,
        scheduleLength: loan.schedule.length,
      };

      if (prevStatus === 'leave') {
        const linkedIdx = loan.schedule.findIndex(
          (s) => Number(s.appended_for_inst_no) === Number(inst.installmentNo)
        );
        if (linkedIdx !== -1) {
          if (loan.schedule[linkedIdx].status === 'paid') {
            return res.status(400).json({
              success: false,
              message: `Cannot undo Leave: appended installment #${loan.schedule[linkedIdx].installmentNo} has already been paid.`,
            });
          }
          loan.schedule.splice(linkedIdx, 1);
        } else if (loan.schedule.length > 1) {
          const lastIdx = loan.schedule.length - 1;
          const lastItem = loan.schedule[lastIdx];
          if (
            lastItem.installmentNo !== inst.installmentNo &&
            lastItem.status !== 'paid' &&
            Number(lastItem.amount) === Number(inst.amount)
          ) {
            loan.schedule.splice(lastIdx, 1);
          }
        }
        loan.duration = loan.schedule.length;
        const maxDateAfter = getScheduleMaxDueDate(loan.schedule);
        if (maxDateAfter) loan.endDate = maxDateAfter;
      }

      if (inst.original_due_date) {
        inst.dueDate = inst.original_due_date;
      }
      inst.original_due_date = null;
      inst.rescheduled_due_date = null;
      inst.holiday_reason = '';
      inst.holidayReason = '';
      inst.adjusted_by = '';
      inst.adjusted_at = null;

      const todayStr = getISTDateStr(new Date());
      const restoredStr = getISTDateStr(inst.dueDate);
      inst.status = restoredStr && restoredStr < todayStr
        ? 'overdue'
        : Number(inst.paidAmount) > 0
        ? 'partial'
        : 'pending';

      const maxDate = getScheduleMaxDueDate(loan.schedule);
      if (maxDate) loan.endDate = maxDate;
      loan.status = computeLoanStatusFromSchedule(loan);

      await loan.save();

      try {
        await AuditLog.create({
          userId: req.user?._id || null,
          userName: req.user?.name || 'Owner',
          action: 'INSTALLMENT_HOLIDAY_LEAVE_UNDO',
          entity: 'Loan',
          entityId: loan._id.toString(),
          before: beforeSnapshot,
          after: {
            installmentNo: inst.installmentNo,
            status: inst.status,
            dueDate: inst.dueDate,
            duration: loan.duration,
            scheduleLength: loan.schedule.length,
          },
        });
      } catch (auditErr) {
        console.warn('AuditLog create warning (undo_holiday_leave):', auditErr.message);
      }

      await loan.populate('customerId', 'name phone area address photoUrl photo');
      return res.status(200).json({
        success: true,
        message: `Installment #${inst.installmentNo} restored (${prevStatus} undone).`,
        loan,
      });
    }

    // ---------------------------------------------------------------------------
    // ACTION: PER-INSTALLMENT HOLIDAY (NEW DUE DATE) OR LEAVE (APPEND AT END)
    // ---------------------------------------------------------------------------
    const reqNewDueDate = req.body.newDueDate;
    const reqRescheduleMode = req.body.rescheduleMode;
    if (
      (action === 'holiday' && reqNewDueDate !== undefined) ||
      reqRescheduleMode === 'single_holiday' ||
      (action === 'leave' && reqRescheduleMode === 'leave_append')
    ) {
      if (inst.status === 'paid') {
        return res.status(400).json({
          success: false,
          message: 'Cannot apply Holiday / Leave on an already Paid installment.',
        });
      }

      const noteReason = (reason || notes || '').trim();
      const actorName = req.user?.name || String(req.user?._id || 'Owner');
      const nowTime = new Date();
      const todayStr = getISTDateStr(nowTime);
      const origDue = inst.original_due_date || inst.dueDate;
      const beforeSnapshot = {
        installmentNo: inst.installmentNo,
        status: inst.status,
        dueDate: inst.dueDate,
        duration: loan.duration,
        scheduleLength: loan.schedule.length,
      };

      if (action === 'holiday') {
        if (!reqNewDueDate) {
          return res.status(400).json({
            success: false,
            message: 'New due date is required for Holiday.',
          });
        }
        const parsedNewDue = new Date(reqNewDueDate);
        if (Number.isNaN(parsedNewDue.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid new due date.',
          });
        }

        const newDueStr = getISTDateStr(parsedNewDue);
        const origStr = getISTDateStr(origDue);

        if (newDueStr < todayStr) {
          return res.status(400).json({
            success: false,
            message: 'New due date cannot be earlier than today.',
          });
        }
        if (origStr && newDueStr <= origStr) {
          return res.status(400).json({
            success: false,
            message: 'New due date must be after the original due date.',
          });
        }

        inst.original_due_date = origDue;
        inst.rescheduled_due_date = parsedNewDue;
        inst.dueDate = parsedNewDue;
        inst.status = 'holiday';
        inst.holiday_reason = noteReason;
        inst.holidayReason = noteReason;
        inst.adjusted_by = actorName;
        inst.adjusted_at = nowTime;

        const maxDate = getScheduleMaxDueDate(loan.schedule);
        if (maxDate) loan.endDate = maxDate;
        loan.status = computeLoanStatusFromSchedule(loan, nowTime);

        await loan.save();

        try {
          await AuditLog.create({
            userId: req.user?._id || null,
            userName: actorName,
            action: 'INSTALLMENT_HOLIDAY_APPLY',
            entity: 'Loan',
            entityId: loan._id.toString(),
            before: beforeSnapshot,
            after: {
              installmentNo: inst.installmentNo,
              status: inst.status,
              original_due_date: inst.original_due_date,
              rescheduled_due_date: inst.rescheduled_due_date,
              holiday_reason: inst.holiday_reason,
              adjusted_by: actorName,
              adjusted_at: nowTime,
            },
          });
        } catch (auditErr) {
          console.warn('AuditLog create warning (holiday):', auditErr.message);
        }

        await loan.populate('customerId', 'name phone area address photoUrl photo');
        return res.status(200).json({
          success: true,
          message: `Installment #${inst.installmentNo} marked Holiday & moved to ${newDueStr}.`,
          loan,
        });
      }

      // action === 'leave' (append new installment at end of schedule)
      if (inst.status === 'leave') {
        return res.status(400).json({
          success: false,
          message: `Installment #${inst.installmentNo} is already marked as Leave.`,
        });
      }

      inst.original_due_date = origDue;
      inst.rescheduled_due_date = null;
      inst.status = 'leave';
      inst.holiday_reason = noteReason;
      inst.holidayReason = noteReason;
      inst.adjusted_by = actorName;
      inst.adjusted_at = nowTime;

      const maxInstNo = loan.schedule.reduce((m, s) => Math.max(m, Number(s.installmentNo) || 0), 0);
      const lastScheduleDue = getScheduleMaxDueDate(loan.schedule) || inst.dueDate || nowTime;
      const appendedDue = computeNextPeriodDueDate(lastScheduleDue, loan.financeType);

      loan.schedule.push({
        installmentNo: maxInstNo + 1,
        dueDate: appendedDue,
        amount: inst.amount,
        paidAmount: 0,
        status: 'pending',
        appended_for_inst_no: inst.installmentNo,
      });

      loan.duration = loan.schedule.length;
      loan.endDate = appendedDue;
      loan.status = computeLoanStatusFromSchedule(loan, nowTime);

      await loan.save();

      try {
        await AuditLog.create({
          userId: req.user?._id || null,
          userName: actorName,
          action: 'INSTALLMENT_LEAVE_APPLY',
          entity: 'Loan',
          entityId: loan._id.toString(),
          before: beforeSnapshot,
          after: {
            installmentNo: inst.installmentNo,
            status: inst.status,
            holiday_reason: inst.holiday_reason,
            adjusted_by: actorName,
            adjusted_at: nowTime,
            appendedInstallmentNo: maxInstNo + 1,
            appendedDueDate: appendedDue,
            duration: loan.duration,
          },
        });
      } catch (auditErr) {
        console.warn('AuditLog create warning (leave):', auditErr.message);
      }

      await loan.populate('customerId', 'name phone area address photoUrl photo');
      return res.status(200).json({
        success: true,
        message: `Installment #${inst.installmentNo} marked Leave & installment #${maxInstNo + 1} added at end of schedule.`,
        loan,
      });
    }

    // ---------------------------------------------------------------------------
    // ACTION: HOLIDAY / LEAVE (LEGACY PENCIL MODAL FLOW)
    // ---------------------------------------------------------------------------
    if (action === 'holiday' || action === 'leave') {
      const modeType = action; // 'holiday' or 'leave'
      const noteReason = (reason || notes || '').trim();

      if (modeType === 'leave' && !noteReason) {
        return res.status(400).json({
          success: false,
          message: 'Reason is required in notes for Leave / விடுப்பிற்கு காரணம் தேவை',
        });
      }

      const holidayReasonText = noteReason || (modeType === 'holiday' ? 'Shop / Area Holiday / விடுமுறை' : 'Customer Leave / விடுப்பு');

      inst.status = modeType;
      inst.holidayReason = holidayReasonText;

      // Handle skip options
      const targetInstNo = inst.installmentNo;
      const getIntervalMs = (type) => {
        if (type === 'weekly') return 7 * 24 * 60 * 60 * 1000;
        if (type === 'monthly') return 30 * 24 * 60 * 60 * 1000;
        return 24 * 60 * 60 * 1000; // daily
      };
      const intervalMs = getIntervalMs(loan.financeType);

      if (skipOption === 'move_next' || skipOption === 'extend_end') {
        // Shift subsequent unpaid installments forward by 1 interval
        for (let i = 0; i < loan.schedule.length; i++) {
          const s = loan.schedule[i];
          if (s.installmentNo > targetInstNo && s.status !== 'paid') {
            s.dueDate = new Date(new Date(s.dueDate).getTime() + intervalMs);
          }
        }
        if (loan.endDate) {
          loan.endDate = new Date(new Date(loan.endDate).getTime() + intervalMs);
        }
      }

      // Record in loan.holidays
      if (!Array.isArray(loan.holidays)) {
        loan.holidays = [];
      }
      loan.holidays.push({
        date: paymentDate.toISOString().slice(0, 10),
        reason: holidayReasonText,
        type: modeType,
        skipOption,
      });

      // Status check (excluding holiday/leave from overdue)
      loan.status = computeLoanStatusFromSchedule(loan);

      await loan.save();

      try {
        await AuditLog.create({
          userId: req.user?._id || 'owner',
          userName: req.user?.name || 'Owner',
          action: modeType === 'holiday' ? 'DECLARE_HOLIDAY' : 'DECLARE_LEAVE',
          entity: 'Loan',
          entityId: loan._id.toString(),
          after: {
            loanNo: loan.loanNo,
            installmentNo: targetInstNo,
            date: paymentDate.toISOString().slice(0, 10),
            mode: modeType,
            skipOption,
            reason: holidayReasonText,
          },
        });
      } catch (e) {}

      return res.status(200).json({
        success: true,
        message: 'Saved / சேமிக்கப்பட்டது',
        loan,
      });
    }

    // ---------------------------------------------------------------------------
    // ACTION: PAY (With Extra Amount to Principal Rule)
    // ---------------------------------------------------------------------------
    const payNum = Number(amount);
    if (isNaN(payNum) || payNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than 0 / சரியான தொகை தேவை',
      });
    }

    const currentPendingDue = Math.max(
      0,
      loan.remainingBalance !== undefined && loan.remainingBalance !== null
        ? Number(loan.remainingBalance)
        : (Number(loan.totalPayable) || Number(loan.principal) || 0) - (Number(loan.totalCollected) || 0)
    );
    const instDue = Math.max(0, Number(inst.amount) - (Number(inst.paidAmount) || 0));
    const effectiveInstDue = Math.min(instDue, currentPendingDue);

    if (payNum > currentPendingDue) {
      return res.status(400).json({
        success: false,
        message: `Amount cannot exceed pending due (₹${currentPendingDue}) / தொகை நிலுவைத் தொகை ₹${currentPendingDue}-க்கு மேல் இருக்கக் கூடாது`,
      });
    }

    const createdBy = req.user ? req.user._id : 'owner';
    const custId = loan.customerId ? (loan.customerId._id || loan.customerId) : req.body.customerId;
    const createdPayments = [];

    if (payNum <= effectiveInstDue) {
      // Normal Installment Payment
      const randomHex = Math.floor(100000 + Math.random() * 900000);
      const receiptNo = `RCP-${new Date().getFullYear().toString().slice(-2)}-${randomHex}`;
      const p1 = await Payment.create({
        clientId: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        createdBy,
        receiptNo,
        loanId: loan._id,
        customerId: custId,
        amount: payNum,
        date: paymentDate,
        mode: mode || 'cash',
        paymentType: 'Installment',
        collectedBy: req.user?._id || 'owner',
        notes: notes ? `${notes} (Installment #${inst.installmentNo})` : `Installment #${inst.installmentNo} collection`,
      });
      createdPayments.push(p1);

      inst.paidAmount = (inst.paidAmount || 0) + payNum;
      if (inst.paidAmount >= inst.amount || currentPendingDue - payNum <= 0) {
        inst.status = 'paid';
        inst.paidDate = paymentDate;
      } else {
        inst.status = 'partial';
        inst.paidDate = paymentDate;
      }

      loan.totalCollected = (Number(loan.totalCollected) || 0) + payNum;
      loan.remainingBalance = Math.max(0, currentPendingDue - payNum);
    } else {
      // Extra Amount > Due: Split into Installment + Principal/Extra Payment and deduct BOTH from Pending Due
      const extra = payNum - effectiveInstDue;

      // 1. Installment Payment Row
      const r1Hex = Math.floor(100000 + Math.random() * 900000);
      const receiptNo1 = `RCP-${new Date().getFullYear().toString().slice(-2)}-${r1Hex}`;
      if (effectiveInstDue > 0) {
        const p1 = await Payment.create({
          clientId: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}_inst`,
          createdBy,
          receiptNo: receiptNo1,
          loanId: loan._id,
          customerId: custId,
          amount: effectiveInstDue,
          date: paymentDate,
          mode: mode || 'cash',
          paymentType: 'Installment',
          collectedBy: req.user?._id || 'owner',
          notes: notes ? `${notes} (Installment #${inst.installmentNo})` : `Installment #${inst.installmentNo} collection`,
        });
        createdPayments.push(p1);
      }

      // 2. Principal / Extra Payment Row
      let r2Hex = Math.floor(100000 + Math.random() * 900000);
      if (r2Hex === r1Hex) r2Hex = r1Hex >= 999999 ? 100000 : r1Hex + 1;
      const receiptNo2 = `RCP-${new Date().getFullYear().toString().slice(-2)}-${r2Hex}`;
      const p2 = await Payment.create({
        clientId: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}_prin`,
        createdBy,
        receiptNo: receiptNo2,
        loanId: loan._id,
        customerId: custId,
        amount: extra,
        date: paymentDate,
        mode: mode || 'cash',
        paymentType: 'Principal',
        collectedBy: req.user?._id || 'owner',
        notes: notes ? `${notes} (Extra / Principal payment)` : `Extra payment for Installment #${inst.installmentNo}`,
      });
      createdPayments.push(p2);

      // Show full collected amount (installment + extra) on this corresponding date's row
      inst.paidAmount = (Number(inst.paidAmount) || 0) + payNum;
      inst.status = 'paid';
      inst.paidDate = paymentDate;

      // Subtract both installment amount and extra amount from pending due
      loan.totalCollected = (Number(loan.totalCollected) || 0) + payNum;
      const newRemainingBalance = Math.max(0, currentPendingDue - payNum);
      loan.remainingBalance = newRemainingBalance;

      // Keep installment amount the same and reduce remaining tail dates from the end of schedule
      const baseInstAmt = Math.max(1, Number(loan.installmentAmount) || Number(inst.amount) || 200);
      rebalanceTailSchedule(loan, baseInstAmt, newRemainingBalance, inst.installmentNo);
    }

    // Sync loan status
    if (loan.remainingBalance === 0) {
      loan.status = 'completed';
    } else {
      loan.status = computeLoanStatusFromSchedule(loan);
    }

    await loan.save();

    try {
      await AuditLog.create({
        userId: req.user?._id || 'owner',
        userName: req.user?.name || 'Owner',
        action: 'RECORD_INSTALLMENT_PAYMENT',
        entity: 'Loan',
        entityId: loan._id.toString(),
        after: {
          loanNo: loan.loanNo,
          installmentNo: inst.installmentNo,
          paidAmount: payNum,
          remainingBalance: loan.remainingBalance,
          newPrincipal: loan.principal,
          paymentsCount: createdPayments.length,
        },
      });
    } catch (e) {}

    res.status(200).json({
      success: true,
      message: 'Saved / சேமிக்கப்பட்டது',
      loan,
      payments: createdPayments,
    });
  } catch (error) {
    next(error);
  }
};
