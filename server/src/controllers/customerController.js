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

    // Populate active loans count and total outstanding for each customer
    const customerIds = customers.map((c) => c._id);
    const activeLoans = await Loan.find({
      customerId: { $in: customerIds },
      status: { $in: ['active', 'overdue'] },
    }).select('customerId remainingBalance principal financeType');

    const customerLoanMap = {};
    activeLoans.forEach((loan) => {
      const cid = loan.customerId.toString();
      if (!customerLoanMap[cid]) {
        customerLoanMap[cid] = { activeLoanCount: 0, totalOutstanding: 0, types: [] };
      }
      customerLoanMap[cid].activeLoanCount += 1;
      customerLoanMap[cid].totalOutstanding += loan.remainingBalance;
      if (!customerLoanMap[cid].types.includes(loan.financeType)) {
        customerLoanMap[cid].types.push(loan.financeType);
      }
    });

    const enrichedCustomers = customers.map((c) => {
      const stats = customerLoanMap[c._id.toString()] || {
        activeLoanCount: 0,
        totalOutstanding: 0,
        types: [],
      };
      return {
        ...c.toObject(),
        ...stats,
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
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    // Fetch customer's loans
    const loans = await Loan.find({ customerId: customer._id }).sort({ createdAt: -1 });

    // Fetch customer's payments
    const payments = await Payment.find({ customerId: customer._id })
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

    const newCustomer = await Customer.create({
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

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      action: 'CREATE_CUSTOMER',
      entity: 'Customer',
      entityId: newCustomer._id.toString(),
      after: newCustomer.toObject(),
    });

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
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    const before = customer.toObject();
    const updated = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      action: 'UPDATE_CUSTOMER',
      entity: 'Customer',
      entityId: updated._id.toString(),
      before,
      after: updated.toObject(),
    });

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
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    // Check if customer has active loans
    const activeLoans = await Loan.countDocuments({
      customerId: customer._id,
      status: { $in: ['active', 'overdue'] },
    });

    if (activeLoans > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete customer with ${activeLoans} active or overdue loan(s). Settle all loans first.`,
      });
    }

    await Customer.findByIdAndDelete(req.params.id);

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      action: 'DELETE_CUSTOMER',
      entity: 'Customer',
      entityId: req.params.id,
      before: customer.toObject(),
    });

    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
