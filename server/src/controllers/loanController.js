import mongoose from 'mongoose';
import Loan from '../models/Loan.js';
import Customer from '../models/Customer.js';
import Payment from '../models/Payment.js';
import AuditLog from '../models/AuditLog.js';

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
          if (inst.status === 'holiday' || inst.status === 'missed') {
            const isOverdue = new Date(inst.dueDate) < now;
            inst.status = isOverdue ? 'overdue' : 'pending';
            inst.holidayReason = '';
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

      // Find and delete/adjust matching payment document
      const matchingPayments = await Payment.find({
        loanId: loan._id,
      }).sort({ date: -1 });

      let paymentDeleted = null;
      for (const p of matchingPayments) {
        const pNotes = p.notes || '';
        const matchesInst = new RegExp(`(?:installment|inst)\\s*#?${inst.installmentNo}\\b|#${inst.installmentNo}\\b`, 'i').test(pNotes);
        if (matchesInst) {
          if (p.amount === revAmt) {
            await Payment.findByIdAndDelete(p._id);
            paymentDeleted = p._id;
            break;
          } else if (p.amount > revAmt) {
            p.amount -= revAmt;
            await p.save();
            paymentDeleted = p._id;
            break;
          }
        }
      }

      // If no notes match, find by amount and date
      if (!paymentDeleted) {
        for (const p of matchingPayments) {
          if (Number(p.amount) === revAmt) {
            await Payment.findByIdAndDelete(p._id);
            paymentDeleted = p._id;
            break;
          }
        }
      }

      loan.totalCollected = Math.max(0, (loan.totalCollected || 0) - revAmt);
      loan.remainingBalance = Math.min(loan.totalPayable, (loan.totalPayable || 0) - loan.totalCollected);
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
    // ACTION: HOLIDAY / LEAVE
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
      const now = new Date();
      const hasOverdue = loan.schedule.some(
        (s) => s.status !== 'paid' && s.status !== 'holiday' && s.status !== 'leave' && new Date(s.dueDate) < now
      );
      loan.status = loan.remainingBalance <= 0 ? 'completed' : hasOverdue ? 'overdue' : 'active';

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

    const instDue = Math.max(0, Number(inst.amount) - (Number(inst.paidAmount) || 0));
    const maxAllowed = (Number(loan.principal) || 0) + instDue;

    if (payNum > maxAllowed) {
      return res.status(400).json({
        success: false,
        message: `Amount cannot exceed outstanding principal + due (₹${maxAllowed}) / தொகை ₹${maxAllowed}-க்கு மேல் இருக்கக் கூடாது`,
      });
    }

    const createdBy = req.user ? req.user._id : 'owner';
    const custId = loan.customerId ? (loan.customerId._id || loan.customerId) : req.body.customerId;
    const createdPayments = [];

    if (payNum <= instDue) {
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
      if (inst.paidAmount >= inst.amount) {
        inst.status = 'paid';
        inst.paidDate = paymentDate;
      } else {
        inst.status = 'partial';
        inst.paidDate = paymentDate;
      }

      loan.totalCollected = (loan.totalCollected || 0) + payNum;
      loan.remainingBalance = Math.max(0, loan.totalPayable - loan.totalCollected);
    } else {
      // Extra Amount > Due: Split into Installment + Principal Payment
      const extra = payNum - instDue;

      // 1. Installment Payment Row
      const r1Hex = Math.floor(100000 + Math.random() * 900000);
      const receiptNo1 = `RCP-${new Date().getFullYear().toString().slice(-2)}-${r1Hex}`;
      const p1 = await Payment.create({
        clientId: `pay_${Date.now()}_inst`,
        createdBy,
        receiptNo: receiptNo1,
        loanId: loan._id,
        customerId: custId,
        amount: instDue,
        date: paymentDate,
        mode: mode || 'cash',
        paymentType: 'Installment',
        collectedBy: req.user?._id || 'owner',
        notes: notes ? `${notes} (Installment #${inst.installmentNo})` : `Installment #${inst.installmentNo} collection`,
      });
      createdPayments.push(p1);

      // 2. Principal Payment Row
      const r2Hex = Math.floor(100000 + Math.random() * 900000);
      const receiptNo2 = `RCP-${new Date().getFullYear().toString().slice(-2)}-${r2Hex}`;
      const p2 = await Payment.create({
        clientId: `pay_${Date.now()}_prin`,
        createdBy,
        receiptNo: receiptNo2,
        loanId: loan._id,
        customerId: custId,
        amount: extra,
        date: paymentDate,
        mode: mode || 'cash',
        paymentType: 'Principal',
        collectedBy: req.user?._id || 'owner',
        notes: notes ? `${notes} (Principal payment)` : `Principal payment for Installment #${inst.installmentNo}`,
      });
      createdPayments.push(p2);

      // Mark this installment fully paid
      inst.paidAmount = inst.amount;
      inst.status = 'paid';
      inst.paidDate = paymentDate;

      // Reduce loan's outstanding principal by Extra
      const oldPrincipal = Number(loan.principal) || 0;
      const newPrincipal = Math.max(0, oldPrincipal - extra);
      loan.principal = newPrincipal;

      // Recalculate interest and EMI on remaining dues from the new principal
      const remainingUnpaid = loan.schedule.filter(
        (s) => s.installmentNo > inst.installmentNo && s.status !== 'paid'
      );
      const remainingCount = remainingUnpaid.length;

      if (remainingCount > 0) {
        let remainingPayable = newPrincipal;
        if (loan.interestType === 'addon' && Number(loan.interestPercent) > 0) {
          const interestPortion = Math.round((newPrincipal * (Number(loan.interestPercent) / 100) * remainingCount) / loan.duration);
          remainingPayable = newPrincipal + interestPortion;
        }

        const newPerInst = Math.ceil(remainingPayable / remainingCount);
        loan.installmentAmount = newPerInst;

        let runningSum = 0;
        for (let i = 0; i < remainingUnpaid.length; i++) {
          if (i === remainingUnpaid.length - 1) {
            remainingUnpaid[i].amount = Math.max(0, remainingPayable - runningSum);
          } else {
            remainingUnpaid[i].amount = newPerInst;
            runningSum += newPerInst;
          }
        }

        // Recalculate totalPayable as sum of all schedule amounts
        loan.totalPayable = loan.schedule.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
      }

      loan.totalCollected = (loan.totalCollected || 0) + payNum;
      loan.remainingBalance = Math.max(0, loan.totalPayable - loan.totalCollected);
    }

    // Sync loan status
    if (loan.remainingBalance === 0) {
      loan.status = 'completed';
    } else {
      const now = new Date();
      const hasOverdue = loan.schedule.some(
        (s) => s.status !== 'paid' && s.status !== 'holiday' && s.status !== 'leave' && new Date(s.dueDate) < now
      );
      loan.status = hasOverdue ? 'overdue' : 'active';
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
