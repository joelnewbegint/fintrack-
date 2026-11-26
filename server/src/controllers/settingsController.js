import Settings from '../models/Settings.js';
import AuditLog from '../models/AuditLog.js';

export const getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne({});
    if (!settings) {
      settings = await Settings.create({});
    }
    res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne({});
    if (!settings) {
      settings = await Settings.create(req.body);
    } else {
      const before = settings.toObject();
      settings = await Settings.findByIdAndUpdate(settings._id, req.body, {
        new: true,
        runValidators: true,
      });

      await AuditLog.create({
        userId: req.user._id,
        userName: req.user.name,
        action: 'UPDATE_SETTINGS',
        entity: 'Settings',
        entityId: settings._id.toString(),
        before,
        after: settings.toObject(),
      });
    }

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      settings,
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find({}).sort({ timestamp: -1 }).limit(100);
    res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    next(error);
  }
};

export const clearAllData = async (req, res, next) => {
  try {
    const Customer = (await import('../models/Customer.js')).default;
    const Loan = (await import('../models/Loan.js')).default;
    const Payment = (await import('../models/Payment.js')).default;
    const Expense = (await import('../models/Expense.js')).default;
    const Investment = (await import('../models/Investment.js')).default;
    const EMICustomer = (await import('../models/EMICustomer.js')).default;
    const EMILoan = (await import('../models/EMILoan.js')).default;
    const EMIPayment = (await import('../models/EMIPayment.js')).default;
    const EMIAuditLog = (await import('../models/EMIAuditLog.js')).default;
    const EMIDailyClosing = (await import('../models/EMIDailyClosing.js')).default;

    await Promise.all([
      Customer.deleteMany({}),
      Loan.deleteMany({}),
      Payment.deleteMany({}),
      Expense.deleteMany({}),
      Investment.deleteMany({}),
      EMICustomer.deleteMany({}),
      EMILoan.deleteMany({}),
      EMIPayment.deleteMany({}),
      EMIAuditLog.deleteMany({}),
      EMIDailyClosing.deleteMany({}),
    ]);

    res.status(200).json({
      success: true,
      message: 'All financial and EMI data successfully cleared. Brand new clean site.',
    });
  } catch (error) {
    next(error);
  }
};

export const declareGlobalHoliday = async (req, res, next) => {
  try {
    const { date, type = 'holiday', reason = 'General Holiday / விடுமுறை' } = req.body;
    const dateStr = date ? new Date(date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    let settings = await Settings.findOne({});
    if (!settings) settings = await Settings.create({});

    if (!Array.isArray(settings.holidays)) settings.holidays = [];

    const existingIndex = settings.holidays.findIndex((h) => h.date === dateStr);
    const item = { date: dateStr, type, reason, createdAt: new Date() };

    if (existingIndex >= 0) {
      settings.holidays[existingIndex] = item;
    } else {
      settings.holidays.push(item);
    }
    await settings.save();

    // Also declare across all active loans for this date
    const Loan = (await import('../models/Loan.js')).default;
    const activeLoans = await Loan.find({ status: { $in: ['active', 'overdue'] } });
    for (const loan of activeLoans) {
      if (!Array.isArray(loan.holidays)) loan.holidays = [];
      const hasH = loan.holidays.some((h) => h.date === dateStr);
      if (!hasH) {
        loan.holidays.push(item);
        if (Array.isArray(loan.schedule)) {
          loan.schedule.forEach((inst) => {
            const instDate = inst.dueDate ? new Date(inst.dueDate).toISOString().split('T')[0] : '';
            if (instDate === dateStr && inst.status !== 'paid') {
              inst.status = type;
              inst.holidayReason = reason;
            }
          });
        }
        await loan.save();
      }
    }

    res.status(200).json({
      success: true,
      message: `Global ${type === 'missed' ? 'Missed Day' : 'Holiday'} recorded for ${dateStr}`,
      settings,
    });
  } catch (error) {
    next(error);
  }
};
