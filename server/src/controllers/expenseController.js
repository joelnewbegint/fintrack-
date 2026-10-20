import Expense from '../models/Expense.js';

export const getExpenses = async (req, res, next) => {
  try {
    const { category, startDate, endDate, search, limit = 100 } = req.query;
    const filter = {};

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { paidTo: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
        { receiptNo: { $regex: search, $options: 'i' } },
      ];
    }

    const expenses = await Expense.find(filter)
      .populate('createdBy', 'name role')
      .sort({ date: -1, createdAt: -1 })
      .limit(Number(limit));

    const totalCount = await Expense.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: expenses.length,
      totalCount,
      expenses,
    });
  } catch (error) {
    next(error);
  }
};

export const createExpense = async (req, res, next) => {
  try {
    const { title, category, amount, date, mode, paidTo, receiptNo, notes } = req.body;

    if (!title || !amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Expense title and valid amount are required',
      });
    }

    const expense = await Expense.create({
      title,
      category: category || 'miscellaneous',
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
      mode: mode || 'cash',
      paidTo: paidTo || '',
      receiptNo: receiptNo || '',
      notes: notes || '',
      createdBy: req.user?._id,
    });

    res.status(201).json({
      success: true,
      message: 'Expense recorded successfully',
      expense,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const expense = await Expense.findByIdAndDelete(id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Expense deleted successfully',
      expenseId: id,
    });
  } catch (error) {
    next(error);
  }
};

export const getExpenseSummary = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [overall, today, monthly, byCategory] = await Promise.all([
      Expense.aggregate([
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
            cashTotal: { $sum: { $cond: [{ $eq: ['$mode', 'cash'] }, '$amount', 0] } },
            upiTotal: { $sum: { $cond: [{ $eq: ['$mode', 'upi'] }, '$amount', 0] } },
          },
        },
      ]),
      Expense.aggregate([
        {
          $match: {
            date: { $gte: startOfToday, $lte: endOfToday },
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      Expense.aggregate([
        {
          $match: {
            date: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      Expense.aggregate([
        {
          $group: {
            _id: '$category',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { totalAmount: -1 } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      summary: {
        totalExpenses: overall[0]?.totalAmount || 0,
        totalExpensesCount: overall[0]?.count || 0,
        cashTotal: overall[0]?.cashTotal || 0,
        upiTotal: overall[0]?.upiTotal || 0,
        todayExpenses: today[0]?.totalAmount || 0,
        todayExpensesCount: today[0]?.count || 0,
        monthlyExpenses: monthly[0]?.totalAmount || 0,
        monthlyExpensesCount: monthly[0]?.count || 0,
        byCategory: byCategory.map((c) => ({
          category: c._id,
          amount: c.totalAmount,
          count: c.count,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
