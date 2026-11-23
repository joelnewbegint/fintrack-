import Payment from '../models/Payment.js';
import Loan from '../models/Loan.js';
import Customer from '../models/Customer.js';
import Settings from '../models/Settings.js';

export const getDailyClosingReport = async (req, res, next) => {
  try {
    const { date } = req.query;
    let targetDate;
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [y, m, d] = date.split('-').map(Number);
      targetDate = new Date(y, m - 1, d);
    } else {
      targetDate = date ? new Date(date) : new Date();
    }

    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

    // 1. Payments collected on this date with role isolation
    const paymentQuery = {
      date: { $gte: startOfDay, $lte: endOfDay },
    };
    if (req.user?.role === 'loan_agent' && req.user.assignedAreas?.length > 0) {
      paymentQuery.collectedBy = req.user._id;
    }

    const payments = await Payment.find(paymentQuery)
      .populate('customerId', 'name phone area')
      .populate('loanId', 'loanNo financeType')
      .populate('collectedBy', 'name role')
      .sort({ date: -1 });

    const totalCollected = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const cashCollected = payments
      .filter((p) => p.mode === 'cash')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const upiCollected = payments
      .filter((p) => p.mode === 'upi')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // 2. Installments scheduled for this date across active loans with role isolation
    const loanQuery = {
      status: { $in: ['active', 'overdue'] },
    };
    if (req.user?.role === 'loan_agent' && req.user.assignedAreas?.length > 0) {
      loanQuery.customerArea = { $in: req.user.assignedAreas };
    }
    const loans = await Loan.find(loanQuery).populate('customerId', 'name phone area');

    let totalExpected = 0;
    const expectedList = [];

    loans.forEach((loan) => {
      (loan.schedule || []).forEach((inst) => {
        const d = new Date(inst.dueDate);
        if (d >= startOfDay && d <= endOfDay) {
          const amt = Number(inst.amount) || 0;
          totalExpected += amt;
          expectedList.push({
            loanId: loan._id,
            loanNo: loan.loanNo,
            customerId: loan.customerId?._id,
            customerName: loan.customerId?.name || loan.customerName,
            customerPhone: loan.customerId?.phone || loan.customerPhone,
            area: loan.customerId?.area || loan.customerArea,
            financeType: loan.financeType,
            installmentNo: inst.installmentNo,
            expectedAmount: amt,
            paidAmount: Number(inst.paidAmount) || 0,
            status: inst.status,
          });
        }
      });
    });

    const pendingAmount = Math.max(0, totalExpected - totalCollected);

    // 3. Compute distinct breakdown by Finance Type (Daily, Weekly, Monthly)
    const byFinanceType = {
      daily: {
        expected: 0,
        collected: 0,
        pending: 0,
        cash: 0,
        upi: 0,
        receiptsCount: 0,
        expectedCount: 0,
      },
      weekly: {
        expected: 0,
        collected: 0,
        pending: 0,
        cash: 0,
        upi: 0,
        receiptsCount: 0,
        expectedCount: 0,
      },
      monthly: {
        expected: 0,
        collected: 0,
        pending: 0,
        cash: 0,
        upi: 0,
        receiptsCount: 0,
        expectedCount: 0,
      },
    };

    payments.forEach((p) => {
      const type = p.loanId?.financeType || 'daily';
      if (byFinanceType[type]) {
        byFinanceType[type].collected += p.amount;
        byFinanceType[type].receiptsCount += 1;
        if (p.mode === 'cash') byFinanceType[type].cash += p.amount;
        if (p.mode === 'upi') byFinanceType[type].upi += p.amount;
      }
    });

    expectedList.forEach((inst) => {
      const type = inst.financeType || 'daily';
      if (byFinanceType[type]) {
        byFinanceType[type].expected += inst.expectedAmount;
        byFinanceType[type].expectedCount += 1;
      }
    });

    Object.keys(byFinanceType).forEach((k) => {
      byFinanceType[k].pending = Math.max(
        0,
        byFinanceType[k].expected - byFinanceType[k].collected
      );
    });

    res.status(200).json({
      success: true,
      reportDate: targetDate.toISOString().split('T')[0],
      summary: {
        totalExpected,
        totalCollected,
        pendingAmount,
        cashCollected,
        upiCollected,
        totalReceiptsCount: payments.length,
        byFinanceType,
      },
      payments,
      expectedList,
    });
  } catch (error) {
    next(error);
  }
};

export const getFullBackup = async (req, res, next) => {
  try {
    const customers = await Customer.find({});
    const loans = await Loan.find({});
    const payments = await Payment.find({});
    const settings = await Settings.findOne({});

    const backupData = {
      app: 'FinTrack',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      counts: {
        customers: customers.length,
        loans: loans.length,
        payments: payments.length,
      },
      data: {
        customers,
        loans,
        payments,
        settings,
      },
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=fintrack-backup-${new Date().toISOString().split('T')[0]}.json`
    );

    res.status(200).json(backupData);
  } catch (error) {
    next(error);
  }
};
