import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import EMICustomer from '../models/EMICustomer.js';
import EMILoan from '../models/EMILoan.js';
import EMIPayment from '../models/EMIPayment.js';
import EMIDailyClosing from '../models/EMIDailyClosing.js';
import EMIAuditLog from '../models/EMIAuditLog.js';
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
  const totalPayable = emi * n;
  const totalInterest = totalPayable - p;
  return { emi, totalPayable, totalInterest };
};

// Helper: Calculate Flat Interest EMI
export const calculateFlatEMI = (principal, annualRatePercent, months) => {
  const p = Number(principal);
  const totalInterest = Math.round((p * (Number(annualRatePercent) / 100) * (Number(months) / 12)));
  const totalPayable = p + totalInterest;
  const emi = Math.round(totalPayable / Number(months));
  return { emi, totalPayable, totalInterest };
};

// Helper: Generate Amortization Schedule
export const generateEMISchedule = (principal, annualRatePercent, months, type = 'reducing', startDate = new Date()) => {
  const p = Number(principal);
  const n = Number(months);
  const start = new Date(startDate);
  const schedule = [];

  if (type === 'flat') {
    const { emi, totalInterest } = calculateFlatEMI(p, annualRatePercent, n);
    const monthlyInterest = Math.round(totalInterest / n);
    const monthlyPrincipal = emi - monthlyInterest;

    for (let i = 1; i <= n; i++) {
      const dueDate = new Date(start);
      dueDate.setMonth(dueDate.getMonth() + i);

      schedule.push({
        installmentNo: i,
        dueDate,
        amount: emi,
        principalPart: monthlyPrincipal,
        interestPart: monthlyInterest,
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

    const interestPart = Math.round(currentBalance * r);
    const principalPart = i === n ? currentBalance : (emi - interestPart);
    currentBalance = Math.max(0, currentBalance - principalPart);

    schedule.push({
      installmentNo: i,
      dueDate,
      amount: emi,
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
  try {
    const {
      customerId,
      customerName,
      customerPhone,
      customerArea,
      assignedAgentId,
      principal,
      interestRatePercent,
      interestCalculationType = 'reducing',
      tenureMonths,
      documentationCharges = 0,
      startDate = new Date(),
      notes = '',
    } = req.body;

    if (!principal || interestRatePercent === undefined || !tenureMonths) {
      return res.status(400).json({
        success: false,
        message: 'Please provide principal, interest rate, and tenure months.',
      });
    }

    // Lookup existing customer or auto-create a valid EMICustomer when entered manually
    let cust = null;
    if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
      cust = await EMICustomer.findById(customerId);
    }
    if (!cust && customerId && customerId !== 'temp_cust') {
      cust = await EMICustomer.findOne({ clientId: customerId });
    }
    if (!cust && customerPhone) {
      cust = await EMICustomer.findOne({ phone: customerPhone.trim() });
    }

    const finalCustomerName = (customerName || (cust ? cust.name : '') || '').trim();
    if (!finalCustomerName) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required.',
      });
    }
    const finalCustomerPhone = (customerPhone || (cust ? cust.phone : '') || '0000000000').trim();
    const finalCustomerArea = (customerArea || (cust ? cust.area : '') || 'Main Area').trim();

    let agent = null;
    if (assignedAgentId && mongoose.Types.ObjectId.isValid(assignedAgentId)) {
      agent = await User.findById(assignedAgentId);
    } else if (!req.user.isOwner) {
      agent = req.user;
    } else {
      agent = await User.findOne({ role: 'emi_agent', status: 'active' });
    }

    if (!cust) {
      cust = await EMICustomer.create({
        clientId: `emi_cust_${Date.now()}`,
        createdBy: req.user._id,
        assignedAgentId: agent ? agent._id : (req.user.isOwner ? null : req.user._id),
        name: finalCustomerName,
        phone: finalCustomerPhone,
        address: finalCustomerArea,
        area: finalCustomerArea,
        status: 'active',
      });
    }

    // Calculate Amortization Schedule
    const schedule = generateEMISchedule(
      principal,
      interestRatePercent,
      tenureMonths,
      interestCalculationType,
      startDate
    );

    const calcResult = interestCalculationType === 'flat'
      ? calculateFlatEMI(principal, interestRatePercent, tenureMonths)
      : calculateReducingEMI(principal, interestRatePercent, tenureMonths);

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const emiNo = `EMI-${new Date().getFullYear().toString().slice(-2)}-${randomSuffix}`;
    const endDate = schedule[schedule.length - 1].dueDate;

    const emiLoan = await EMILoan.create({
      emiNo,
      customerId: cust ? cust._id : customerId,
      customerName: finalCustomerName,
      customerPhone: finalCustomerPhone,
      customerArea: finalCustomerArea,
      assignedAgentId: agent ? agent._id : (req.user.isOwner ? null : req.user._id),
      assignedAgentName: agent ? agent.name : (req.user.isOwner ? 'Unassigned' : req.user.name),
      principal: Number(principal),
      interestRatePercent: Number(interestRatePercent),
      interestCalculationType,
      tenureMonths: Number(tenureMonths),
      documentationCharges: Number(documentationCharges) || 0,
      installmentAmount: calcResult.emi,
      totalPayable: calcResult.totalPayable,
      totalInterest: calcResult.totalInterest,
      totalCollected: 0,
      remainingBalance: calcResult.totalPayable,
      startDate: new Date(startDate),
      endDate,
      status: 'active',
      schedule,
      notes,
      createdBy: req.user._id,
    });

    await EMIAuditLog.create({
      action: 'CREATE_EMI',
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      emiLoanId: emiLoan._id,
      details: { emiNo, principal, tenureMonths, interestRatePercent },
    });

    res.status(201).json({
      success: true,
      message: 'New EMI loan sanctioned successfully',
      loan: emiLoan,
    });
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
      .populate('emiLoanId', 'emiNo principal installmentAmount customerPhone customerArea remainingBalance')
      .sort({ paymentDate: -1, createdAt: -1 })
      .limit(Number(limit));

    const formatted = payments.map((p) => {
      const obj = p.toObject();
      return {
        ...obj,
        loanNo: obj.emiLoanId?.emiNo || 'EMI',
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

