import mongoose from 'mongoose';
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
      borrowerPhoto,
    } = req.body;

    const isObjId = mongoose.Types.ObjectId.isValid(customerId);
    const customer = isObjId
      ? await Customer.findById(customerId)
      : await Customer.findOne({ clientId: customerId });

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

    const newLoan = await Loan.create({
      clientId,
      createdBy,
      loanNo,
      customerId: customer ? customer._id : customerId,
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

    try {
      await AuditLog.create({
        userId: req.user?._id || 'owner',
        userName: req.user?.name || 'Owner',
        action: 'CREATE_LOAN',
        entity: 'Loan',
        entityId: newLoan._id.toString(),
        after: {
          loanNo: newLoan.loanNo,
          customer: customer?.name || customerName || 'Borrower',
          principal: newLoan.principal,
          financeType: newLoan.financeType,
          totalPayable: newLoan.totalPayable,
        },
      });
    } catch (auditErr) {
      console.warn('[LoanController] AuditLog error:', auditErr.message);
    }

    try {
      if (newLoan.customerId) {
        await newLoan.populate('customerId', 'name phone area address photoUrl photo');
      }
    } catch (popErr) {
      console.warn('[LoanController] Populate customer error:', popErr.message);
    }

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
