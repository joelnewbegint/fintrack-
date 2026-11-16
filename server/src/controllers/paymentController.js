import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import Loan from '../models/Loan.js';
import Customer from '../models/Customer.js';
import AuditLog from '../models/AuditLog.js';

export const recordPayment = async (req, res, next) => {
  try {
    if (req.user?.role === 'client') {
      return res.status(403).json({ success: false, message: 'Access denied: Clients cannot record payments.' });
    }
    const { loanId, amount, mode, date, notes } = req.body;

    const isObjId = mongoose.Types.ObjectId.isValid(loanId);
    const loan = isObjId
      ? await Loan.findById(loanId).populate('customerId')
      : await Loan.findOne({ $or: [{ clientId: loanId }, { loanNo: loanId }] }).populate('customerId');

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found',
      });
    }

    const payAmount = Number(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than 0',
      });
    }

    if (loan.remainingBalance <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Loan is already fully repaid',
      });
    }

    const paymentDate = date ? new Date(date) : new Date();

    // Unique Receipt Number: RCP-YY-XXXXXX
    const randomHex = Math.floor(100000 + Math.random() * 900000);
    const receiptNo = req.body.receiptNo || `RCP-${new Date().getFullYear().toString().slice(-2)}-${randomHex}`;
    const clientId = req.body.clientId || req.body._id || req.body.id || `pay_${Date.now()}`;
    const createdBy = req.user ? req.user._id : 'owner';

    // Idempotent check for offline sync replay
    const existingPayment = await Payment.findOne({
      $or: [
        ...(clientId ? [{ clientId }] : []),
        ...(receiptNo ? [{ receiptNo }] : []),
      ],
    });
    if (existingPayment) {
      return res.status(200).json({
        success: true,
        payment: existingPayment,
        message: 'Payment already recorded',
      });
    }

    const custId = loan.customerId ? (loan.customerId._id || loan.customerId) : req.body.customerId;

    const newPayment = await Payment.create({
      clientId,
      createdBy,
      receiptNo,
      loanId: loan._id || loan.clientId,
      customerId: custId,
      amount: payAmount,
      date: paymentDate,
      mode: mode || 'cash',
      collectedBy: req.user._id,
      notes: notes || '',
    });

    // Update loan schedule with cascading payment allocation
    let unallocated = payAmount;
    for (let i = 0; i < loan.schedule.length; i++) {
      if (unallocated <= 0) break;
      const inst = loan.schedule[i];

      if (inst.status !== 'paid') {
        const required = inst.amount - (inst.paidAmount || 0);
        if (unallocated >= required) {
          inst.paidAmount = inst.amount;
          inst.status = 'paid';
          inst.paidDate = paymentDate;
          unallocated -= required;
        } else {
          inst.paidAmount = (inst.paidAmount || 0) + unallocated;
          inst.status = 'partial';
          inst.paidDate = paymentDate;
          unallocated = 0;
        }
      }
    }

    loan.totalCollected = (loan.totalCollected || 0) + payAmount;
    loan.remainingBalance = Math.max(0, loan.totalPayable - loan.totalCollected);

    if (loan.remainingBalance === 0) {
      loan.status = 'completed';
    } else {
      // Check if any remaining schedule items are overdue
      const now = new Date();
      const hasOverdue = loan.schedule.some(
        (s) => s.status !== 'paid' && new Date(s.dueDate) < now
      );
      loan.status = hasOverdue ? 'overdue' : 'active';
    }

    await loan.save();

    // Audit log entry
    try {
      await AuditLog.create({
        userId: req.user?._id || 'owner',
        userName: req.user?.name || 'Owner',
        action: 'RECORD_PAYMENT',
        entity: 'Payment',
        entityId: newPayment._id.toString(),
        after: {
          receiptNo: newPayment.receiptNo,
          amount: payAmount,
          customer: loan.customerId?.name || 'Customer',
          loanNo: loan.loanNo,
          mode: newPayment.mode,
          remainingBalance: loan.remainingBalance,
        },
      });
    } catch (e) {
      console.warn('[PaymentController] AuditLog error:', e.message);
    }

    // Populate for receipt view
    const populatedPayment = await Payment.findById(newPayment._id)
      .populate('customerId', 'name phone address area')
      .populate('loanId', 'loanNo financeType principal totalPayable remainingBalance totalCollected')
      .populate('collectedBy', 'name role');

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      payment: populatedPayment,
      loan: {
        id: loan._id,
        remainingBalance: loan.remainingBalance,
        totalCollected: loan.totalCollected,
        status: loan.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPayments = async (req, res, next) => {
  try {
    const { loanId, customerId, mode, startDate, endDate, limit = 50 } = req.query;
    let query = {};

    // Role-based Client Isolation
    if (req.user?.role === 'client') {
      const clientCustIds = [req.user.customerId, req.user._id].filter(Boolean);
      query.$or = [{ customerId: { $in: clientCustIds } }];
    }

    if (loanId) query.loanId = loanId;
    if (customerId) query.customerId = customerId;
    if (mode && mode !== 'all') query.mode = mode;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const payments = await Payment.find(query)
      .populate('customerId', 'name phone area')
      .populate('loanId', 'loanNo financeType')
      .populate('collectedBy', 'name role')
      .sort({ date: -1 })
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (error) {
    next(error);
  }
};

export const deletePayment = async (req, res, next) => {
  try {
    if (req.user?.role === 'client') {
      return res.status(403).json({ success: false, message: 'Access denied: Clients cannot reverse payments.' });
    }
    const isObjId = mongoose.Types.ObjectId.isValid(req.params.id);
    const payment = isObjId
      ? await Payment.findById(req.params.id)
      : await Payment.findOne({ $or: [{ clientId: req.params.id }, { receiptNo: req.params.id }] });
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    const isLoanObjId = mongoose.Types.ObjectId.isValid(payment.loanId);
    const loan = isLoanObjId
      ? await Loan.findById(payment.loanId)
      : await Loan.findOne({ $or: [{ clientId: payment.loanId }, { loanNo: payment.loanId }] });
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Associated loan not found',
      });
    }

    const before = {
      payment: payment.toObject(),
      loanCollected: loan.totalCollected,
      loanRemaining: loan.remainingBalance,
    };

    // Revert amounts on loan
    loan.totalCollected = Math.max(0, (loan.totalCollected || 0) - payment.amount);
    loan.remainingBalance = Math.min(loan.totalPayable, loan.totalPayable - loan.totalCollected);

    // Reconstruct schedule allocations based on remaining payments
    const remainingPayments = await Payment.find({
      loanId: loan._id,
      _id: { $ne: payment._id },
    }).sort({ date: 1 });

    // Reset schedule
    loan.schedule.forEach((inst) => {
      inst.paidAmount = 0;
      inst.status = new Date(inst.dueDate) < new Date() ? 'overdue' : 'pending';
      inst.paidDate = null;
    });

    // Replay remaining payments
    let runningPool = remainingPayments.reduce((acc, p) => acc + p.amount, 0);
    for (let i = 0; i < loan.schedule.length; i++) {
      if (runningPool <= 0) break;
      const inst = loan.schedule[i];
      if (runningPool >= inst.amount) {
        inst.paidAmount = inst.amount;
        inst.status = 'paid';
        inst.paidDate = loan.startDate;
        runningPool -= inst.amount;
      } else {
        inst.paidAmount = runningPool;
        inst.status = 'partial';
        runningPool = 0;
      }
    }

    if (loan.remainingBalance === 0) {
      loan.status = 'completed';
    } else {
      const now = new Date();
      const hasOverdue = loan.schedule.some(
        (s) => s.status !== 'paid' && new Date(s.dueDate) < now
      );
      loan.status = hasOverdue ? 'overdue' : 'active';
    }

    await loan.save();
    await Payment.findByIdAndDelete(payment._id);

    // Audit log
    try {
      await AuditLog.create({
        userId: req.user?._id || 'owner',
        userName: req.user?.name || 'Owner',
        action: 'DELETE_PAYMENT',
        entity: 'Payment',
        entityId: payment._id.toString(),
        before,
        after: {
          undoneAmount: payment.amount,
          revertedRemainingBalance: loan.remainingBalance,
        },
      });
    } catch (e) {
      console.warn('[PaymentController] AuditLog error:', e.message);
    }

    res.status(200).json({
      success: true,
      message: 'Payment reversed and schedule updated successfully',
    });
  } catch (error) {
    next(error);
  }
};
