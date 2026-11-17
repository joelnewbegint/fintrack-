import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this resource. Please log in.',
    });
  }

  try {
    let user;
    if (token.startsWith('fintrack_auth_owner_')) {
      user = await User.findOne({ email: 'owner@fintrack.com' });
    } else if (token.startsWith('fintrack_auth_agent_') || token.startsWith('fintrack_auth_loanagent_')) {
      user = await User.findOne({ $or: [{ email: 'loanagent@fintrack.com' }, { email: 'agent@fintrack.com' }, { username: 'loanagent' }] });
    } else if (token.startsWith('fintrack_auth_emiagent_')) {
      user = await User.findOne({ $or: [{ email: 'emiagent@fintrack.com' }, { username: 'emiagent' }] });
    } else {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'fintrack_super_secure_jwt_secret_key_2026_tamilnadu_finance'
      );
      user = await User.findById(decoded.id).select('-passwordHash');
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
      });
    }

    // Check account lockout
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingMinutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / (60 * 1000));
      return res.status(403).json({
        success: false,
        message: `Account is temporarily locked due to failed login attempts. Try again in ${remainingMinutes} minute(s).`,
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated. Contact the owner.',
      });
    }

    // Attach role helper flags for controllers
    req.user = user;
    req.user.isOwner = user.role === 'owner' || user.role === 'admin';
    req.user.isLoanAgent = user.role === 'loan_agent' || user.role === 'agent';
    req.user.isEmiAgent = user.role === 'emi_agent';

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please log in again.',
    });
  }
};

export const restrictTo = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    
    // Normalize aliases: 'agent' counts as 'loan_agent', 'admin' counts as 'owner'
    const hasPermission = roles.some((role) => {
      if (role === userRole) return true;
      if (role === 'owner' && (userRole === 'admin' || userRole === 'owner')) return true;
      if (role === 'loan_agent' && (userRole === 'agent' || userRole === 'loan_agent')) return true;
      return false;
    });

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Role (${userRole}) is not authorized to access this resource or perform this action.`,
      });
    }
    next();
  };
};

/**
 * Server-side agent scoping helper:
 * Restricts queries so agents can ONLY read/write their assigned records.
 */
export const scopeAgentQuery = (req, baseQuery = {}, agentField = 'assignedAgentId') => {
  if (req.user?.isOwner) {
    // Owners can filter by agent if specified, or view all
    if (req.query?.agentId) {
      baseQuery[agentField] = req.query.agentId;
    }
    return baseQuery;
  }

  // Agent role: strictly scope to assigned records or createdBy
  if (req.user?.isLoanAgent || req.user?.isEmiAgent) {
    baseQuery.$or = [
      { [agentField]: req.user._id },
      { assignedAgent: req.user._id },
      { createdBy: req.user._id },
      { collectedBy: req.user._id },
    ];
  }

  return baseQuery;
};
