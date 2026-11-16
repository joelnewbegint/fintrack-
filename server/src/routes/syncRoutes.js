import express from 'express';
import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import Loan from '../models/Loan.js';
import Payment from '../models/Payment.js';
import Expense from '../models/Expense.js';
import Investment from '../models/Investment.js';
import DailyClosing from '../models/DailyClosing.js';
import Settings from '../models/Settings.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

/**
 * Bulk Import / Migration endpoint
 * Upserts all collections matching by clientId or _id so that:
 * 1. Existing IDs are preserved.
 * 2. No duplicates are created.
 * 3. Existing browser data is uploaded safely to MongoDB Atlas.
 */
router.post('/import', async (req, res, next) => {
  try {
    const {
      customers = [],
      loans = [],
      payments = [],
      expenses = [],
      investments = [],
      dailyClosings = [],
      settings = null,
    } = req.body;

    const imported = {
      customers: 0,
      loans: 0,
      payments: 0,
      expenses: 0,
      investments: 0,
      dailyClosings: 0,
      settings: 0,
    };

    const createdBy = req.user ? req.user._id : 'owner';

    // 1. Customers
    for (const item of customers) {
      if (!item || !item.name) continue;
      const clientId = String(item.clientId || item._id || item.id || `cust_${Date.now()}`);
      const payload = { ...item, clientId, createdBy };
      delete payload._id;

      await Customer.findOneAndUpdate(
        { $or: [{ clientId }, { phone: item.phone, name: item.name }] },
        { $set: payload },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      imported.customers++;
    }

    // 2. Loans
    for (const item of loans) {
      if (!item) continue;
      const clientId = String(item.clientId || item._id || item.id || `loan_${Date.now()}`);
      const loanNo = item.loanNo || item.loanId || `LN-${Date.now().toString().slice(-6)}`;
      const payload = { ...item, clientId, loanNo, createdBy };
      delete payload._id;

      await Loan.findOneAndUpdate(
        { $or: [{ clientId }, { loanNo }] },
        { $set: payload },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      imported.loans++;
    }

    // 3. Payments
    for (const item of payments) {
      if (!item) continue;
      const clientId = String(item.clientId || item._id || item.id || `pay_${Date.now()}`);
      const receiptNo = item.receiptNo || `RCP-${Date.now().toString().slice(-6)}`;
      const payload = { ...item, clientId, receiptNo, createdBy };
      delete payload._id;

      await Payment.findOneAndUpdate(
        { $or: [{ clientId }, { receiptNo }] },
        { $set: payload },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      imported.payments++;
    }

    // 4. Expenses
    for (const item of expenses) {
      if (!item) continue;
      const clientId = String(item.clientId || item._id || item.id || `exp_${Date.now()}`);
      const payload = { ...item, clientId, createdBy };
      delete payload._id;

      await Expense.findOneAndUpdate(
        { clientId },
        { $set: payload },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      imported.expenses++;
    }

    // 5. Investments
    for (const item of investments) {
      if (!item) continue;
      const clientId = String(item.clientId || item._id || item.id || `inv_${Date.now()}`);
      const payload = { ...item, clientId, createdBy };
      delete payload._id;

      await Investment.findOneAndUpdate(
        { clientId },
        { $set: payload },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      imported.investments++;
    }

    // 6. Daily Closings
    for (const item of dailyClosings) {
      if (!item) continue;
      const clientId = String(item.clientId || item._id || item.id || `closing_${Date.now()}`);
      const date = item.date || new Date().toISOString().slice(0, 10);
      const payload = { ...item, clientId, date, createdBy };
      delete payload._id;

      await DailyClosing.findOneAndUpdate(
        { $or: [{ clientId }, { date }] },
        { $set: payload },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      imported.dailyClosings++;
    }

    // 7. Settings
    if (settings && typeof settings === 'object') {
      const payload = { ...settings, createdBy };
      delete payload._id;
      await Settings.findOneAndUpdate({}, { $set: payload }, { upsert: true, new: true });
      imported.settings = 1;
    }

    res.status(200).json({
      success: true,
      message: 'Cloud data migration completed successfully',
      imported,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
