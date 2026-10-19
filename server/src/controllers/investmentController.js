import Investment from '../models/Investment.js';
import Loan from '../models/Loan.js';
import Payment from '../models/Payment.js';
import AuditLog from '../models/AuditLog.js';

export const getInvestments = async (req, res, next) => {
  try {
    const { status, type } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (type && type !== 'all') filter.investmentType = type;

    const investments = await Investment.find(filter)
      .populate('addedBy', 'name email role')
      .sort({ startDate: -1 });

    // Compute comprehensive capital metrics
    const allInvestments = await Investment.find();
    let totalInvested = 0;
    let totalReturned = 0;

    for (const inv of allInvestments) {
      totalInvested += inv.amount || 0;
      totalReturned += inv.totalReturned || 0;
    }

    const activeWorkingCapital = Math.max(0, totalInvested - totalReturned);

    // Compute active loans principal lent out
    const activeLoans = await Loan.find({ status: { $in: ['active', 'overdue'] } });
    let totalPrincipalDisbursed = 0;
    let totalRemainingBalance = 0;
    for (const l of activeLoans) {
      totalPrincipalDisbursed += l.principal || 0;
      totalRemainingBalance += l.remainingBalance || 0;
    }

    // Total repayments collected
    const allPayments = await Payment.find();
    let totalCollectedAllTime = 0;
    for (const p of allPayments) {
      totalCollectedAllTime += p.amount || 0;
    }

    // Available estimated cash in hand = activeWorkingCapital + totalCollectedAllTime - totalPrincipalDisbursed
    const estimatedLiquidCash = Math.max(0, activeWorkingCapital + totalCollectedAllTime - totalPrincipalDisbursed);

    res.status(200).json({
      success: true,
      investments,
      summary: {
        totalInvested,
        totalReturned,
        activeWorkingCapital,
        totalPrincipalDisbursed,
        totalRemainingBalance,
        totalCollectedAllTime,
        estimatedLiquidCash,
        activeCount: allInvestments.filter((i) => i.status !== 'closed').length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createInvestment = async (req, res, next) => {
  try {
    const {
      investorName,
      phone,
      amount,
      interestPercent,
      investmentType,
      startDate,
      paymentMode,
      notes,
    } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid capital investment amount is required',
      });
    }

    const investment = await Investment.create({
      investorName,
      phone: phone || '',
      amount: numAmount,
      interestPercent: Number(interestPercent) || 0,
      investmentType: investmentType || 'self',
      startDate: startDate ? new Date(startDate) : new Date(),
      paymentMode: paymentMode || 'bank',
      status: 'active',
      notes: notes || '',
      addedBy: req.user._id,
    });

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      action: 'ADD_INVESTMENT',
      entity: 'Investment',
      entityId: investment._id.toString(),
      after: {
        investorName,
        amount: numAmount,
        investmentType,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Investment capital added successfully',
      investment,
    });
  } catch (error) {
    next(error);
  }
};

export const recordReturn = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, returnDate, paymentMode, notes } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid return amount is required',
      });
    }

    const investment = await Investment.findById(id);
    if (!investment) {
      return res.status(404).json({
        success: false,
        message: 'Investment record not found',
      });
    }

    const currentActive = Math.max(0, investment.amount - (investment.totalReturned || 0));
    if (numAmount > currentActive) {
      return res.status(400).json({
        success: false,
        message: `Return amount cannot exceed active capital balance of ₹ ${currentActive.toLocaleString('en-IN')}`,
      });
    }

    investment.returns.push({
      amount: numAmount,
      returnDate: returnDate ? new Date(returnDate) : new Date(),
      paymentMode: paymentMode || 'bank',
      notes: notes || '',
    });

    investment.totalReturned = (investment.totalReturned || 0) + numAmount;
    if (investment.totalReturned >= investment.amount) {
      investment.status = 'closed';
    } else {
      investment.status = 'partially_returned';
    }

    await investment.save();

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      action: 'RETURN_INVESTMENT_CAPITAL',
      entity: 'Investment',
      entityId: investment._id.toString(),
      after: {
        returnAmount: numAmount,
        remainingActive: investment.amount - investment.totalReturned,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Capital return recorded successfully',
      investment,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteInvestment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const investment = await Investment.findByIdAndDelete(id);
    if (!investment) {
      return res.status(404).json({
        success: false,
        message: 'Investment record not found',
      });
    }

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      action: 'DELETE_INVESTMENT',
      entity: 'Investment',
      entityId: id,
      before: {
        investorName: investment.investorName,
        amount: investment.amount,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Investment record deleted',
    });
  } catch (error) {
    next(error);
  }
};
