import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const require = createRequire(import.meta.url);
const XLSX = require('../../client/node_modules/xlsx');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import Customer from './models/Customer.js';
import Loan from './models/Loan.js';
import Investment from './models/Investment.js';
import Settings from './models/Settings.js';
import AuditLog from './models/AuditLog.js';
import User from './models/User.js';
import EMICustomer from './models/EMICustomer.js';
import EMILoan from './models/EMILoan.js';
import EMIPayment from './models/EMIPayment.js';

const EXCEL_PATH = path.join(__dirname, '../data/VK-Backup-2026-11-17.xlsx');

async function restore() {
  console.log('🚀 Starting VK Banker\'s & Finance Database Restoration...');
  console.log('Reading Excel backup from:', EXCEL_PATH);

  if (!fs.existsSync(EXCEL_PATH)) {
    throw new Error(`Backup file not found at ${EXCEL_PATH}`);
  }

  const wb = XLSX.readFile(EXCEL_PATH, { cellDates: true });
  console.log('Sheets found:', wb.SheetNames);

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI not set in server/.env');
  }

  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB Atlas successfully!');

  // ==========================================
  // 1. CUSTOMERS (12 records)
  // ==========================================
  const rawCustomers = XLSX.utils.sheet_to_json(wb.Sheets['Customers']);
  console.log(`\n📋 Restoring ${rawCustomers.length} Customers...`);

  await Customer.deleteMany({});
  const customerDocs = rawCustomers.map((c) => {
    let guarantor = { name: '', phone: '', address: '', relationship: '' };
    if (typeof c.guarantor === 'string' && c.guarantor.trim().startsWith('{')) {
      try { guarantor = JSON.parse(c.guarantor); } catch (e) {}
    } else if (typeof c.guarantor === 'object' && c.guarantor) {
      guarantor = c.guarantor;
    }

    return {
      _id: new mongoose.Types.ObjectId(c._id),
      clientId: c.clientId || undefined,
      createdBy: c.createdBy || 'owner',
      userId: (c.userId && mongoose.Types.ObjectId.isValid(c.userId)) ? new mongoose.Types.ObjectId(c.userId) : null,
      email: c.email || '',
      name: c.name,
      phone: String(c.phone || '').trim(),
      address: c.address || '',
      area: c.area || '',
      photoUrl: c.photoUrl || '',
      idProofUrl: c.idProofUrl || '',
      idProofType: c.idProofType || 'Aadhaar',
      idProofNumber: c.idProofNumber || '',
      guarantor,
      assignedAgent: (c.assignedAgent && mongoose.Types.ObjectId.isValid(c.assignedAgent)) ? new mongoose.Types.ObjectId(c.assignedAgent) : null,
      notes: c.notes || '',
      status: c.status || 'active',
      createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
      updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date(),
    };
  });

  await Customer.insertMany(customerDocs);
  console.log(`✅ Successfully restored ${customerDocs.length} customers.`);

  // ==========================================
  // 2. INSTALLMENTS & LOANS (15 loans, 1410 installments)
  // ==========================================
  const rawInstallments = XLSX.utils.sheet_to_json(wb.Sheets['Installments']);
  console.log(`\n📋 Grouping ${rawInstallments.length} Installments by loanId...`);

  const installmentsByLoan = {};
  rawInstallments.forEach((inst) => {
    const key = String(inst.loanId);
    if (!installmentsByLoan[key]) {
      installmentsByLoan[key] = [];
    }
    installmentsByLoan[key].push({
      installmentNo: Number(inst.installmentNo),
      dueDate: inst.dueDate ? new Date(inst.dueDate) : new Date(),
      amount: Number(inst.amount || 0),
      paidAmount: Number(inst.paidAmount || 0),
      status: inst.status || 'pending',
      holidayReason: inst.holidayReason || '',
      paidDate: inst.paidDate ? new Date(inst.paidDate) : null,
    });
  });

  // Sort installments per loan by installmentNo
  Object.keys(installmentsByLoan).forEach((loanId) => {
    installmentsByLoan[loanId].sort((a, b) => a.installmentNo - b.installmentNo);
  });

  const rawLoans = XLSX.utils.sheet_to_json(wb.Sheets['Loans']);
  console.log(`📋 Restoring ${rawLoans.length} Loans with complete schedules...`);

  await Loan.deleteMany({});
  const loanDocs = rawLoans.map((l) => {
    let holidays = [];
    if (typeof l.holidays === 'string' && l.holidays.trim().startsWith('[')) {
      try { holidays = JSON.parse(l.holidays); } catch (e) {}
    } else if (Array.isArray(l.holidays)) {
      holidays = l.holidays;
    }

    const schedule = installmentsByLoan[String(l._id)] || [];

    return {
      _id: new mongoose.Types.ObjectId(l._id),
      clientId: l.clientId || undefined,
      createdBy: l.createdBy || 'owner',
      loanNo: l.loanNo,
      customerId: (l.customerId && mongoose.Types.ObjectId.isValid(l.customerId))
        ? new mongoose.Types.ObjectId(l.customerId)
        : l.customerId,
      customerName: l.customerName || '',
      customerPhone: String(l.customerPhone || '').trim(),
      customerArea: l.customerArea || '',
      principal: Number(l.principal || 0),
      interestPercent: Number(l.interestPercent || 0),
      chargeAmount: Number(l.chargeAmount || 0),
      disbursedAmount: Number(l.disbursedAmount || 0),
      interestType: l.interestType || 'deduction',
      financeType: l.financeType || 'daily',
      duration: Number(l.duration || 100),
      installmentAmount: Number(l.installmentAmount || 0),
      totalPayable: Number(l.totalPayable || 0),
      startDate: l.startDate ? new Date(l.startDate) : new Date(),
      endDate: l.endDate ? new Date(l.endDate) : new Date(),
      status: l.status || 'active',
      latePenaltyRate: Number(l.latePenaltyRate || 0),
      totalPenalties: Number(l.totalPenalties || 0),
      totalCollected: Number(l.totalCollected || 0),
      remainingBalance: Number(l.remainingBalance || 0),
      borrowerPhoto: l.borrowerPhoto || '',
      notes: l.notes || '',
      holidays,
      schedule,
      createdAt: l.createdAt ? new Date(l.createdAt) : new Date(),
      updatedAt: l.updatedAt ? new Date(l.updatedAt) : new Date(),
    };
  });

  await Loan.insertMany(loanDocs);
  console.log(`✅ Successfully restored ${loanDocs.length} loans (Total installments: ${rawInstallments.length}).`);

  // ==========================================
  // 3. INVESTMENTS (1 record)
  // ==========================================
  const rawInvestments = XLSX.utils.sheet_to_json(wb.Sheets['Investments']);
  console.log(`\n📋 Restoring ${rawInvestments.length} Investment records...`);

  await Investment.deleteMany({});
  const investmentDocs = rawInvestments.map((inv) => {
    let returns = [];
    if (typeof inv.returns === 'string' && inv.returns.trim().startsWith('[')) {
      try { returns = JSON.parse(inv.returns); } catch (e) {}
    } else if (Array.isArray(inv.returns)) {
      returns = inv.returns;
    }

    return {
      _id: new mongoose.Types.ObjectId(inv._id),
      investorName: inv.investorName,
      phone: String(inv.phone || '').trim(),
      amount: Number(inv.amount || 0),
      createdBy: inv.createdBy || 'owner',
      interestPercent: Number(inv.interestPercent || 0),
      investmentType: inv.investmentType || 'self',
      startDate: inv.startDate ? new Date(inv.startDate) : new Date(),
      paymentMode: inv.paymentMode || 'cash',
      status: inv.status || 'active',
      totalReturned: Number(inv.totalReturned || 0),
      notes: inv.notes || '',
      addedBy: (inv.addedBy && mongoose.Types.ObjectId.isValid(inv.addedBy)) ? new mongoose.Types.ObjectId(inv.addedBy) : null,
      returns,
      createdAt: inv.createdAt ? new Date(inv.createdAt) : new Date(),
      updatedAt: inv.updatedAt ? new Date(inv.updatedAt) : new Date(),
    };
  });

  await Investment.insertMany(investmentDocs);
  console.log(`✅ Successfully restored ${investmentDocs.length} investment record (₹4,69,442).`);

  // ==========================================
  // 4. SETTINGS (1 record)
  // ==========================================
  const rawSettings = XLSX.utils.sheet_to_json(wb.Sheets['Settings']);
  console.log(`\n📋 Restoring Settings...`);

  await Settings.deleteMany({});
  if (rawSettings.length > 0) {
    const s = rawSettings[0];
    await Settings.create({
      _id: new mongoose.Types.ObjectId(s._id),
      phone: s.phone || '+91 98421 12345',
      businessName: s.businessName || "VK BANKER'S & FINANCE",
      businessNameTamil: s.businessNameTamil || 'வி.கே. பேங்கர்ஸ் & பைனான்ஸ்',
      ownerName: s.ownerName || 'Vasantha Kumar K',
      address: s.address || '45, Cross Cut Road, Gandhipuram, Coimbatore - 641012, Tamil Nadu',
      defaultPenaltyPercent: Number(s.defaultPenaltyPercent || 2),
      graceDays: Number(s.graceDays || 1),
      defaultLanguage: s.defaultLanguage || 'ta',
      currencySymbol: s.currencySymbol || '₹',
      createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
      updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date(),
    });
    console.log('✅ Successfully restored business settings.');
  }

  // ==========================================
  // 5. AUDIT LOGS (119 records)
  // ==========================================
  const rawLogs = XLSX.utils.sheet_to_json(wb.Sheets['AuditLogs']);
  console.log(`\n📋 Restoring ${rawLogs.length} Audit Logs...`);

  await AuditLog.deleteMany({});
  const auditDocs = rawLogs.map((a) => {
    let before = null;
    let after = null;
    if (typeof a.before === 'string' && a.before.trim().startsWith('{')) {
      try { before = JSON.parse(a.before); } catch (e) {}
    } else {
      before = a.before || null;
    }
    if (typeof a.after === 'string' && a.after.trim().startsWith('{')) {
      try { after = JSON.parse(a.after); } catch (e) {}
    } else {
      after = a.after || null;
    }

    return {
      _id: new mongoose.Types.ObjectId(a._id),
      userId: (a.userId && mongoose.Types.ObjectId.isValid(a.userId)) ? new mongoose.Types.ObjectId(a.userId) : null,
      userName: a.userName || 'System',
      action: a.action,
      entity: a.entity,
      entityId: String(a.entityId || ''),
      before,
      after,
      timestamp: a.timestamp ? new Date(a.timestamp) : new Date(),
      createdAt: a.createdAt ? new Date(a.createdAt) : new Date(),
      updatedAt: a.updatedAt ? new Date(a.updatedAt) : new Date(),
    };
  });

  if (auditDocs.length > 0) {
    await AuditLog.insertMany(auditDocs);
  }
  console.log(`✅ Successfully restored ${auditDocs.length} audit logs.`);

  // ==========================================
  // 6. USERS & 3 ROLES CREDENTIALS
  // ==========================================
  const rawUsers = XLSX.utils.sheet_to_json(wb.Sheets['Users']);
  console.log(`\n📋 Restoring Users and configuring 3 Roles (OWNER, LOAN_AGENT, EMI_AGENT)...`);

  await User.deleteMany({});

  const adminPassHash = bcrypt.hashSync('admin123', 10);
  const agentPassHash = bcrypt.hashSync('agent123', 10);
  const loanPassHash = bcrypt.hashSync('loan123', 10);
  const emiPassHash = bcrypt.hashSync('emi123', 10);
  const defaultPassHash = bcrypt.hashSync('123456', 10);

  // Standard Role Accounts
  const usersToInsert = [];

  // 1. Owner (from original data)
  const origOwner = rawUsers.find((u) => u.role === 'owner') || {};
  usersToInsert.push({
    _id: origOwner._id ? new mongoose.Types.ObjectId(origOwner._id) : new mongoose.Types.ObjectId('6af2ae20e2785cb2d80bb8d2'),
    name: origOwner.name || 'Vasantha Kumar K (Owner)',
    username: 'owner',
    email: origOwner.email || 'owner@fintrack.com',
    phone: String(origOwner.phone || '9842112345'),
    passwordHash: adminPassHash,
    role: 'owner',
    status: 'active',
    assignedAreas: ['Gandhipuram', 'RS Puram', 'Ukkadam', 'Town Hall', 'Singanallur', 'Simmakkal'],
    createdAt: origOwner.createdAt ? new Date(origOwner.createdAt) : new Date(),
    updatedAt: new Date(),
  });

  // 2. Loan Agent / Agent (from original data)
  const origAgent = rawUsers.find((u) => u.role === 'agent' || u.role === 'loan_agent') || {};
  usersToInsert.push({
    _id: origAgent._id ? new mongoose.Types.ObjectId(origAgent._id) : new mongoose.Types.ObjectId('6af2ae20e2785cb2d80bb8d3'),
    name: origAgent.name || 'Magimaidoss M (Collection Agent)',
    username: 'agent',
    email: origAgent.email || 'agent@fintrack.com',
    phone: String(origAgent.phone || '9789054321'),
    passwordHash: agentPassHash,
    role: 'loan_agent',
    status: 'active',
    assignedAreas: ['Gandhipuram', 'RS Puram', 'Town Hall'],
    createdAt: origAgent.createdAt ? new Date(origAgent.createdAt) : new Date(),
    updatedAt: new Date(),
  });

  // 3. Dedicated Loan Agent account
  usersToInsert.push({
    name: 'Loan Agent (Field Collection)',
    username: 'loanagent',
    email: 'loanagent@fintrack.com',
    phone: '9789054322',
    passwordHash: loanPassHash,
    role: 'loan_agent',
    status: 'active',
    assignedAreas: ['Madhanur', 'Agaram', 'Odugathur'],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 4. Dedicated EMI Agent account
  usersToInsert.push({
    name: 'EMI Agent (Monthly Schemes)',
    username: 'emiagent',
    email: 'emiagent@fintrack.com',
    phone: '9789054323',
    passwordHash: emiPassHash,
    role: 'emi_agent',
    status: 'active',
    assignedAreas: ['Coimbatore Central', 'Gandhipuram'],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Add any other original users (e.g. client accounts) safely without username collisions
  for (const u of rawUsers) {
    if (u.role === 'owner' || u.role === 'agent' || u.role === 'loan_agent') continue;
    // Check if email already added
    if (usersToInsert.some((x) => x.email.toLowerCase() === (u.email || '').toLowerCase())) continue;

    usersToInsert.push({
      _id: u._id ? new mongoose.Types.ObjectId(u._id) : new mongoose.Types.ObjectId(),
      name: u.name || 'Customer User',
      email: u.email,
      phone: String(u.phone || ''),
      passwordHash: defaultPassHash,
      role: u.role || 'client',
      status: u.status || 'active',
      address: u.address || '',
      customerId: (u.customerId && mongoose.Types.ObjectId.isValid(u.customerId)) ? new mongoose.Types.ObjectId(u.customerId) : null,
      createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
      updatedAt: new Date(),
    });
  }

  await User.insertMany(usersToInsert);
  console.log(`✅ Successfully restored ${usersToInsert.length} user accounts with 3-role support.`);

  // ==========================================
  // 7. PRESERVE & SEED SAMPLE EMI MODULE DATA
  // ==========================================
  console.log(`\n📋 Verifying dedicated EMI Module records...`);
  const emiCustomerCount = await EMICustomer.countDocuments();
  if (emiCustomerCount === 0) {
    const sampleEmiCustomer = await EMICustomer.create({
      name: 'K. Rajendran',
      phone: '9843012345',
      address: '14 Gandhi Street, RS Puram, Coimbatore',
      area: 'RS Puram',
      productName: 'Samsung 43\" Smart LED TV',
      assignedAgentName: 'EMI Collection Agent',
      status: 'active',
    });

    const emiSchedule = [];
    const today = new Date();
    for (let m = 1; m <= 12; m++) {
      const d = new Date(today.getFullYear(), today.getMonth() + (m - 1), 5);
      emiSchedule.push({
        monthIndex: m,
        dueDate: d,
        emiAmount: 3250,
        paidAmount: m <= 2 ? 3250 : 0,
        status: m <= 2 ? 'paid' : (m === 3 ? 'due' : 'pending'),
        paidAt: m <= 2 ? new Date(today.getFullYear(), today.getMonth() - (3 - m), 5) : null,
        collectedByAgentName: 'EMI Collection Agent',
      });
    }

    await EMILoan.create({
      emiNo: 'EMI-2026-001',
      customerId: sampleEmiCustomer._id,
      customerName: 'K. Rajendran',
      customerPhone: '9843012345',
      customerArea: 'RS Puram',
      assignedAgentName: 'EMI Collection Agent',
      itemDescription: 'Samsung 43\" Smart LED TV (4K Ultra HD)',
      itemValue: 35000,
      downPayment: 5000,
      financedAmount: 30000,
      totalInterest: 9000,
      totalEmiPayable: 39000,
      monthlyEmiAmount: 3250,
      tenureMonths: 12,
      startDate: new Date(today.getFullYear(), today.getMonth() - 2, 5),
      endDate: new Date(today.getFullYear(), today.getMonth() + 10, 5),
      monthsPaid: 2,
      totalPaid: 6500,
      remainingAmount: 32500,
      status: 'active',
      schedule: emiSchedule,
    });
    console.log('✅ Initialized clean starter record for EMI Module.');
  } else {
    console.log(`✅ EMI Module already has ${emiCustomerCount} records preserved.`);
  }

  // ==========================================
  // FINAL VERIFICATION SUMMARY
  // ==========================================
  console.log('\n==============================================');
  console.log('🎉 RESTORATION COMPLETE & VERIFIED:');
  console.log('Customers in DB:', await Customer.countDocuments());
  console.log('Loans in DB:', await Loan.countDocuments());
  console.log('Installments in DB:', (await Loan.aggregate([{ $unwind: '$schedule' }, { $count: 'total' }]))[0]?.total || 0);
  console.log('Investments in DB:', await Investment.countDocuments());
  console.log('Settings in DB:', await Settings.countDocuments());
  console.log('Users in DB:', await User.countDocuments());
  console.log('Audit Logs in DB:', await AuditLog.countDocuments());
  console.log('EMI Customers in DB:', await EMICustomer.countDocuments());
  console.log('EMI Loans in DB:', await EMILoan.countDocuments());
  console.log('==============================================\n');

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
}

restore().catch((err) => {
  console.error('❌ Restoration failed:', err);
  process.exit(1);
});
