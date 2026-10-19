import Settings from '../models/Settings.js';
import AuditLog from '../models/AuditLog.js';

export const getSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne({});
    if (!settings) {
      settings = await Settings.create({});
    }
    res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne({});
    if (!settings) {
      settings = await Settings.create(req.body);
    } else {
      const before = settings.toObject();
      settings = await Settings.findByIdAndUpdate(settings._id, req.body, {
        new: true,
        runValidators: true,
      });

      await AuditLog.create({
        userId: req.user._id,
        userName: req.user.name,
        action: 'UPDATE_SETTINGS',
        entity: 'Settings',
        entityId: settings._id.toString(),
        before,
        after: settings.toObject(),
      });
    }

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      settings,
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const logs = await AuditLog.find({}).sort({ timestamp: -1 }).limit(100);
    res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    next(error);
  }
};
