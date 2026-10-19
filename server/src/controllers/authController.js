import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';

const signToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'fintrack_super_secure_jwt_secret_key_2026_tamilnadu_finance',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Password incorrect.',
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.',
      });
    }

    const token = signToken(user._id);

    // Audit log
    await AuditLog.create({
      userId: user._id,
      userName: user.name,
      action: 'USER_LOGIN',
      entity: 'User',
      entityId: user._id.toString(),
      after: { email: user.email, role: user.role },
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        assignedAreas: user.assignedAreas,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};

export const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, phone, role, assignedAreas } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      phone: phone || '',
      passwordHash,
      role: role || 'agent',
      assignedAreas: assignedAreas || [],
    });

    await AuditLog.create({
      userId: req.user ? req.user._id : newUser._id,
      userName: req.user ? req.user.name : newUser.name,
      action: 'CREATE_USER',
      entity: 'User',
      entityId: newUser._id.toString(),
      after: { name: newUser.name, email: newUser.email, role: newUser.role },
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        assignedAreas: newUser.assignedAreas,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAgents = async (req, res, next) => {
  try {
    const agents = await User.find({ role: 'agent' }).select('-passwordHash');
    res.status(200).json({
      success: true,
      count: agents.length,
      agents,
    });
  } catch (error) {
    next(error);
  }
};
