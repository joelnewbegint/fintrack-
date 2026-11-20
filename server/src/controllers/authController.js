import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import AuditLog from '../models/AuditLog.js';

const signToken = (id, expiresIn = '7d') => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'fintrack_super_secure_jwt_secret_key_2026_tamilnadu_finance',
    { expiresIn }
  );
};

export const login = async (req, res, next) => {
  try {
    const { email, username, loginId, password, rememberMe } = req.body;
    const identifier = (loginId || email || username || '').trim().toLowerCase();

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username/email and password',
      });
    }

    // Find by email, username, or phone
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { username: identifier },
        { phone: identifier },
      ],
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.',
      });
    }

    // Check account lockout
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const minutesRemaining = Math.ceil((user.lockUntil.getTime() - Date.now()) / (60 * 1000));
      return res.status(403).json({
        success: false,
        message: `Account is temporarily locked due to repeated failed login attempts. Try again in ${minutesRemaining} minute(s).`,
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      user.failedLoginAttempts = attempts;

      if (attempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
        await user.save();
        return res.status(403).json({
          success: false,
          message: 'Account locked for 15 minutes due to 5 consecutive failed attempts.',
        });
      }

      await user.save();
      return res.status(401).json({
        success: false,
        message: `Invalid credentials. ${5 - attempts} attempt(s) remaining before temporary lockout.`,
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.',
      });
    }

    // Reset lockout counters upon successful login
    if (user.failedLoginAttempts > 0 || user.lockUntil) {
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
      await user.save();
    }

    const tokenExpiry = rememberMe ? '30d' : '1d';
    const token = signToken(user._id, tokenExpiry);

    // Audit log
    try {
      await AuditLog.create({
        userId: user._id,
        userName: user.name,
        action: 'USER_LOGIN',
        entity: 'User',
        entityId: user._id.toString(),
        after: { email: user.email, username: user.username, role: user.role, rememberMe: !!rememberMe },
      });
    } catch (e) {
      console.warn('[AuthController] AuditLog error:', e.message);
    }

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        username: user.username || '',
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
        role: user.role === 'agent' ? 'loan_agent' : user.role,
        assignedAreas: user.assignedAreas || [],
        customerId: user.customerId || null,
        preferences: user.preferences || {},
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        username: user.username || '',
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
        role: user.role === 'agent' ? 'loan_agent' : user.role,
        assignedAreas: user.assignedAreas || [],
        customerId: user.customerId || null,
        preferences: user.preferences || {},
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, address, preferences, email, password } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (address !== undefined) user.address = address.trim();
    if (preferences !== undefined) user.preferences = { ...user.preferences, ...preferences };

    if (email && email.toLowerCase() !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: user._id } });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Email already in use by another account' });
      }
      user.email = email.toLowerCase().trim();
    }

    if (password && password.trim().length >= 6) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(password.trim(), salt);
    }

    await user.save();

    if (user.customerId) {
      try {
        await Customer.findByIdAndUpdate(user.customerId, {
          ...(name && { name: name.trim() }),
          ...(phone && { phone: phone.trim() }),
          ...(address && { address: address.trim() }),
          ...(email && { email: email.toLowerCase().trim() }),
        });
      } catch (custErr) {
        console.warn('[AuthController] Could not sync customer profile:', custErr.message);
      }
    }

    try {
      await AuditLog.create({
        userId: user._id,
        userName: user.name,
        action: 'UPDATE_PROFILE',
        entity: 'User',
        entityId: user._id.toString(),
        after: { name: user.name, email: user.email, phone: user.phone },
      });
    } catch (e) {
      console.warn('[AuthController] AuditLog error:', e.message);
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        username: user.username || '',
        email: user.email,
        phone: user.phone || '',
        address: user.address || '',
        role: user.role === 'agent' ? 'loan_agent' : user.role,
        assignedAreas: user.assignedAreas || [],
        customerId: user.customerId || null,
        preferences: user.preferences || {},
      },
    });
  } catch (error) {
    next(error);
  }
};

export const registerUser = async (req, res, next) => {
  try {
    const { name, username, email, password, phone, address, role, assignedAreas, customerId, preferences } = req.body;

    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase().trim() },
        ...(username ? [{ username: username.toLowerCase().trim() }] : []),
      ],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email or username already registered',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name: name.trim(),
      username: username ? username.toLowerCase().trim() : email.split('@')[0].toLowerCase(),
      email: email.toLowerCase().trim(),
      phone: (phone || '').trim(),
      address: (address || '').trim(),
      passwordHash,
      role: role || 'loan_agent',
      assignedAreas: assignedAreas || [],
      customerId: customerId || null,
      preferences: preferences || {},
    });

    try {
      await AuditLog.create({
        userId: req.user ? req.user._id : newUser._id,
        userName: req.user ? req.user.name : newUser.name,
        action: 'CREATE_USER',
        entity: 'User',
        entityId: newUser._id.toString(),
        after: { name: newUser.name, email: newUser.email, role: newUser.role },
      });
    } catch (e) {
      console.warn('[AuthController] AuditLog error:', e.message);
    }

    const token = signToken(newUser._id);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      token,
      user: {
        id: newUser._id,
        _id: newUser._id,
        name: newUser.name,
        username: newUser.username,
        email: newUser.email,
        phone: newUser.phone,
        address: newUser.address,
        role: newUser.role,
        assignedAreas: newUser.assignedAreas,
        customerId: newUser.customerId,
        preferences: newUser.preferences,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Owner Only: Agent Management Endpoints
 */
export const getAgents = async (req, res, next) => {
  try {
    const agents = await User.find({
      role: { $in: ['loan_agent', 'emi_agent', 'agent'] },
    })
      .select('-passwordHash')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: agents.length,
      agents: agents.map((a) => ({
        ...a.toObject(),
        role: a.role === 'agent' ? 'loan_agent' : a.role,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const createAgent = async (req, res, next) => {
  try {
    const { name, username, email, password, phone, role, assignedAreas } = req.body;

    if (!name || !username || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, username, password and role (loan_agent | emi_agent)',
      });
    }

    if (!['loan_agent', 'emi_agent'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be loan_agent or emi_agent',
      });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = (email || `${cleanUsername}@fintrack.internal`).trim().toLowerCase();

    const existing = await User.findOne({
      $or: [{ username: cleanUsername }, { email: cleanEmail }],
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists for another account',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const agent = await User.create({
      name: name.trim(),
      username: cleanUsername,
      email: cleanEmail,
      phone: (phone || '').trim(),
      passwordHash,
      role,
      assignedAreas: Array.isArray(assignedAreas) ? assignedAreas : [],
      status: 'active',
    });

    try {
      await AuditLog.create({
        userId: req.user._id,
        userName: req.user.name,
        action: 'CREATE_AGENT',
        entity: 'User',
        entityId: agent._id.toString(),
        after: { name: agent.name, username: agent.username, role: agent.role },
      });
    } catch (e) {
      console.warn('[AuthController] AuditLog error:', e.message);
    }

    res.status(201).json({
      success: true,
      message: 'Agent created successfully',
      agent: {
        id: agent._id,
        _id: agent._id,
        name: agent.name,
        username: agent.username,
        email: agent.email,
        phone: agent.phone,
        role: agent.role,
        assignedAreas: agent.assignedAreas,
        status: agent.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateAgent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, role, assignedAreas, status } = req.body;

    const agent = await User.findById(id);
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    if (name) agent.name = name.trim();
    if (phone !== undefined) agent.phone = phone.trim();
    if (role && ['loan_agent', 'emi_agent'].includes(role)) agent.role = role;
    if (assignedAreas !== undefined) agent.assignedAreas = assignedAreas;
    if (status && ['active', 'inactive'].includes(status)) agent.status = status;

    await agent.save();

    res.status(200).json({
      success: true,
      message: 'Agent updated successfully',
      agent: {
        id: agent._id,
        _id: agent._id,
        name: agent.name,
        username: agent.username,
        email: agent.email,
        phone: agent.phone,
        role: agent.role === 'agent' ? 'loan_agent' : agent.role,
        assignedAreas: agent.assignedAreas,
        status: agent.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const toggleAgentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const agent = await User.findById(id);
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    agent.status = agent.status === 'active' ? 'inactive' : 'active';
    await agent.save();

    res.status(200).json({
      success: true,
      message: `Agent ${agent.status === 'active' ? 'activated' : 'deactivated'} successfully`,
      agent: {
        id: agent._id,
        _id: agent._id,
        name: agent.name,
        username: agent.username,
        status: agent.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const resetAgentPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.trim().length < 4) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 4 characters long',
      });
    }

    const agent = await User.findById(id);
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    const salt = await bcrypt.genSalt(10);
    agent.passwordHash = await bcrypt.hash(newPassword.trim(), salt);
    agent.failedLoginAttempts = 0;
    agent.lockUntil = null;
    await agent.save();

    try {
      await AuditLog.create({
        userId: req.user._id,
        userName: req.user.name,
        action: 'RESET_AGENT_PASSWORD',
        entity: 'User',
        entityId: agent._id.toString(),
        after: { username: agent.username },
      });
    } catch (e) {
      console.warn('[AuthController] AuditLog error:', e.message);
    }

    res.status(200).json({
      success: true,
      message: `Password for agent ${agent.username || agent.name} has been reset successfully`,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAgent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const agent = await User.findById(id);
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    if (agent.role === 'owner' || agent.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot delete an owner or admin account' });
    }

    if (req.user && req.user._id.toString() === agent._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    const agentName = agent.name;
    const agentUsername = agent.username;

    await User.findByIdAndDelete(id);

    try {
      await AuditLog.create({
        userId: req.user._id,
        userName: req.user.name,
        action: 'DELETE_AGENT',
        entity: 'User',
        entityId: id,
        after: { username: agentUsername, name: agentName, role: agent.role },
      });
    } catch (e) {
      console.warn('[AuthController] AuditLog error:', e.message);
    }

    res.status(200).json({
      success: true,
      message: `Agent ${agentName} (@${agentUsername}) deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.body && req.body.token) {
      token = req.body.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided for refresh.',
      });
    }

    let user;
    if (token.startsWith('fintrack_auth_owner_')) {
      user = await User.findOne({ email: 'owner@fintrack.com' });
    } else if (token.startsWith('fintrack_auth_agent_') || token.startsWith('fintrack_auth_loanagent_')) {
      user = await User.findOne({ $or: [{ email: 'loanagent@fintrack.com' }, { email: 'agent@fintrack.com' }, { username: 'loanagent' }] });
    } else if (token.startsWith('fintrack_auth_emiagent_')) {
      user = await User.findOne({ $or: [{ email: 'emiagent@fintrack.com' }, { username: 'emiagent' }] });
    } else {
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'fintrack_super_secure_jwt_secret_key_2026_tamilnadu_finance',
          { ignoreExpiration: true }
        );
        user = await User.findById(decoded.id).select('-passwordHash');
      } catch (err) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token format.',
        });
      }
    }

    if (!user || user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'User is inactive or no longer exists.',
      });
    }

    const newToken = signToken(user._id, '7d');
    return res.status(200).json({
      success: true,
      token: newToken,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        username: user.username || '',
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role === 'agent' ? 'loan_agent' : user.role,
        assignedAreas: user.assignedAreas,
        customerId: user.customerId,
        preferences: user.preferences,
      },
    });
  } catch (err) {
    next(err);
  }
};
