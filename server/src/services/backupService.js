import ExcelJS from 'exceljs';
import nodemailer from 'nodemailer';
import Customer from '../models/Customer.js';
import Loan from '../models/Loan.js';
import Payment from '../models/Payment.js';
import DailyClosing from '../models/DailyClosing.js';
import Expense from '../models/Expense.js';
import Investment from '../models/Investment.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import Settings from '../models/Settings.js';

/**
 * Returns current date in Indian Standard Time (YYYY-MM-DD)
 */
export const getISTDateString = () => {
  const now = new Date();
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
};

/**
 * Returns full timestamp in Indian Standard Time
 */
export const getISTTimestampString = () => {
  return new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'full',
    timeStyle: 'medium',
  });
};

/**
 * Masks Aadhaar or ID card numbers showing only the last 4 digits
 * Example: 123456789012 -> XXXX-XXXX-9012
 */
export const maskAadhaarOrId = (val) => {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (!str) return '';
  const digits = str.replace(/\D/g, '');
  if (digits.length >= 4) {
    const last4 = digits.slice(-4);
    return `XXXX-XXXX-${last4}`;
  }
  return str.length > 4 ? `XXXX-${str.slice(-4)}` : str;
};

/**
 * Sanitizes a document value for safe Excel presentation:
 * - ObjectId -> string
 * - Date -> Date instance
 * - Nested objects/arrays -> JSON string
 * - Sensitive keys (Aadhaar) -> masked
 */
const sanitizeDocValue = (key, val) => {
  if (val === null || val === undefined) return '';

  // Mask Aadhaar or identity numbers
  const lowerKey = key.toLowerCase();
  if (
    lowerKey.includes('aadhaar') ||
    lowerKey.includes('idproofnumber') ||
    lowerKey.includes('idnumber') ||
    lowerKey === 'idproof'
  ) {
    return maskAadhaarOrId(val);
  }

  // Handle Mongoose ObjectId
  if (val && typeof val === 'object' && val._bsontype === 'ObjectID') {
    return val.toString();
  }
  if (val && typeof val === 'object' && val.constructor && val.constructor.name === 'ObjectId') {
    return val.toString();
  }

  // Handle Date instances
  if (val instanceof Date) {
    return val;
  }

  // Handle Nested Arrays and Objects
  if (typeof val === 'object') {
    // If it's a guarantor object, mask internal Aadhaar
    if (lowerKey === 'guarantor' && typeof val === 'object') {
      const copy = { ...val };
      if (copy.idProofNumber) copy.idProofNumber = maskAadhaarOrId(copy.idProofNumber);
      if (copy.aadhaar) copy.aadhaar = maskAadhaarOrId(copy.aadhaar);
      return JSON.stringify(copy);
    }
    return JSON.stringify(val);
  }

  return val;
};

/**
 * Applies standard VK Banker's & Finance Excel styling:
 * - Green bold header row (#166534)
 * - White text
 * - Auto-filter on all columns
 * - Frozen header row
 * - Adaptive auto-fit column widths
 */
const styleWorksheet = (worksheet, headers) => {
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  const headerRow = worksheet.getRow(1);
  headerRow.height = 28;
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF166534' }, // Forest Green #166534
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };

  if (headers && headers.length > 0) {
    const lastColLetter = worksheet.getColumn(headers.length).letter;
    worksheet.autoFilter = `A1:${lastColLetter}1`;
  }

  // Compute adaptive column widths based on header and cell content length
  worksheet.columns.forEach((column) => {
    let maxLen = 12;
    column.eachCell({ includeEmpty: true }, (cell, rowNum) => {
      let val = cell.value;
      if (val instanceof Date) {
        val = val.toISOString().slice(0, 10);
      } else if (typeof val === 'object' && val !== null) {
        val = JSON.stringify(val);
      } else {
        val = String(val ?? '');
      }
      maxLen = Math.max(maxLen, Math.min(val.length + 3, 50));
    });
    column.width = maxLen;
  });
};

/**
 * Fallback column headers per collection in case collection is currently empty
 */
const defaultHeadersBySheet = {
  Customers: ['_id', 'clientId', 'name', 'phone', 'address', 'area', 'idProofType', 'idProofNumber', 'guarantor', 'status', 'createdAt'],
  Loans: ['_id', 'clientId', 'loanNo', 'customer', 'scheme', 'principal', 'interestRate', 'upfrontCharge', 'totalAmount', 'installmentAmount', 'totalInstallments', 'startDate', 'endDate', 'status', 'createdAt'],
  Installments: ['loanId', 'loanNumber', 'installmentNo', 'dueDate', 'amount', 'paidAmount', 'status', 'paidDate', 'holidayReason'],
  Payments: ['_id', 'receiptNo', 'loanId', 'loanNo', 'clientId', 'customer', 'amount', 'paymentMode', 'paymentDate', 'status', 'createdAt'],
  DailyClosings: ['_id', 'date', 'openingBalance', 'totalCollections', 'totalExpenses', 'closingBalance', 'status', 'denominations', 'createdAt'],
  Expenses: ['_id', 'date', 'category', 'amount', 'description', 'paidBy', 'createdAt'],
  Investments: ['_id', 'investorName', 'amount', 'investmentDate', 'type', 'status', 'notes', 'createdAt'],
  Users: ['_id', 'name', 'phone', 'email', 'role', 'status', 'createdAt'],
  AuditLogs: ['_id', 'action', 'user', 'entity', 'entityId', 'details', 'timestamp'],
  Settings: ['_id', 'businessName', 'phone', 'email', 'address', 'currency', 'language', 'createdAt'],
};

/**
 * Builds an Excel sheet from an array of lean Mongoose documents.
 * Extracts unique union of all keys across records for full schema visibility.
 */
const addCollectionSheet = (workbook, sheetName, documents, excludeKeys = []) => {
  const worksheet = workbook.addWorksheet(sheetName);

  if (!documents || documents.length === 0) {
    const fallbackHeaders = defaultHeadersBySheet[sheetName] || ['Status'];
    worksheet.columns = fallbackHeaders.map((h) => ({ header: h, key: h }));
    styleWorksheet(worksheet, fallbackHeaders);
    return { sheetName, count: 0 };
  }

  // Find union of all keys across all records
  const keySet = new Set();
  // Priority keys to place at the start of the columns
  const priorityKeys = ['_id', 'clientId', 'name', 'loanNo', 'receiptNo', 'phone', 'amount', 'principal'];

  for (const doc of documents) {
    Object.keys(doc).forEach((k) => {
      if (!excludeKeys.includes(k) && k !== '__v') {
        keySet.add(k);
      }
    });
  }

  const allKeys = Array.from(keySet);
  const orderedKeys = [
    ...priorityKeys.filter((k) => allKeys.includes(k)),
    ...allKeys.filter((k) => !priorityKeys.includes(k)),
  ];

  // Set columns
  worksheet.columns = orderedKeys.map((k) => ({
    header: k,
    key: k,
  }));

  // Populate rows
  for (const doc of documents) {
    const rowObj = {};
    for (const key of orderedKeys) {
      rowObj[key] = sanitizeDocValue(key, doc[key]);
    }
    worksheet.addRow(rowObj);
  }

  styleWorksheet(worksheet, orderedKeys);
  return { sheetName, count: documents.length };
};

/**
 * Builds the complete multi-sheet Excel workbook of all database collections.
 */
export const buildWorkbook = async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "VK Banker's & Finance Management System";
  workbook.lastModifiedBy = 'Automated Cloud Backup Service';
  workbook.created = new Date();
  workbook.modified = new Date();

  // 1. Fetch all collections from MongoDB using .lean() for fast read performance
  const [
    rawCustomers,
    rawLoans,
    rawPayments,
    rawDailyClosings,
    rawExpenses,
    rawInvestments,
    rawUsers,
    rawAuditLogs,
    rawSettings,
  ] = await Promise.all([
    Customer.find().lean(),
    Loan.find().lean(),
    Payment.find().lean(),
    DailyClosing.find().lean(),
    Expense.find().lean(),
    Investment.find().lean(),
    User.find().select('-passwordHash -password -refreshToken').lean(),
    AuditLog.find().lean(),
    Settings.find().lean(),
  ]);

  // 2. Separate and flatten installments from Loans into a dedicated Installments sheet
  const flattenedInstallments = [];
  const processedLoans = (rawLoans || []).map((loan) => {
    const loanCopy = { ...loan };
    const loanId = loan._id ? loan._id.toString() : (loan.clientId || '');
    const loanNo = loan.loanNo || loan.loanNumber || '';

    const schedule = Array.isArray(loan.schedule) ? loan.schedule : [];
    for (const inst of schedule) {
      const instCopy = { ...inst };
      delete instCopy.__v;
      delete instCopy._id;
      flattenedInstallments.push({
        loanId,
        loanNumber: loanNo,
        installmentNo: instCopy.installmentNo,
        dueDate: instCopy.dueDate,
        amount: instCopy.amount,
        paidAmount: instCopy.paidAmount || 0,
        status: instCopy.status || 'pending',
        holidayReason: instCopy.holidayReason || '',
        paidDate: instCopy.paidDate || null,
      });
    }

    // Exclude embedded installments array from Loans sheet as specified in requirements
    delete loanCopy.schedule;
    return loanCopy;
  });

  // Track sheet counts for summary
  const summaryCounts = [];

  // Summary sheet is the FIRST sheet
  const summarySheet = workbook.addWorksheet('Summary');

  // 3. Add data sheets
  summaryCounts.push(addCollectionSheet(workbook, 'Customers', rawCustomers));
  summaryCounts.push(addCollectionSheet(workbook, 'Loans', processedLoans, ['schedule']));
  summaryCounts.push(addCollectionSheet(workbook, 'Installments', flattenedInstallments));
  summaryCounts.push(addCollectionSheet(workbook, 'Payments', rawPayments));
  summaryCounts.push(addCollectionSheet(workbook, 'DailyClosings', rawDailyClosings));
  summaryCounts.push(addCollectionSheet(workbook, 'Expenses', rawExpenses));
  summaryCounts.push(addCollectionSheet(workbook, 'Investments', rawInvestments));
  summaryCounts.push(
    addCollectionSheet(workbook, 'Users', rawUsers, ['passwordHash', 'password', 'refreshToken'])
  );
  summaryCounts.push(addCollectionSheet(workbook, 'AuditLogs', rawAuditLogs));
  summaryCounts.push(addCollectionSheet(workbook, 'Settings', rawSettings));

  // 4. Populate Summary Sheet (First Sheet)
  summarySheet.views = [{ state: 'frozen', ySplit: 5 }];

  summarySheet.mergeCells('A1:D1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = "VK BANKER'S & FINANCE — FULL DATABASE BACKUP";
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  summarySheet.getRow(1).height = 36;

  summarySheet.mergeCells('A2:D2');
  const timeCell = summarySheet.getCell('A2');
  timeCell.value = `Generated On: ${getISTTimestampString()} (IST) • Live MongoDB Atlas Central Database`;
  timeCell.font = { italic: true, size: 10, color: { argb: 'FF475569' } };
  timeCell.alignment = { vertical: 'middle', horizontal: 'center' };
  summarySheet.getRow(2).height = 22;

  summarySheet.mergeCells('A3:D3');
  const secCell = summarySheet.getCell('A3');
  secCell.value = 'Security Notice: Aadhaar & Identity numbers masked (XXXX-XXXX-1234). Sensitive user secrets excluded.';
  secCell.font = { bold: true, size: 9, color: { argb: 'FF15803D' } };
  secCell.alignment = { vertical: 'middle', horizontal: 'center' };
  summarySheet.getRow(3).height = 20;

  summarySheet.getRow(4).values = []; // Empty spacer row

  // Summary Table Headers
  const sumHeaderRow = summarySheet.getRow(5);
  sumHeaderRow.values = ['Sheet Name', 'Collection / Model', 'Record Count', 'Description'];
  sumHeaderRow.height = 26;
  sumHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sumHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } };
  sumHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };

  const descriptions = {
    Customers: 'Registered borrower records, KYC metadata, areas, and contact info',
    Loans: 'Active and completed microfinance loans (Daily, Weekly, Monthly)',
    Installments: 'Detailed repayment amortization schedule extracted from loans',
    Payments: 'Receipt logs, collections, modes (Cash / UPI), and timestamps',
    DailyClosings: 'Day-end cash book reconciliations and physical currency denominations',
    Expenses: 'Operating office and travel expenses',
    Investments: 'Self capital, partner funding, and wholesale capital investments',
    Users: 'Authorized staff, owner accounts, and RBAC roles',
    AuditLogs: 'System mutation audit logs and activity tracking',
    Settings: 'Business profile, branding, and global system configuration',
  };

  let rowIdx = 6;
  let grandTotalRecords = 0;

  for (const item of summaryCounts) {
    const row = summarySheet.getRow(rowIdx);
    row.values = [
      item.sheetName,
      item.sheetName,
      item.count,
      descriptions[item.sheetName] || 'System Collection',
    ];
    row.height = 22;
    row.getCell(3).alignment = { horizontal: 'right' };
    grandTotalRecords += item.count;
    rowIdx++;
  }

  // Total summary row
  const totalRow = summarySheet.getRow(rowIdx);
  totalRow.values = ['TOTAL', 'All Collections', grandTotalRecords, 'Complete snapshot of active database records'];
  totalRow.height = 24;
  totalRow.font = { bold: true };
  totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };

  // Set widths for summary sheet
  summarySheet.getColumn(1).width = 20;
  summarySheet.getColumn(2).width = 24;
  summarySheet.getColumn(3).width = 16;
  summarySheet.getColumn(4).width = 55;

  return workbook;
};

/**
 * Builds the workbook buffer and emails it via Gmail to BACKUP_TO
 */
export const emailBackup = async () => {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const backupTo = process.env.BACKUP_TO || gmailUser;

  if (!gmailUser || !gmailPass) {
    throw new Error(
      'Missing email configuration: GMAIL_USER and GMAIL_APP_PASSWORD must be configured in environment variables.'
    );
  }
  if (!backupTo) {
    throw new Error('Missing recipient configuration: BACKUP_TO must be configured in environment variables.');
  }

  const istDate = getISTDateString();
  const istTimestamp = getISTTimestampString();
  const filename = `VK-Backup-${istDate}.xlsx`;
  const subject = `VK Banker's Backup - ${istDate}`;

  console.log(`[BackupService] Starting automated backup generation for ${istDate}...`);
  const workbook = await buildWorkbook();
  const buffer = await workbook.xlsx.writeBuffer();

  console.log(`[BackupService] Workbook built successfully (${(buffer.byteLength / 1024).toFixed(1)} KB). Sending email...`);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });

  const mailOptions = {
    from: `"VK Banker's Automated Backup" <${gmailUser}>`,
    to: backupTo,
    subject,
    text: `VK Banker's & Finance — Daily Cloud Database Backup\nDate: ${istTimestamp}\nFilename: ${filename}\n\nThe complete Excel backup is attached with all collections (Customers, Loans, Installments, Payments, DailyClosings, Expenses, Investments, Users, AuditLogs, Settings).\n\nSecurity Notice: Aadhaar/ID numbers are masked (XXXX-XXXX-1234) and all user passwords and tokens are excluded.`,
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="background-color: #166534; padding: 24px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 0.5px;">VK BANKER'S & FINANCE</h1>
            <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">தவணை நிதி மேலாண்மை — Automated Cloud Backup</p>
          </div>
          <div style="padding: 24px;">
            <p style="font-size: 14px; margin-top: 0;">Hello,</p>
            <p style="font-size: 14px; line-height: 1.6;">
              The full-database Excel backup for <strong>${istDate}</strong> has been generated and is attached to this email.
            </p>
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin: 20px 0;">
              <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; color: #475569;">Backup Timestamp:</td>
                  <td style="padding: 6px 0; font-weight: bold; text-align: right;">${istTimestamp}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #475569;">Attachment Name:</td>
                  <td style="padding: 6px 0; font-weight: bold; text-align: right;">${filename}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #475569;">Database Origin:</td>
                  <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #166534;">MongoDB Atlas Cloud</td>
                </tr>
              </table>
            </div>
            <div style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 10px; padding: 12px 16px; font-size: 12px; color: #854d0e;">
              🔒 <strong>Security & Compliance:</strong> All borrower Aadhaar & identity numbers are masked showing only the last 4 digits (XXXX-XXXX-1234). User passwords and authentication secrets are permanently excluded.
            </div>
            <p style="font-size: 12px; color: #64748b; margin-top: 24px; text-align: center;">
              This is an automated nightly backup generated by FinTrack Cloud on Render.
            </p>
          </div>
        </div>
      </div>
    `,
    attachments: [
      {
        filename,
        content: Buffer.from(buffer),
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    ],
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`[BackupService] Email successfully delivered to ${backupTo}. MessageId: ${info.messageId}`);
  return { ok: true, messageId: info.messageId, filename, date: istDate };
};
