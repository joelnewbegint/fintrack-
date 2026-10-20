import mongoose from 'mongoose';
import Loan from '../models/Loan.js';
import Payment from '../models/Payment.js';
import Customer from '../models/Customer.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    // 1. Overall Loan Aggregate (Separating Active Loans vs Settled Loans)
    const loanAggregate = await Loan.aggregate([
      {
        $group: {
          _id: null,
          totalPrincipal: { $sum: '$principal' },
          totalPayable: { $sum: '$totalPayable' },
          totalCollected: { $sum: '$totalCollected' },
          totalRemaining: { $sum: '$remainingBalance' },
          totalLoans: { $sum: 1 },
          activeLoans: {
            $sum: {
              $cond: [{ $in: ['$status', ['active', 'overdue']] }, 1, 0],
            },
          },
          overdueLoans: {
            $sum: {
              $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0],
            },
          },
          completedLoans: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0],
            },
          },
          // Active loans principal and totalPayable
          activePrincipal: {
            $sum: {
              $cond: [{ $in: ['$status', ['active', 'overdue']] }, '$principal', 0],
            },
          },
          activeTotalPayable: {
            $sum: {
              $cond: [{ $in: ['$status', ['active', 'overdue']] }, '$totalPayable', 0],
            },
          },
          activeCollected: {
            $sum: {
              $cond: [{ $in: ['$status', ['active', 'overdue']] }, '$totalCollected', 0],
            },
          },
          // Settled loans principal and totalCollected/totalPayable
          settledPrincipal: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$principal', 0],
            },
          },
          settledTotalPayable: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$totalPayable', 0],
            },
          },
          settledAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$totalCollected', 0],
            },
          },
        },
      },
    ]);

    const totalStats = loanAggregate[0] || {
      totalPrincipal: 0,
      totalPayable: 0,
      totalCollected: 0,
      totalRemaining: 0,
      totalLoans: 0,
      activeLoans: 0,
      overdueLoans: 0,
      completedLoans: 0,
      activePrincipal: 0,
      activeTotalPayable: 0,
      activeCollected: 0,
      settledPrincipal: 0,
      settledTotalPayable: 0,
      settledAmount: 0,
    };

    // 1. Settled Amount: Total overall amount from 100% completed accounts
    const settledAmount = totalStats.settledAmount || totalStats.settledTotalPayable || 0;

    // 2. Profit from Settled: Pure profit/interest realized exclusively from completed loans
    const profitFromSettled = Math.max(
      0,
      (totalStats.settledTotalPayable || totalStats.settledAmount) - totalStats.settledPrincipal
    );

    // 3. Active Interest: Expected interest currently sitting in active/running loans.
    // When a loan completes, it automatically leaves active loans, which reduces activeInterest and transfers into profitFromSettled!
    const activeInterest = Math.max(0, totalStats.activeTotalPayable - totalStats.activePrincipal);

    // Keep profitEarned mapped to profitFromSettled for consistency
    const profitEarned = profitFromSettled;

    // 2. Finance Type Breakdown (Daily, Weekly, Monthly)
    const typeBreakdown = await Loan.aggregate([
      {
        $group: {
          _id: '$financeType',
          count: { $sum: 1 },
          activeLoans: {
            $sum: {
              $cond: [{ $in: ['$status', ['active', 'overdue']] }, 1, 0],
            },
          },
          lent: { $sum: '$principal' },
          totalPayable: { $sum: '$totalPayable' },
          collected: { $sum: '$totalCollected' },
          pending: { $sum: '$remainingBalance' },
        },
      },
    ]);

    const financeTypesMap = {
      daily: { type: 'daily', title: 'Daily (தினசரி/தண்டல்)', activeLoans: 0, lent: 0, collected: 0, pending: 0, count: 0 },
      weekly: { type: 'weekly', title: 'Weekly (வாரத்தவணை)', activeLoans: 0, lent: 0, collected: 0, pending: 0, count: 0 },
      monthly: { type: 'monthly', title: 'Monthly (மாதத்தவணை)', activeLoans: 0, lent: 0, collected: 0, pending: 0, count: 0 },
    };

    typeBreakdown.forEach((item) => {
      if (financeTypesMap[item._id]) {
        financeTypesMap[item._id] = {
          ...financeTypesMap[item._id],
          count: item.count,
          activeLoans: item.activeLoans,
          lent: item.lent,
          collected: item.collected,
          pending: item.pending,
        };
      }
    });

    // 3. Today's Collections (Payments already received today)
    const todayPayments = await Payment.find({
      date: { $gte: startOfToday, $lte: endOfToday },
    })
      .populate('customerId', 'name phone area')
      .populate('loanId', 'loanNo financeType')
      .populate('collectedBy', 'name role')
      .sort({ createdAt: -1, date: -1 });

    const todayCollectedAmount = todayPayments.reduce((acc, p) => acc + p.amount, 0);

    // 3b. Fully Completed / Settled Loans (100% Repaid)
    const completedLoansList = await Loan.find({ status: 'completed' })
      .populate('customerId', 'name phone area photoUrl')
      .sort({ updatedAt: -1 })
      .limit(30);

    // 4. Today's Due Installments
    // Active/Overdue loans with schedule items due on or before today and not fully paid
    const activeLoans = await Loan.find({
      status: { $in: ['active', 'overdue'] },
    }).populate('customerId', 'name phone area photoUrl');

    const todayDueList = [];
    activeLoans.forEach((loan) => {
      // Find installments due today or overdue
      loan.schedule.forEach((inst) => {
        if (inst.status !== 'paid') {
          const dueDate = new Date(inst.dueDate);
          const isDueToday =
            dueDate >= startOfToday && dueDate <= endOfToday;
          const isOverdue = dueDate < startOfToday;

          if (isDueToday || isOverdue) {
            todayDueList.push({
              loanId: loan._id,
              loanNo: loan.loanNo,
              customerId: loan.customerId?._id,
              customerName: loan.customerId?.name || 'Unknown',
              customerPhone: loan.customerId?.phone || '',
              customerArea: loan.customerId?.area || '',
              photoUrl: loan.customerId?.photoUrl || '',
              financeType: loan.financeType,
              installmentNo: inst.installmentNo,
              installmentAmount: inst.amount,
              paidAmount: inst.paidAmount || 0,
              dueAmount: inst.amount - (inst.paidAmount || 0),
              dueDate: inst.dueDate,
              isOverdue,
              status: inst.status,
            });
          }
        }
      });
    });

    // Sort today's list: overdue first, then by customer name
    todayDueList.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

    // 5. Overdue Loans Alerts List (Summary of loans with overdue status)
    const overdueLoans = await Loan.find({ status: 'overdue' })
      .populate('customerId', 'name phone area')
      .sort({ updatedAt: -1 })
      .limit(10);

    // 6. Collection Trend Chart (Last 30 Days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const trendAggregate = await Payment.aggregate([
      {
        $match: {
          date: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date' },
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          cashTotal: {
            $sum: { $cond: [{ $eq: ['$mode', 'cash'] }, '$amount', 0] },
          },
          upiTotal: {
            $sum: { $cond: [{ $eq: ['$mode', 'upi'] }, '$amount', 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Build complete 30-day timeline with 0s for missing days
    const trendMap = {};
    trendAggregate.forEach((item) => {
      trendMap[item._id] = item;
    });

    const collectionTrend = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const entry = trendMap[dateStr];
      collectionTrend.push({
        date: dateStr,
        displayDate: `${d.getDate()}/${d.getMonth() + 1}`,
        amount: entry ? entry.total : 0,
        cash: entry ? entry.cashTotal : 0,
        upi: entry ? entry.upiTotal : 0,
        count: entry ? entry.count : 0,
      });
    }

    // 7. Finance-Type Split (For Donut Chart)
    const financeTypeSplit = [
      { name: 'Daily (தினசரி)', key: 'daily', value: financeTypesMap.daily.lent, count: financeTypesMap.daily.activeLoans, color: '#f59e0b' },
      { name: 'Weekly (வாரத்தவணை)', key: 'weekly', value: financeTypesMap.weekly.lent, count: financeTypesMap.weekly.activeLoans, color: '#3b82f6' },
      { name: 'Monthly (மாதத்தவணை)', key: 'monthly', value: financeTypesMap.monthly.lent, count: financeTypesMap.monthly.activeLoans, color: '#10b981' },
    ];

    // 8. Monthly Profit / Collections Bar Chart (Last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyAggregate = await Payment.aggregate([
      {
        $match: {
          date: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$date' },
          },
          collected: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyMap = {};
    monthlyAggregate.forEach((m) => {
      monthlyMap[m._id] = m.collected;
    });

    const monthlyChartData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const collected = monthlyMap[key] || 0;
      // Est profit proportion approx 12-15% of collection
      const profit = Math.round(collected * 0.15);
      monthlyChartData.push({
        monthKey: key,
        month: `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`,
        collected,
        profit,
      });
    }

    res.status(200).json({
      success: true,
      cards: {
        totalLent: totalStats.totalPrincipal,
        totalCollected: totalStats.totalCollected,
        totalOutstanding: totalStats.totalRemaining,
        activeInterest,
        settledAmount,
        profitFromSettled,
        profitEarned,
        totalLoans: totalStats.totalLoans,
        activeLoans: totalStats.activeLoans,
        overdueLoans: totalStats.overdueLoans,
        completedLoans: totalStats.completedLoans,
      },
      financeTypes: financeTypesMap,
      todayStats: {
        collectedToday: todayCollectedAmount,
        todayPaymentsCount: todayPayments.length,
        dueCount: todayDueList.length,
      },
      todayDueList,
      completedTodayList: todayPayments,
      completedLoansList,
      overdueLoans,
      collectionTrend,
      financeTypeSplit,
      monthlyChartData,
    });
  } catch (error) {
    next(error);
  }
};
