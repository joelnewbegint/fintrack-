import Customer from '../models/Customer.js';
import Loan from '../models/Loan.js';
import Payment from '../models/Payment.js';
import AuditLog from '../models/AuditLog.js';

export const getCustomers = async (req, res, next) => {
  try {
    const { search, area, status } = req.query;
    let query = {};

    // If agent, and agent has assignedAreas, filter by those areas
    if (req.user.role === 'agent' && req.user.assignedAreas && req.user.assignedAreas.length > 0) {
      query.area = { $in: req.user.assignedAreas };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { area: { $regex: search, $options: 'i' } },
      ];
    }

    if (area && area !== 'all') {
      query.area = area;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const customers = await Customer.find(query).sort({ createdAt: -1 });

    // Populate active loans count, total loans count, and total outstanding for each customer
    const customerIds = customers.map((c) => c._id);
    const customerPhones = customers.map((c) => c.phone).filter(Boolean);
    const customerNames = customers.map((c) => c.name).filter(Boolean);

    const allCustomerLoans = await Loan.find({
      $or: [
        { customerId: { $in: customerIds } },
        { customerPhone: { $in: customerPhones } },
        { customerName: { $in: customerNames } },
      ],
    }).select('customerId customerPhone customerName notes remainingBalance principal totalPayable financeType status');

    const customerLoanMap = {};
    const customerPhoneMap = {};
    const customerNameMap = {};

    allCustomerLoans.forEach((loan) => {
      const cid = loan.customerId ? loan.customerId.toString() : '';
      const rem = Number(loan.remainingBalance != null ? loan.remainingBalance : loan.totalPayable || loan.principal) || 0;
      const statusLower = String(loan.status || '').toLowerCase();
      const isActive = statusLower === 'active' || statusLower === 'overdue' || (statusLower !== 'completed' && rem > 0);

      const bucket = {
        loanId: loan._id,
        rem,
        isActive,
        financeType: loan.financeType,
      };

      if (cid) {
        if (!customerLoanMap[cid]) customerLoanMap[cid] = [];
        customerLoanMap[cid].push(bucket);
      }
      if (loan.customerPhone) {
        const pClean = loan.customerPhone.replace(/[^0-9]/g, '');
        if (pClean) {
          if (!customerPhoneMap[pClean]) customerPhoneMap[pClean] = [];
          customerPhoneMap[pClean].push(bucket);
        }
      }
      if (loan.customerName) {
        const nClean = loan.customerName.toLowerCase().split('(')[0].trim().replace(/[^a-z0-9]/g, '');
        if (nClean) {
          if (!customerNameMap[nClean]) customerNameMap[nClean] = [];
          customerNameMap[nClean].push(bucket);
        }
      }
    });

    const enrichedCustomers = customers.map((c) => {
      const cidStr = c._id.toString();
      const pClean = (c.phone || '').replace(/[^0-9]/g, '');
      const nClean = (c.name || '').toLowerCase().split('(')[0].trim().replace(/[^a-z0-9]/g, '');

      const seen = new Set();
      const matchedLoans = [];
      const addBuckets = (list) => {
        if (!list) return;
        for (const item of list) {
          const key = String(item.loanId);
          if (!seen.has(key)) {
            seen.add(key);
            matchedLoans.push(item);
          }
        }
      };

      addBuckets(customerLoanMap[cidStr]);
      if (pClean) addBuckets(customerPhoneMap[pClean]);
      if (nClean) addBuckets(customerNameMap[nClean]);

      let activeLoanCount = 0;
      let totalOutstanding = 0;
      const types = [];

      matchedLoans.forEach((b) => {
        if (b.isActive) {
          activeLoanCount += 1;
          totalOutstanding += b.rem;
        }
        if (b.financeType && !types.includes(b.financeType)) {
          types.push(b.financeType);
        }
      });

      return {
        ...c.toObject(),
        activeLoanCount,
        totalOutstanding,
        totalLoansCount: matchedLoans.length,
        types,
      };
    });

    // Also get list of all unique areas for filter dropdown
    const allAreas = await Customer.distinct('area');

    res.status(200).json({
      success: true,
      count: enrichedCustomers.length,
      areas: allAreas,
      customers: enrichedCustomers,
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const isObjId = mongoose.Types.ObjectId.isValid(id);
    const customer = isObjId ? await Customer.findById(id) : await Customer.findOne({ clientId: id });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    // Fetch customer's loans
    const loanConditions = [{ customerId: customer._id }];
    if (customer.clientId) loanConditions.push({ customerId: customer.clientId });
    if (customer.phone) loanConditions.push({ customerPhone: customer.phone });
    const loans = await Loan.find({ $or: loanConditions }).sort({ createdAt: -1 });

    // Fetch customer's payments
    const payments = await Payment.find({
      $or: [{ customerId: customer._id }, { customerId: customer.clientId }],
    })
      .populate('collectedBy', 'name role')
      .populate('loanId', 'loanNo financeType')
      .sort({ date: -1 });

    res.status(200).json({
      success: true,
      customer,
      loans,
      payments,
    });
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req, res, next) => {
  try {
    const {
      name,
      phone,
      address,
      area,
      photoUrl,
      idProofUrl,
      idProofType,
      idProofNumber,
      guarantor,
      notes,
    } = req.body;

    const clientId = req.body.clientId || req.body._id || req.body.id || `cust_${Date.now()}`;
    const createdBy = req.user ? req.user._id : 'owner';

    // If customer with same clientId already exists, update and return it
    const existing = await Customer.findOne({ $or: [{ clientId }, { phone, name }] });
    if (existing) {
      existing.name = name || existing.name;
      existing.phone = phone || existing.phone;
      existing.address = address || existing.address;
      existing.area = area || existing.area;
      if (guarantor) existing.guarantor = guarantor;
      if (idProofType) existing.idProofType = idProofType;
      if (idProofNumber) existing.idProofNumber = idProofNumber;
      await existing.save();
      return res.status(200).json({
        success: true,
        message: 'Customer updated successfully',
        customer: existing,
      });
    }

    const newCustomer = await Customer.create({
      clientId,
      createdBy,
      name,
      phone,
      address,
      area,
      photoUrl: photoUrl || '',
      idProofUrl: idProofUrl || '',
      idProofType: idProofType || 'Aadhaar',
      idProofNumber: idProofNumber || '',
      guarantor: guarantor || {},
      notes: notes || '',
    });

    if (req.user) {
      await AuditLog.create({
        userId: req.user._id,
        userName: req.user.name,
        action: 'CREATE_CUSTOMER',
        entity: 'Customer',
        entityId: newCustomer._id.toString(),
        after: newCustomer.toObject(),
      });
    }

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      customer: newCustomer,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req, res, next) => {
  try {
    const id = req.params.id;
    const isObjId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjId ? { _id: id } : { clientId: id };

    const customer = await Customer.findOne(query);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    const before = customer.toObject();
    const updated = await Customer.findOneAndUpdate(query, req.body, {
      new: true,
      runValidators: true,
    });

    if (req.user) {
      await AuditLog.create({
        userId: req.user._id,
        userName: req.user.name,
        action: 'UPDATE_CUSTOMER',
        entity: 'Customer',
        entityId: updated._id.toString(),
        before,
        after: updated.toObject(),
      });
    }

    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      customer: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (req, res, next) => {
  try {
    const id = req.params.id;
    const isObjId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjId ? { _id: id } : { clientId: id };

    const customer = await Customer.findOne(query);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    // Check if customer has active loans
    const activeLoans = await Loan.countDocuments({
      $or: [{ customerId: customer._id }, { customerId: customer.clientId }],
      status: { $in: ['active', 'overdue'] },
    });

    if (activeLoans > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete customer with ${activeLoans} active or overdue loan(s). Settle all loans first.`,
      });
    }

    await Customer.findOneAndDelete(query);

    if (req.user) {
      await AuditLog.create({
        userId: req.user._id,
        userName: req.user.name,
        action: 'DELETE_CUSTOMER',
        entity: 'Customer',
        entityId: String(customer._id),
        before: customer.toObject(),
      });
    }

    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
