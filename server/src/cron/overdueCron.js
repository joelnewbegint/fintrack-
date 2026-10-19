import cron from 'node-cron';
import Loan from '../models/Loan.js';
import Settings from '../models/Settings.js';
import AuditLog from '../models/AuditLog.js';

export const checkOverdueLoans = async () => {
  try {
    console.log('⏰ Running daily overdue & late penalty inspection...');
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const settings = await Settings.findOne({});
    const graceDays = settings?.graceDays || 1;
    const defaultPenaltyPercent = settings?.defaultPenaltyPercent || 2;

    const activeLoans = await Loan.find({
      status: { $in: ['active', 'overdue'] },
    });

    let updatedCount = 0;
    let penaltyTotal = 0;

    for (const loan of activeLoans) {
      let isLoanOverdue = false;
      let loanPenalties = 0;

      for (const inst of loan.schedule) {
        if (inst.status !== 'paid') {
          const dueDate = new Date(inst.dueDate);
          const graceDueDate = new Date(dueDate);
          graceDueDate.setDate(graceDueDate.getDate() + graceDays);

          if (graceDueDate < todayMidnight) {
            inst.status = 'overdue';
            isLoanOverdue = true;

            // Apply penalty if not already calculated
            const penaltyRate = loan.latePenaltyRate || defaultPenaltyPercent;
            const penalty = Math.round((inst.amount * penaltyRate) / 100);
            loanPenalties += penalty;
          }
        }
      }

      const originalStatus = loan.status;
      if (isLoanOverdue && loan.status !== 'overdue') {
        loan.status = 'overdue';
      } else if (!isLoanOverdue && loan.status === 'overdue') {
        loan.status = 'active';
      }

      if (loanPenalties > (loan.totalPenalties || 0)) {
        loan.totalPenalties = loanPenalties;
        penaltyTotal += loanPenalties;
      }

      if (loan.isModified()) {
        await loan.save();
        updatedCount++;
      }
    }

    console.log(
      `✅ Overdue check completed: ${updatedCount} loan(s) updated, total penalty applied: ₹${penaltyTotal}`
    );
  } catch (error) {
    console.error('❌ Error during overdue cron check:', error.message);
  }
};

export const initCronJobs = () => {
  // Run everyday at 00:05 AM
  cron.schedule('5 0 * * *', async () => {
    await checkOverdueLoans();
  });

  // Also run 10 seconds after server startup
  setTimeout(() => {
    checkOverdueLoans();
  }, 10000);
};
