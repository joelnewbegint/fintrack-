import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { connectDB, closeDB } from './config/db.js';
import User from './models/User.js';
import Customer from './models/Customer.js';
import Loan from './models/Loan.js';
import Payment from './models/Payment.js';
import AuditLog from './models/AuditLog.js';
import Settings from './models/Settings.js';
import Investment from './models/Investment.js';

dotenv.config();

export const seedData = async (exitOnComplete = true) => {
  try {
    console.log('🌱 Starting FinTrack Database Seeding...');
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }

    // Clear existing collections
    await User.deleteMany({});
    await Customer.deleteMany({});
    await Loan.deleteMany({});
    await Payment.deleteMany({});
    await AuditLog.deleteMany({});
    await Settings.deleteMany({});
    console.log('🧹 Cleaned existing database records.');

    // 1. Create Default Settings
    const settings = await Settings.create({
      businessName: 'Sri Murugan Finance',
      businessNameTamil: 'ஸ்ரீ முருகன் பைனான்ஸ்',
      ownerName: 'K. Subramanian',
      phone: '+91 98421 12345',
      address: '45, Cross Cut Road, Gandhipuram, Coimbatore - 641012, Tamil Nadu',
      defaultPenaltyPercent: 2,
      graceDays: 1,
      defaultLanguage: 'ta',
      currencySymbol: '₹',
    });
    console.log('🏢 Created business settings:', settings.businessName);

    // 2. Create Users
    const salt = await bcrypt.genSalt(10);
    const ownerHash = await bcrypt.hash('admin123', salt);
    const agentHash = await bcrypt.hash('agent123', salt);

    const owner = await User.create({
      name: 'K. Subramanian (Owner)',
      email: 'owner@fintrack.com',
      phone: '9842112345',
      passwordHash: ownerHash,
      role: 'owner',
      assignedAreas: ['Gandhipuram', 'RS Puram', 'Ukkadam', 'Town Hall', 'Singanallur', 'Simmakkal'],
      status: 'active',
    });

    const agent = await User.create({
      name: 'M. Senthil Kumar (Collection Agent)',
      email: 'agent@fintrack.com',
      phone: '9789054321',
      passwordHash: agentHash,
      role: 'agent',
      assignedAreas: ['Gandhipuram', 'RS Puram', 'Town Hall'],
      status: 'active',
    });
    console.log('👤 Created Users: Owner (owner@fintrack.com) and Agent (agent@fintrack.com)');

    // 2b. Seed Initial Capital Investments
    await Investment.deleteMany({});
    await Investment.create([
      {
        investorName: 'K. Subramanian (சுப்பிரமணியன் - முதன்மை முதலீடு)',
        phone: '9842112345',
        amount: 1500000, // 15 Lakhs
        interestPercent: 0,
        investmentType: 'self',
        startDate: new Date('2026-01-01'),
        paymentMode: 'bank',
        status: 'active',
        totalReturned: 0,
        notes: 'Promoter equity capital for Sri Murugan Finance.',
        addedBy: owner._id,
      },
      {
        investorName: 'P. Shanmugam (சண்முகம் - பங்கு முதலீடு)',
        phone: '9843355112',
        amount: 1000000, // 10 Lakhs
        interestPercent: 12, // 12% p.a.
        investmentType: 'partner',
        startDate: new Date('2026-02-15'),
        paymentMode: 'bank',
        status: 'partially_returned',
        returns: [
          {
            amount: 200000,
            returnDate: new Date('2026-08-01'),
            paymentMode: 'bank',
            notes: 'Partial dividend withdrawal',
          },
        ],
        totalReturned: 200000,
        notes: 'Sleeping partner capital with quarterly profit distribution.',
        addedBy: owner._id,
      },
      {
        investorName: 'Coimbatore City Wholesale Credit Line',
        phone: '9443211000',
        amount: 500000, // 5 Lakhs
        interestPercent: 18, // 1.5% per month
        investmentType: 'borrowed',
        startDate: new Date('2026-06-01'),
        paymentMode: 'bank',
        status: 'active',
        totalReturned: 0,
        notes: 'Wholesale hand-loan credit line for festive season lending.',
        addedBy: owner._id,
      },
    ]);
    console.log('💼 Seeded 3 Private Finance Capital Investments totaling ₹ 30,00,000');
    const customersData = [
      {
        name: 'S. Murugesan (முருகேசன்)',
        phone: '9843210981',
        address: '14, Cross Cut 5th Street, Gandhipuram',
        area: 'Gandhipuram',
        idProofType: 'Aadhaar',
        idProofNumber: '8745 2310 9981',
        guarantor: { name: 'K. Velusamy', phone: '9843210982', address: 'Cross Cut Road', relationship: 'Brother' },
        notes: 'Runs a tea stall near bus stand. Reliable daily payer.',
      },
      {
        name: 'R. Kaliappan (காளியப்பன்)',
        phone: '9786543210',
        address: '88, Diwan Bahadur Road, RS Puram',
        area: 'RS Puram',
        idProofType: 'Aadhaar',
        idProofNumber: '7612 3490 1289',
        guarantor: { name: 'P. Arumugam', phone: '9786543211', address: 'RS Puram', relationship: 'Cousin' },
        notes: 'Vegetable merchant at RS Puram market.',
      },
      {
        name: 'A. Fathima Beevi (பாத்திமா பீவி)',
        phone: '9443128765',
        address: '23, Ukkadam Big Bazaar Street',
        area: 'Ukkadam',
        idProofType: 'Voter ID',
        idProofNumber: 'TN/31/098124',
        guarantor: { name: 'Mohammed Ali', phone: '9443128766', address: 'Ukkadam', relationship: 'Husband' },
        notes: 'Runs tailoring shop and saree boutique.',
      },
      {
        name: 'G. Shanmugam (சண்முகம்)',
        phone: '9944512389',
        address: '52, Big Bazaar Street, Town Hall',
        area: 'Town Hall',
        idProofType: 'Aadhaar',
        idProofNumber: '5421 8901 3467',
        guarantor: { name: 'S. Rajendran', phone: '9944512390', address: 'Town Hall', relationship: 'Neighbor' },
        notes: 'Hardware store owner. Weekly repayment record.',
      },
      {
        name: 'T. Meenakshi (மீனாட்சி)',
        phone: '9629145678',
        address: '102, Kamarajar Road, Singanallur',
        area: 'Singanallur',
        idProofType: 'Ration Card',
        idProofNumber: '03/W/0291823',
        guarantor: { name: 'C. Thangaraj', phone: '9629145679', address: 'Singanallur', relationship: 'Father' },
        notes: 'Flower stall near bus terminus.',
      },
      {
        name: 'P. Selvam (செல்வம்)',
        phone: '9894123456',
        address: '77, Simmakkal North Veli Street',
        area: 'Simmakkal',
        idProofType: 'Aadhaar',
        idProofNumber: '9012 3456 7812',
        guarantor: { name: 'M. Palanivel', phone: '9894123457', address: 'Simmakkal', relationship: 'Uncle' },
        notes: 'Two wheeler workshop owner. Daily thandal.',
      },
      {
        name: 'V. Jayalakshmi (ஜெயலட்சுமி)',
        phone: '9790112233',
        address: '33, Goripalayam Main Road',
        area: 'Simmakkal',
        idProofType: 'Aadhaar',
        idProofNumber: '4455 6677 8899',
        guarantor: { name: 'V. Krishnan', phone: '9790112234', address: 'Goripalayam', relationship: 'Spouse' },
        notes: 'Small catering business.',
      },
      {
        name: 'M. Duraisamy (துரைசாமி)',
        phone: '9488223344',
        address: '19, Fairlands 2nd Cross, Salem',
        area: 'RS Puram',
        idProofType: 'Driving License',
        idProofNumber: 'TN27 20180004521',
        guarantor: { name: 'D. Karthik', phone: '9488223345', address: 'Fairlands', relationship: 'Son' },
        notes: 'Provision store owner. Monthly finance.',
      },
      {
        name: 'S. Banumathi (பானுமதி)',
        phone: '9994012987',
        address: '41, Tirunelveli Town Arch Street',
        area: 'Town Hall',
        idProofType: 'Aadhaar',
        idProofNumber: '3321 8890 1204',
        guarantor: { name: 'K. Subbiah', phone: '9994012988', address: 'Town', relationship: 'Brother' },
        notes: 'Pickles and homemade snacks manufacturer.',
      },
      {
        name: 'K. Annamalai (அண்ணாமலை)',
        phone: '9865123789',
        address: '60, Trichy Road, Singanallur',
        area: 'Singanallur',
        idProofType: 'Aadhaar',
        idProofNumber: '2211 4433 9900',
        guarantor: { name: 'A. Sivaraj', phone: '9865123790', address: 'Singanallur', relationship: 'Friend' },
        notes: 'Auto rickshaw driver and owner.',
      },
    ];

    const createdCustomers = await Customer.insertMany(customersData);
    console.log(`👥 Created ${createdCustomers.length} Tamil Nadu Customers.`);

    // 4. Create Loans & Schedules
    // Let's create a healthy mix:
    // - 5 Daily loans (active, some overdue, some recent)
    // - 3 Weekly loans (active, 1 overdue)
    // - 2 Monthly loans (1 active, 1 completed)

    const today = new Date();

    const generateSchedule = (financeType, duration, installmentAmount, totalPayable, startDate) => {
      const schedule = [];
      let cur = new Date(startDate);
      for (let i = 1; i <= duration; i++) {
        const nextDate = new Date(cur);
        if (financeType === 'daily') nextDate.setDate(nextDate.getDate() + 1);
        else if (financeType === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
        else if (financeType === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
        cur = nextDate;

        let amt = installmentAmount;
        if (i === duration) {
          amt = totalPayable - installmentAmount * (duration - 1);
        }

        schedule.push({
          installmentNo: i,
          dueDate: new Date(cur),
          amount: amt,
          paidAmount: 0,
          status: 'pending',
          paidDate: null,
        });
      }
      return schedule;
    };

    const loanConfigs = [
      // 1. Murugesan - Daily 100 days, started 25 days ago, regular payer
      {
        custIndex: 0,
        type: 'daily',
        principal: 20000,
        interest: 10,
        duration: 100,
        startDaysAgo: 25,
        paidInstallments: 25,
      },
      // 2. Kaliappan - Daily 100 days, started 15 days ago, paid 12 (3 overdue)
      {
        custIndex: 1,
        type: 'daily',
        principal: 10000,
        interest: 10,
        duration: 100,
        startDaysAgo: 15,
        paidInstallments: 12,
      },
      // 3. Fathima - Daily 100 days, started 5 days ago, paid 5
      {
        custIndex: 2,
        type: 'daily',
        principal: 15000,
        interest: 10,
        duration: 100,
        startDaysAgo: 5,
        paidInstallments: 5,
      },
      // 4. Shanmugam - Weekly 15 weeks, started 40 days ago (approx 5-6 weeks), paid 5
      {
        custIndex: 3,
        type: 'weekly',
        principal: 50000,
        interest: 12,
        duration: 15,
        startDaysAgo: 42,
        paidInstallments: 5,
      },
      // 5. Meenakshi - Weekly 10 weeks, started 28 days ago (4 weeks), paid 2 (2 overdue)
      {
        custIndex: 4,
        type: 'weekly',
        principal: 30000,
        interest: 10,
        duration: 10,
        startDaysAgo: 28,
        paidInstallments: 2,
      },
      // 6. Selvam - Daily 100 days, started 60 days ago, paid 60
      {
        custIndex: 5,
        type: 'daily',
        principal: 10000,
        interest: 10,
        duration: 100,
        startDaysAgo: 60,
        paidInstallments: 60,
      },
      // 7. Jayalakshmi - Daily 50 days, started 2 days ago, paid 2
      {
        custIndex: 6,
        type: 'daily',
        principal: 12000,
        interest: 10,
        duration: 50,
        startDaysAgo: 2,
        paidInstallments: 2,
      },
      // 8. Duraisamy - Monthly 10 months, started 120 days ago (4 months), paid 4
      {
        custIndex: 7,
        type: 'monthly',
        principal: 100000,
        interest: 15,
        duration: 10,
        startDaysAgo: 120,
        paidInstallments: 4,
      },
      // 9. Banumathi - Weekly 12 weeks, started 14 days ago (2 weeks), paid 2
      {
        custIndex: 8,
        type: 'weekly',
        principal: 25000,
        interest: 10,
        duration: 12,
        startDaysAgo: 14,
        paidInstallments: 2,
      },
      // 10. Annamalai - Monthly 6 months, completed loan
      {
        custIndex: 9,
        type: 'monthly',
        principal: 50000,
        interest: 10,
        duration: 6,
        startDaysAgo: 200,
        paidInstallments: 6,
      },
    ];

    let totalLoansCreated = 0;
    let totalPaymentsCreated = 0;
    let receiptCounter = 10001;

    for (let idx = 0; idx < loanConfigs.length; idx++) {
      const cfg = loanConfigs[idx];
      const customer = createdCustomers[cfg.custIndex];
      const principal = cfg.principal;
      const totalPayable = principal + (principal * cfg.interest) / 100;
      const installmentAmount = Math.ceil(totalPayable / cfg.duration);

      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - cfg.startDaysAgo);

      const schedule = generateSchedule(
        cfg.type,
        cfg.duration,
        installmentAmount,
        totalPayable,
        startDate
      );
      const endDate = schedule[schedule.length - 1].dueDate;

      const prefix = cfg.type === 'daily' ? 'D' : cfg.type === 'weekly' ? 'W' : 'M';
      const loanNo = `LN-${prefix}26-${1000 + idx}`;

      const loan = await Loan.create({
        loanNo,
        customerId: customer._id,
        principal,
        interestPercent: cfg.interest,
        financeType: cfg.type,
        duration: cfg.duration,
        installmentAmount,
        totalPayable,
        startDate,
        endDate,
        status: 'active',
        totalPenalties: 0,
        totalCollected: 0,
        remainingBalance: totalPayable,
        schedule,
        notes: `Standard ${cfg.type} scheme agreement`,
      });

      totalLoansCreated++;

      // Create payments up to paidInstallments
      let collectedSoFar = 0;
      for (let p = 0; p < cfg.paidInstallments; p++) {
        const inst = loan.schedule[p];
        inst.paidAmount = inst.amount;
        inst.status = 'paid';
        inst.paidDate = new Date(inst.dueDate);
        collectedSoFar += inst.amount;

        const receiptNo = `RCP-26-${receiptCounter++}`;
        const mode = p % 3 === 0 ? 'upi' : 'cash';

        await Payment.create({
          receiptNo,
          loanId: loan._id,
          customerId: customer._id,
          amount: inst.amount,
          date: inst.paidDate,
          mode,
          collectedBy: p % 2 === 0 ? owner._id : agent._id,
          notes: `Installment #${inst.installmentNo} collection (${mode.toUpperCase()})`,
        });

        totalPaymentsCreated++;
      }

      // Check remaining schedule for overdue status
      const now = new Date();
      let hasOverdue = false;
      for (let s = cfg.paidInstallments; s < loan.schedule.length; s++) {
        const inst = loan.schedule[s];
        if (new Date(inst.dueDate) < now) {
          inst.status = 'overdue';
          hasOverdue = true;
        }
      }

      loan.totalCollected = collectedSoFar;
      loan.remainingBalance = Math.max(0, totalPayable - collectedSoFar);

      if (loan.remainingBalance === 0) {
        loan.status = 'completed';
      } else if (hasOverdue) {
        loan.status = 'overdue';
        loan.totalPenalties = 200; // Realistic sample penalty
      } else {
        loan.status = 'active';
      }

      await loan.save();
    }

    console.log(
      `💰 Created ${totalLoansCreated} loans and ${totalPaymentsCreated} payment receipts across Daily, Weekly, and Monthly schemes.`
    );
    console.log('🎉 Seed complete! Ready for FinTrack production.');
    if (exitOnComplete) {
      await closeDB();
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    if (exitOnComplete) process.exit(1);
  }
};

export default seedData;

// Run directly if invoked via CLI
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedData(true);
}
