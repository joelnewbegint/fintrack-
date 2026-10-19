import {
  getWhatsAppStatus,
  generatePairingCode,
  logoutWhatsApp,
  reconnectWhatsApp,
  sendMessage,
} from '../services/whatsapp.service.js';
import Settings from '../models/Settings.js';
import AuditLog from '../models/AuditLog.js';

export const getStatus = async (req, res, next) => {
  try {
    const statusData = getWhatsAppStatus();
    res.status(200).json({
      success: true,
      ...statusData,
    });
  } catch (error) {
    next(error);
  }
};

export const generateCode = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required to generate WhatsApp pairing code',
      });
    }

    // Update settings with the configured phone number
    await Settings.findOneAndUpdate({}, { phone: phoneNumber }, { upsert: true });

    const result = await generatePairingCode(phoneNumber);

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      action: 'GENERATE_WHATSAPP_CODE',
      entity: 'WhatsApp',
      entityId: phoneNumber,
      after: { phoneNumber },
    });

    res.status(200).json({
      success: true,
      message: 'Pairing code generation initiated. Code will arrive shortly via WebSocket.',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const logoutSession = async (req, res, next) => {
  try {
    const result = await logoutWhatsApp();

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      action: 'LOGOUT_WHATSAPP_SESSION',
      entity: 'WhatsApp',
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const reconnectSession = async (req, res, next) => {
  try {
    const result = await reconnectWhatsApp();
    res.status(200).json({
      success: true,
      message: 'WhatsApp reconnection initiated',
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const sendReminder = async (req, res, next) => {
  try {
    const { phone, text, customerName, loanNo, amount } = req.body;

    if (!phone || !text) {
      return res.status(400).json({
        success: false,
        message: 'Recipient phone number and message text are required',
      });
    }

    const result = await sendMessage(phone, text);

    await AuditLog.create({
      userId: req.user._id,
      userName: req.user.name,
      action: 'SEND_WHATSAPP_REMINDER',
      entity: 'WhatsApp',
      entityId: phone,
      after: { customerName, loanNo, amount },
    });

    res.status(200).json({
      success: true,
      message: 'WhatsApp message sent successfully',
      result,
    });
  } catch (error) {
    next(error);
  }
};
