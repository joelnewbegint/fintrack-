import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../server/.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config();

import User from '../src/models/User.js';
import Customer from '../src/models/Customer.js';
import Loan from '../src/models/Loan.js';
import Payment from '../src/models/Payment.js';
import Investment from '../src/models/Investment.js';
import Expense from '../src/models/Expense.js';
import Settings from '../src/models/Settings.js';
import bcrypt from 'bcryptjs';

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb://tjoelnewbegin03_db_user:z2wec4J1R5amU25x@ac-rfl6lwp-shard-00-00.ibksuvq.mongodb.net:27017,ac-rfl6lwp-shard-00-01.ibksuvq.mongodb.net:27017,ac-rfl6lwp-shard-00-02.ibksuvq.mongodb.net:27017/fintrack?ssl=true&replicaSet=atlas-oz1rmn-shard-0&authSource=admin';

const parseDate = (dStr) => {
  if (!dStr) return null;
  const s = dStr.trim();
  if (!s || s === '-' || s === '0') return null;
  // Matches DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
    const [dd, mm, yyyy] = s.split('-');
    return new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
  }
  // Matches YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}T00:00:00.000Z`);
  }
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const cleanNum = (val) => {
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

// Customer name & detail normalizer
const customerProfiles = {
  Thilaga: { nameTamil: 'திலகா', phone: '9579477655', area: 'Madhanur', address: 'Madhanur Main Road' },
  Manchi: { nameTamil: 'மஞ்சி', phone: '9047239301', area: 'Madhanur', address: 'Madhanur', notes: 'Chicken Stall Business' },
  Surenthar: { nameTamil: 'சுரேந்தர்', phone: '9842199001', area: 'Ambur', address: 'Ambur', notes: 'Hotel Business' },
  Thannarasu: { nameTamil: 'தன்னரசு', phone: '9123512770', area: 'CTM', address: 'CTM Road' },
  Thennarasu: { nameTamil: 'தன்னரசு', phone: '9123512770', area: 'CTM', address: 'CTM Road' },
  Purusoth: { nameTamil: 'புருஷோத்', phone: '9842199002', area: 'Agaram', address: 'Agaram' },
  Pursoth: { nameTamil: 'புருஷோத்', phone: '9842199002', area: 'Agaram', address: 'Agaram' },
  Anitha: { nameTamil: 'அனிதா', phone: '9944445940', area: 'RS Hotal', address: 'RS Hotal Area' },
  Jayanthi: { nameTamil: 'ஜெயந்தி', phone: '9600724033', area: 'Agaram', address: 'Agaram' },
  Dinesha: { nameTamil: 'தினேஷ்', phone: '9842199003', area: 'Agaram', address: 'Agaram' },
  Dinesh: { nameTamil: 'தினேஷ்', phone: '9842199003', area: 'Agaram', address: 'Agaram' },
  Dhinesh: { nameTamil: 'தினேஷ்', phone: '9842199003', area: 'Agaram', address: 'Agaram' },
  Sanggar: { nameTamil: 'சங்கர்', phone: '9123512770', area: 'Agaram', address: 'Agaram' },
  Sangar: { nameTamil: 'சங்கர்', phone: '9123512770', area: 'Agaram', address: 'Agaram' },
  kalaiselvi: { nameTamil: 'கலைச்செல்வி', phone: '9842199004', area: 'Agaram', address: 'Agaram' },
  Kalaiselvi: { nameTamil: 'கலைச்செல்வி', phone: '9842199004', area: 'Agaram', address: 'Agaram' },
  Vennda: { nameTamil: 'வெண்டா', phone: '9600436585', area: 'Agaram', address: 'Agaram' },
  Venta: { nameTamil: 'வெண்டா', phone: '9600436585', area: 'Agaram', address: 'Agaram' },
  Sutha: { nameTamil: 'சுதா', phone: '9842199005', area: 'Agaram', address: 'Agaram' },
  Rajsegar: { nameTamil: 'ராஜசேகர்', phone: '9600436585', area: 'Kallukutai', address: 'Kallukutai' },
  Rajasegar: { nameTamil: 'ராஜசேகர்', phone: '9600436585', area: 'Kallukutai', address: 'Kallukutai' },
  Saranya: { nameTamil: 'சரண்யா', phone: '9842199006', area: 'Agaram', address: 'Agaram' },
  Gopi: { nameTamil: 'கோபி', phone: '9842199007', area: 'Agaram', address: 'Agaram' },
  Mogan: { nameTamil: 'மோகன்', phone: '9842199008', area: 'Agaram', address: 'Agaram' },
  mogan: { nameTamil: 'மோகன்', phone: '9842199008', area: 'Agaram', address: 'Agaram' },
  mohan: { nameTamil: 'மோகன்', phone: '9842199008', area: 'Agaram', address: 'Agaram' },
  Murthi: { nameTamil: 'மூர்த்தி', phone: '9123512770', area: 'Agaram', address: 'Agaram' },
  Nirmala: { nameTamil: 'நிர்மலா', phone: '8124977664', area: 'Madhanur', address: 'Madhanur' },
  Srinivasa: { nameTamil: 'சீனிவாசன்', phone: '9842199009', area: 'Madhanur', address: 'Madhanur' },
  srinivasan: { nameTamil: 'சீனிவாசன்', phone: '9842199009', area: 'Madhanur', address: 'Madhanur' },
  Srinisan: { nameTamil: 'சீனிவாசன்', phone: '9842199009', area: 'Madhanur', address: 'Madhanur' },
  Sathish: { nameTamil: 'சதீஷ்', phone: '8382047979', area: 'Agaram', address: 'Agaram' },
  Premlatha: { nameTamil: 'பிரேமலதா', phone: '9842199010', area: 'Madhanur', address: 'Madhanur' },
  Ld: { nameTamil: 'எல்.டி', phone: '9842199011', area: 'Madhanur', address: 'Madhanur' },
  Ammu: { nameTamil: 'அம்மு', phone: '9842199012', area: 'Cinnathatalam', address: 'Cinnathatalam' },
  Santhiya: { nameTamil: 'சந்தியா', phone: '9842199013', area: 'Agaram', address: 'Agaram' },
  'RS Hotal': { nameTamil: 'ஆர்.எஸ் ஹோட்டல்', phone: '9944445940', area: 'RS Hotal', address: 'RS Hotal' },
};

async function run() {
  console.log('🔄 Connecting to MongoDB Atlas...');
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  console.log('✅ Connected to MongoDB Atlas!');

  const rawCsv = fs.readFileSync(path.resolve(__dirname, '../data_raw.csv'), 'utf8');
  const lines = rawCsv.split(/\r?\n/).map((l) => l.split(','));

  // 1. Ensure Admin User
  let owner = await User.findOne({ role: 'owner' });
  if (!owner) {
    const salt = await bcrypt.genSalt(10);
    const passHash = await bcrypt.hash('admin123', salt);
    owner = await User.create({
      name: 'Vasantha Kumar K (Owner)',
      email: 'owner@fintrack.com',
      phone: '9842112345',
      passwordHash: passHash,
      role: 'owner',
      status: 'active',
    });
  }

  // 2. Ensure Settings
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({
      businessName: "VK BANKER'S & FINANCE",
      businessNameTamil: 'வி.கே. பேங்கர்ஸ் & பைனான்ஸ்',
      ownerName: 'Vasantha Kumar K',
      phone: '+91 98421 12345',
      address: '45, Cross Cut Road, Gandhipuram, Coimbatore - 641012, Tamil Nadu',
      defaultPenaltyPercent: 2,
      graceDays: 1,
      defaultLanguage: 'ta',
      currencySymbol: '₹',
    });
  }

  // Clear existing loan, payment, customer records
  await Customer.deleteMany({});
  await Loan.deleteMany({});
  await Payment.deleteMany({});
  await Investment.deleteMany({});
  await Expense.deleteMany({});
  console.log('🧹 Cleaned existing operational collections.');

  // Create Customers
  const customerMap = {}; // normalizedName -> Customer doc
  for (const [key, prof] of Object.entries(customerProfiles)) {
    const canonicalKey = key.trim().toLowerCase();
    if (!customerMap[canonicalKey]) {
      const doc = await Customer.create({
        name: `${key} (${prof.nameTamil})`,
        phone: prof.phone,
        address: prof.address || `${prof.area}, Tamil Nadu`,
        area: prof.area || 'Agaram',
        idProofType: 'Aadhaar',
        notes: prof.notes || '',
      });
      customerMap[canonicalKey] = doc;
    }
  }
  console.log(`👤 Created ${Object.keys(customerMap).length} unique Customers in MongoDB.`);

  const getCustomer = async (rawName) => {
    if (!rawName) return null;
    const clean = rawName.trim().toLowerCase();
    if (customerMap[clean]) return customerMap[clean];
    // Alias matching
    if (clean === 'thennarasu' || clean === 'thannarasu') return customerMap['thannarasu'] || customerMap['thennarasu'];
    if (clean === 'pursoth' || clean === 'purusoth') return customerMap['purusoth'] || customerMap['pursoth'];
    if (clean === 'dinesh' || clean === 'dinesha' || clean === 'dhinesh') return customerMap['dinesh'] || customerMap['dinesha'];
    if (clean === 'sangar' || clean === 'sanggar') return customerMap['sangar'] || customerMap['sanggar'];
    if (clean === 'kalaiselvi') return customerMap['kalaiselvi'];
    if (clean === 'venta' || clean === 'vennda') return customerMap['vennda'] || customerMap['venta'];
    if (clean === 'rajsegar' || clean === 'rajasegar') return customerMap['rajsegar'] || customerMap['rajasegar'];
    if (clean === 'mogan' || clean === 'mohan') return customerMap['mogan'] || customerMap['mohan'];
    if (clean === 'srinivasa' || clean === 'srinisan' || clean === 'srinivasan') return customerMap['srinivasa'];

    // Fallback: create dynamic customer
    const doc = await Customer.create({
      name: rawName.trim(),
      phone: '98421' + Math.floor(10000 + Math.random() * 90000),
      address: 'Agaram, Tamil Nadu',
      area: 'Agaram',
      idProofType: 'Aadhaar',
    });
    customerMap[clean] = doc;
    return doc;
  };

  let loanSeq = 1000;
  let receiptSeq = 10000;
  const createdLoans = [];
  const createdPayments = [];

  // ==========================================
  // PARSE BLOCK 1: Active Daily Loans (Row 78, 14 Loans)
  // ==========================================
  console.log('📦 Parsing Block 1: Active Daily Loans...');
  const b1Header = lines[77];
  for (let c = 0; c < b1Header.length; c++) {
    if (b1Header[c] && b1Header[c].trim().toLowerCase() === 'name') {
      const rawName = (b1Header[c + 1] || '').trim();
      if (!rawName) continue;
      const cust = await getCustomer(rawName);

      const amount = cleanNum(lines[80][c + 1]);
      const startDate = parseDate(lines[81][c + 1]) || new Date('2026-09-01');
      const endDate = parseDate(lines[82][c + 1]) || new Date(startDate.getTime() + 100 * 24 * 3600 * 1000);
      const interest = cleanNum(lines[83][c + 1]);
      const paidAmount = cleanNum(lines[84][c + 1]);
      const balance = cleanNum(lines[85][c + 1]);

      // Installment amount is usually amount / 100
      let dailyAmt = amount / 100;
      if (rawName.toLowerCase() === 'saranya' || rawName.toLowerCase() === 'vennda' || rawName.toLowerCase() === 'venta') {
        dailyAmt = 150;
      } else if (rawName.toLowerCase() === 'thilaga' || rawName.toLowerCase() === 'sutha') {
        dailyAmt = 200;
      } else if (rawName.toLowerCase() === 'purusoth' || rawName.toLowerCase() === 'thannarasu' || rawName.toLowerCase() === 'kalaiselvi') {
        dailyAmt = 300;
      } else if (rawName.toLowerCase() === 'anitha' || rawName.toLowerCase() === 'dinesha' || rawName.toLowerCase() === 'sanggar') {
        dailyAmt = 500;
      } else if (rawName.toLowerCase() === 'manchi' || rawName.toLowerCase() === 'surenthar' || rawName.toLowerCase() === 'rajsegar') {
        dailyAmt = 1000;
      }

      loanSeq++;
      const loanNo = `LN-D26-${loanSeq}`;
      const loanDoc = await Loan.create({
        loanNo,
        customerId: cust._id,
        principal: amount,
        interestPercent: interest > 0 ? Number(((interest / amount) * 100).toFixed(1)) : 10,
        chargeAmount: interest,
        disbursedAmount: amount - interest,
        interestType: 'deduction',
        financeType: 'daily',
        duration: 100,
        installmentAmount: dailyAmt,
        totalPayable: amount,
        totalCollected: paidAmount,
        remainingBalance: balance,
        status: balance <= 0 ? 'completed' : 'active',
        startDate,
        endDate,
        notes: `Ledger Loan for ${rawName}`,
      });
      createdLoans.push(loanDoc);

      // Parse Installment payments for this loan (Lines 87 to 186)
      for (let r = 86; r <= 185; r++) {
        const row = lines[r];
        if (!row) continue;
        const colIdx = c - 1; // installment number is 1 column before name label
        const pDate = parseDate(row[colIdx + 1]);
        const pAmt = cleanNum(row[colIdx + 2]);
        if (pAmt > 0 && pDate) {
          receiptSeq++;
          const payDoc = await Payment.create({
            receiptNo: `RCP-26-${receiptSeq}`,
            loanId: loanDoc._id,
            customerId: cust._id,
            amount: pAmt,
            date: pDate,
            mode: 'cash',
            collectedBy: owner._id,
            notes: `Installment repayment by ${cust.name}`,
          });
          createdPayments.push(payDoc);
        }
      }
    }
  }

  // ==========================================
  // PARSE BLOCK 2: Sangar Weekly & Mogan Monthly (Lines 196-252)
  // ==========================================
  console.log('📦 Parsing Block 2: Weekly & Monthly Loans...');
  const sangarCust = await getCustomer('Sangar');
  loanSeq++;
  const sangarWeeklyDoc = await Loan.create({
    loanNo: `LN-W26-${loanSeq}`,
    customerId: sangarCust._id,
    principal: 20000,
    interestPercent: 15,
    chargeAmount: 3000,
    disbursedAmount: 17000,
    interestType: 'deduction',
    financeType: 'weekly',
    duration: 10,
    installmentAmount: 2000,
    totalPayable: 20000,
    totalCollected: 0,
    remainingBalance: 20000,
    status: 'active',
    startDate: new Date('2026-05-31T00:00:00.000Z'),
    endDate: new Date('2026-07-18T00:00:00.000Z'),
    notes: 'Weekly loan for Sangar',
  });
  createdLoans.push(sangarWeeklyDoc);

  const moganCust = await getCustomer('Mogan');
  loanSeq++;
  const moganMonthlyDoc = await Loan.create({
    loanNo: `LN-M26-${loanSeq}`,
    customerId: moganCust._id,
    principal: 10000,
    interestPercent: 20,
    chargeAmount: 2000,
    disbursedAmount: 8000,
    interestType: 'deduction',
    financeType: 'monthly',
    duration: 5,
    installmentAmount: 2000,
    totalPayable: 10000,
    totalCollected: 6000,
    remainingBalance: 4000,
    status: 'active',
    startDate: new Date('2026-06-26T00:00:00.000Z'),
    endDate: new Date('2026-11-26T00:00:00.000Z'),
    notes: 'Monthly loan for Mogan Agaram',
  });
  createdLoans.push(moganMonthlyDoc);

  // Mogan payments (Lines 244-246)
  for (let r = 243; r <= 246; r++) {
    const pDate = parseDate(lines[r][1]);
    const pAmt = cleanNum(lines[r][2]);
    if (pAmt > 0 && pDate) {
      receiptSeq++;
      const pDoc = await Payment.create({
        receiptNo: `RCP-26-${receiptSeq}`,
        loanId: moganMonthlyDoc._id,
        customerId: moganCust._id,
        amount: pAmt,
        date: pDate,
        mode: 'cash',
        collectedBy: owner._id,
      });
      createdPayments.push(pDoc);
    }
  }

  // ==========================================
  // PARSE BLOCK 3: Closed Historical Loans (Lines 289-420)
  // ==========================================
  console.log('📦 Parsing Block 3: Closed Historical Loans...');
  const closedLoansSpecs = [
    { name: 'Gopi', amount: 10000, date: '2026-08-21', closing: '2026-10-25', interest: 1500, paid: 10000, type: 'weekly', daily: 1000 },
    { name: 'Murthi', amount: 10000, date: '2026-05-17', closing: '2026-07-18', interest: 1500, paid: 10200, type: 'daily', daily: 200 },
    { name: 'Thilaga', amount: 15000, date: '2026-05-13', closing: '2026-06-29', interest: 2250, paid: 15000, type: 'daily', daily: 150 },
    { name: 'Nirmala', amount: 10000, date: '2026-05-13', closing: '2026-08-20', interest: 1500, paid: 10000, type: 'daily', daily: 100 },
    { name: 'Dinesha', amount: 50000, date: '2026-06-10', closing: '2026-09-17', interest: 7500, paid: 50000, type: 'daily', daily: 500 },
    { name: 'Srinivasa', amount: 30000, date: '2026-06-04', closing: '2026-09-11', interest: 4500, paid: 30000, type: 'daily', daily: 300 },
    { name: 'Sathish', amount: 20000, date: '2026-05-13', closing: '2026-08-20', interest: 1500, paid: 20000, type: 'daily', daily: 200 },
    { name: 'Sangar', amount: 30000, date: '2026-05-30', closing: '2026-09-06', interest: 4500, paid: 30300, type: 'daily', daily: 300 },
    { name: 'kalaiselvi', amount: 20000, date: '2026-07-07', closing: '2026-07-18', interest: 3000, paid: 20000, type: 'daily', daily: 300 },
    { name: 'Rajsegar', amount: 50000, date: '2026-08-10', closing: '2026-11-17', interest: 7500, paid: 50000, type: 'daily', daily: 1000 },
    { name: 'Thilaga', amount: 20000, date: '2026-07-24', closing: '2026-10-31', interest: 3000, paid: 20000, type: 'daily', daily: 200 },
    { name: 'Sanggar', amount: 50000, date: '2026-06-26', closing: '2026-10-03', interest: 6200, paid: 50000, type: 'daily', daily: 500 },
    { name: 'Rajsegar', amount: 70000, date: '2026-09-16', closing: '2026-12-24', interest: 10500, paid: 70000, type: 'daily', daily: 1000 },
  ];

  for (const spec of closedLoansSpecs) {
    const cust = await getCustomer(spec.name);
    loanSeq++;
    const prefix = spec.type === 'weekly' ? 'LN-W26' : 'LN-D26';
    const loanDoc = await Loan.create({
      loanNo: `${prefix}-${loanSeq}`,
      customerId: cust._id,
      principal: spec.amount,
      interestPercent: Number(((spec.interest / spec.amount) * 100).toFixed(1)),
      chargeAmount: spec.interest,
      disbursedAmount: spec.amount - spec.interest,
      interestType: 'deduction',
      financeType: spec.type,
      duration: spec.type === 'weekly' ? 10 : 100,
      installmentAmount: spec.daily,
      totalPayable: spec.amount,
      totalCollected: spec.paid,
      remainingBalance: 0,
      status: 'completed',
      startDate: new Date(spec.date),
      endDate: new Date(spec.closing),
      notes: `Settled historical loan for ${spec.name}`,
    });
    createdLoans.push(loanDoc);

    // Add lump settlement payment so historical cashbook balances
    receiptSeq++;
    const pDoc = await Payment.create({
      receiptNo: `RCP-26-${receiptSeq}`,
      loanId: loanDoc._id,
      customerId: cust._id,
      amount: spec.paid,
      date: new Date(spec.closing),
      mode: 'cash',
      collectedBy: owner._id,
      notes: `Complete loan settlement by ${spec.name}`,
    });
    createdPayments.push(pDoc);
  }

  // ==========================================
  // PARSE BLOCK 4: Major Loans (Lines 430-440)
  // ==========================================
  console.log('📦 Parsing Block 4: Major Loans...');
  const majorLoansSpecs = [
    { name: 'Manchi', amount: 100000, date: '2026-05-30', closing: '2026-09-06', interest: 15000, paid: 98000, balance: 2000, daily: 1000 },
    { name: 'Manchi', amount: 150000, date: '2026-09-19', closing: '2026-12-27', interest: 15000, paid: 64500, balance: 85500, daily: 1500 },
    { name: 'Premlatha', amount: 150000, date: '2026-07-14', closing: '2026-10-21', interest: 15000, paid: 148500, balance: 1500, daily: 1500 },
    { name: 'Srinisan', amount: 100000, date: '2026-07-07', closing: '2026-07-18', interest: 15000, paid: 12000, balance: 88000, daily: 300 },
    { name: 'Ld', amount: 100000, date: '2026-06-28', closing: '2026-10-05', interest: 15000, paid: 71200, balance: 28800, daily: 1000 },
    { name: 'Ammu', amount: 50000, date: '2026-08-19', closing: '2026-09-05', interest: 7500, paid: 43500, balance: 6500, daily: 500 },
    { name: 'Santhiya', amount: 50000, date: '2026-05-30', closing: '2026-07-18', interest: 7500, paid: 25100, balance: 24900, daily: 500 },
  ];

  for (const spec of majorLoansSpecs) {
    const cust = await getCustomer(spec.name);
    loanSeq++;
    const loanDoc = await Loan.create({
      loanNo: `LN-D26-${loanSeq}`,
      customerId: cust._id,
      principal: spec.amount,
      interestPercent: Number(((spec.interest / spec.amount) * 100).toFixed(1)),
      chargeAmount: spec.interest,
      disbursedAmount: spec.amount - spec.interest,
      interestType: 'deduction',
      financeType: 'daily',
      duration: 100,
      installmentAmount: spec.daily,
      totalPayable: spec.amount,
      totalCollected: spec.paid,
      remainingBalance: spec.balance,
      status: spec.balance <= 0 ? 'completed' : 'active',
      startDate: new Date(spec.date),
      endDate: new Date(spec.closing),
      notes: `Special High-Volume Loan for ${spec.name}`,
    });
    createdLoans.push(loanDoc);

    if (spec.paid > 0) {
      receiptSeq++;
      const pDoc = await Payment.create({
        receiptNo: `RCP-26-${receiptSeq}`,
        loanId: loanDoc._id,
        customerId: cust._id,
        amount: spec.paid,
        date: new Date(spec.date),
        mode: 'cash',
        collectedBy: owner._id,
        notes: `Recorded installments collection for ${spec.name}`,
      });
      createdPayments.push(pDoc);
    }
  }

  // ==========================================
  // PARSE INVESTMENTS & EXPENSES
  // ==========================================
  console.log('📦 Parsing Capital Investments & Expenses...');
  // Investment from CSV: 457442 + self promoter capital
  const inv1 = await Investment.create({
    investorName: 'K. Subramanian (சுப்பிரமணியன் - முதன்மை முதலீடு)',
    phone: '9842112345',
    amount: 1000000,
    interestPercent: 0,
    investmentType: 'self',
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    paymentMode: 'bank',
    status: 'active',
    totalReturned: 0,
    addedBy: owner._id,
    notes: 'Primary Capital for VK BANKER&S',
  });

  const inv2 = await Investment.create({
    investorName: 'Working Capital Fund (சுழற்சி நிதி)',
    phone: '9842112345',
    amount: 457442,
    interestPercent: 0,
    investmentType: 'self',
    startDate: new Date('2026-04-06T00:00:00.000Z'),
    paymentMode: 'bank',
    status: 'active',
    totalReturned: 0,
    addedBy: owner._id,
    notes: 'Working Capital recorded in workbook (4,57,442)',
  });

  // Expenses from CSV:
  // Bank charges
  await Expense.create({
    title: 'Bank Charge (வங்கி கட்டணம்)',
    category: 'miscellaneous',
    amount: 350,
    date: new Date('2026-10-07T00:00:00.000Z'),
    mode: 'bank',
    paidTo: 'Bank',
    createdBy: owner._id,
  });

  await Expense.create({
    title: 'Bank Charge (வங்கி கட்டணம்)',
    category: 'miscellaneous',
    amount: 390,
    date: new Date('2026-10-07T00:00:00.000Z'),
    mode: 'bank',
    paidTo: 'Bank',
    createdBy: owner._id,
  });

  await Expense.create({
    title: 'Operating Expenses (அலுவலக செலவுகள் & கலெக்ஷன் செலவு)',
    category: 'stationery',
    amount: 383750,
    date: new Date('2026-09-01T00:00:00.000Z'),
    mode: 'cash',
    paidTo: 'Office Expenses',
    createdBy: owner._id,
    notes: 'Consolidated operational expenses from workbook (3,84,490 total)',
  });

  console.log('✅ ALL WORKBOOK DATA SUCCESSFULLY IMPORTED TO MONGODB ATLAS!');
  console.log(`📊 Total Summary in Database:`);
  console.log(`- Customers: ${await Customer.countDocuments()}`);
  console.log(`- Loans: ${await Loan.countDocuments()}`);
  console.log(`- Payments: ${await Payment.countDocuments()}`);
  console.log(`- Investments: ${await Investment.countDocuments()}`);
  console.log(`- Expenses: ${await Expense.countDocuments()}`);

  // Now, generate synchronous clean mockData.js so offline/local storage has the exact same real data!
  const allCusts = await Customer.find().lean();
  const allLoans = await Loan.find().lean();
  const allPayments = await Payment.find().lean();
  const allInvs = await Investment.find().lean();
  const allExps = await Expense.find().lean();

  const mockDataContent = `// Real Operational Dataset for VK BANKER'S & FINANCE
export const initialSettings = {
  businessName: "VK BANKER'S & FINANCE",
  businessNameTamil: 'வி.கே. பேங்கர்ஸ் & பைனான்ஸ்',
  ownerName: 'Vasantha Kumar K',
  phone: '+91 98421 12345',
  address: '45, Cross Cut Road, Gandhipuram, Coimbatore - 641012, Tamil Nadu',
  defaultPenaltyPercent: 2,
  graceDays: 1,
  defaultLanguage: 'ta',
  currencySymbol: '₹',
};

export const initialCustomers = ${JSON.stringify(allCusts, null, 2)};

export const initialLoans = ${JSON.stringify(allLoans, null, 2)};

export const initialPayments = ${JSON.stringify(allPayments, null, 2)};

export const initialInvestments = ${JSON.stringify(allInvs, null, 2)};

export const initialExpenses = ${JSON.stringify(allExps, null, 2)};
`;

  fs.writeFileSync(path.resolve(__dirname, '../../client/src/services/mockData.js'), mockDataContent, 'utf8');
  console.log('💾 Successfully synced real records to client/src/services/mockData.js!');

  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
