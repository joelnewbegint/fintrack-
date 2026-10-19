import Loan from '../models/Loan.js';
import Customer from '../models/Customer.js';
import Payment from '../models/Payment.js';
import AuditLog from '../models/AuditLog.js';

export const createLoan = async (req, res, next) => {
  try {
    const {
      customerId,
      principal,
      interestPercent,
      financeType,
      duration,
      startDate,
      latePenaltyRate,
      notes,
    } = req.body;

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    const principalNum = Number(principal);
    const interestPercentNum = Number(interestPercent);
    const durationNum = Number(duration);

    const totalInterest = (principalNum * interestPercentNum) / 100;
    const totalPayable = principalNum + totalInterest;
    const installmentAmount = Math.ceil(totalPayable / durationNum);

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
    const loanNo = `LN-${prefix}${new Date().getFullYear().toString().slice(-2)}-${randomSuffix}`;

    const newLoan = await Loan.create({
      loanNo,
      customerId,
      principal: principalNum,
      interestPercent: interestPercentNum,
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
      schedule,
      notes: notes || '',
    });

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

    res.status(201).json({
      success: true,
      message: 'Loan created successfully with installment schedule',
      loan: newLoan,
    });
  } catch (error) {
    next(error);
  }
};

export const getLoans = async (req, res, next) => {
  try {
    const { status, financeType, customerId, search } = req.query;
    let query = {};

    if (status && status !== 'all') {
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

    if (search) {
      const searchLower = search.toLowerCase();
      loans = loans.filter((l) => {
        const custName = l.customerId?.name?.toLowerCase() || '';
        const custPhone = l.customerId?.phone || '';
        const loanNo = l.loanNo?.toLowerCase() || '';
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

export const getLoanById = async (req, res, next) => {
  try {
    const loan = await Loan.findById(req.params.id).populate(
      'customerId',
      'name phone address area photoUrl guarantor'
    );

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found',
      });
    }

    const payments = await Payment.find({ loanId: loan._id })
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
    const { status, notes } = req.body;
    const loan = await Loan.findById(req.params.id);

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found',
      });
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
