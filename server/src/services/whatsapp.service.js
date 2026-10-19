import path from 'path';
import fs from 'fs';
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;

let client = null;
let io = null;
let status = 'not_linked'; // 'not_linked' | 'waiting_code' | 'connected'
let currentPairingCode = null;
let codeExpiresAt = null;
let currentPhoneNumber = process.env.WHATSAPP_NUMBER || '919842112345';
let isInitializing = false;

// Auto-detect system Chrome/Edge executable on Windows if available
const getSystemChromePath = () => {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return undefined;
};

const sanitizePhone = (phone) => {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  // If 10 digits (typical Indian mobile), prepend 91
  if (cleaned.length === 10) {
    cleaned = `91${cleaned}`;
  }
  return cleaned;
};

export const getWhatsAppStatus = () => {
  return {
    status,
    phoneNumber: currentPhoneNumber,
    pairingCode: currentPairingCode,
    expiresAt: codeExpiresAt,
  };
};

export const initWhatsApp = async (socketIo, phoneNumberOverride = null) => {
  if (socketIo) {
    io = socketIo;
  }

  if (phoneNumberOverride) {
    currentPhoneNumber = sanitizePhone(phoneNumberOverride);
  } else if (!currentPhoneNumber) {
    currentPhoneNumber = sanitizePhone(process.env.WHATSAPP_NUMBER || '919842112345');
  }

  // If already connected or initializing, avoid duplicate client instances
  if (status === 'connected' && client) {
    console.log('WhatsApp client is already connected.');
    return { status, phoneNumber: currentPhoneNumber };
  }

  if (isInitializing) {
    console.log('WhatsApp initialization already in progress...');
    return { status, phoneNumber: currentPhoneNumber };
  }

  isInitializing = true;
  status = 'waiting_code';

  const authDir = path.resolve(process.cwd(), '.wwebjs_auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  try {
    if (client) {
      try {
        await client.destroy();
      } catch (destroyErr) {
        console.warn('Existing client cleanup warning:', destroyErr.message);
      }
      client = null;
      // Allow browser and filesystem handles to close cleanly
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    const chromePath = getSystemChromePath();
    console.log(`📱 Initializing WhatsApp Web with pairing code for phone: +${currentPhoneNumber}...`);
    if (chromePath) {
      console.log(`🌐 Using browser binary: ${chromePath}`);
    }

    client = new Client({
      authStrategy: new LocalAuth({
        dataPath: authDir,
      }),
      pairWithPhoneNumber: {
        phoneNumber: currentPhoneNumber,
        showNotification: true,
        intervalMs: 180000,
      },
      puppeteer: {
        headless: true,
        executablePath: chromePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      },
    });

    // Defensively wrap requestPairingCode so unhandled evaluation errors inside whatsapp-web.js
    // never trigger an unhandled rejection in the Node process
    const originalRequestPairingCode = client.requestPairingCode?.bind(client);
    if (originalRequestPairingCode) {
      client.requestPairingCode = async (...args) => {
        try {
          return await originalRequestPairingCode(...args);
        } catch (err) {
          console.warn('⚠️ WhatsApp pairing code evaluation warning:', err?.message || err);
          return null;
        }
      };
    }

    // CRITICAL: NO QR Code generated or shown anywhere.
    // Suppress QR event completely.
    client.on('qr', () => {
      // Intentionally empty. No QR code is displayed or processed.
    });

    // Listen to pairing code event
    client.on('code', (code) => {
      console.log('\n==================================================');
      console.log(`🔑 WHATSAPP PAIRING CODE: ${code}`);
      console.log(`📱 Phone Number: +${currentPhoneNumber}`);
      console.log('==================================================\n');

      currentPairingCode = code;
      codeExpiresAt = Date.now() + 180000;
      status = 'waiting_code';

      if (io) {
        io.emit('whatsapp:code', {
          code,
          expiresAt: codeExpiresAt,
          phoneNumber: currentPhoneNumber,
        });
        io.emit('whatsapp:status', {
          status,
          phoneNumber: currentPhoneNumber,
          pairingCode: code,
          expiresAt: codeExpiresAt,
        });
      }
    });

    client.on('authenticated', () => {
      console.log('✅ WhatsApp authenticated successfully via pairing code!');
      status = 'authenticated';
      currentPairingCode = null;
      if (io) {
        io.emit('whatsapp:status', {
          status: 'connected',
          phoneNumber: currentPhoneNumber,
        });
      }
    });

    client.on('ready', () => {
      console.log('🚀 WhatsApp Client is Ready & Connected to WhatsApp Web!');
      status = 'connected';
      currentPairingCode = null;
      if (io) {
        io.emit('whatsapp:status', {
          status: 'connected',
          phoneNumber: currentPhoneNumber,
        });
      }
    });

    client.on('auth_failure', (err) => {
      console.error('❌ WhatsApp authentication failed:', err);
      status = 'not_linked';
      currentPairingCode = null;
      if (io) {
        io.emit('whatsapp:status', {
          status,
          phoneNumber: currentPhoneNumber,
          error: err.message || 'Authentication failed',
        });
      }
    });

    client.on('disconnected', (reason) => {
      console.warn('⚠️ WhatsApp client disconnected:', reason);
      status = 'not_linked';
      currentPairingCode = null;
      if (io) {
        io.emit('whatsapp:status', {
          status,
          phoneNumber: currentPhoneNumber,
        });
      }
    });

    // Start client
    client.initialize().catch((initErr) => {
      console.error('❌ Failed to initialize WhatsApp client:', initErr.message);
      status = 'not_linked';
      if (io) {
        io.emit('whatsapp:status', {
          status,
          phoneNumber: currentPhoneNumber,
          error: initErr.message,
        });
      }
    });

    return {
      status,
      phoneNumber: currentPhoneNumber,
    };
  } catch (error) {
    console.error('❌ WhatsApp setup error:', error.message);
    status = 'not_linked';
    throw error;
  } finally {
    isInitializing = false;
  }
};

export const generatePairingCode = async (phoneNumber) => {
  const sanitized = sanitizePhone(phoneNumber);
  if (!sanitized || sanitized.length < 10) {
    throw new Error('Valid WhatsApp phone number with country code is required (e.g. 919842112345)');
  }
  currentPhoneNumber = sanitized;

  // If client is already open and on the unauthenticated page, try requesting pairing code directly
  if (client && client.pupPage && status === 'waiting_code' && !isInitializing) {
    try {
      console.log(`📱 Requesting new pairing code on active WhatsApp Web page for +${sanitized}...`);
      await client.requestPairingCode(sanitized, true, 180000);
      return { status, phoneNumber: currentPhoneNumber };
    } catch (err) {
      console.warn('Direct pairing request note:', err?.message || err);
    }
  }

  // If previous initialization is still settling, wait briefly
  if (isInitializing) {
    await new Promise((res) => setTimeout(res, 1200));
  }

  return initWhatsApp(io, sanitized);
};

export const logoutWhatsApp = async () => {
  try {
    if (client) {
      await client.logout();
      await client.destroy();
      client = null;
    }
  } catch (err) {
    console.warn('WhatsApp logout error:', err.message);
  }

  // Remove local auth session directory
  const authDir = path.resolve(process.cwd(), '.wwebjs_auth');
  if (fs.existsSync(authDir)) {
    try {
      fs.rmSync(authDir, { recursive: true, force: true });
    } catch (rmErr) {
      console.warn('Could not remove auth directory:', rmErr.message);
    }
  }

  status = 'not_linked';
  currentPairingCode = null;
  codeExpiresAt = null;

  if (io) {
    io.emit('whatsapp:status', {
      status: 'not_linked',
      phoneNumber: currentPhoneNumber,
    });
  }

  return { success: true, message: 'WhatsApp session logged out' };
};

export const reconnectWhatsApp = async () => {
  return initWhatsApp(io, currentPhoneNumber);
};

/**
 * Keep all sending behind sendMessage(phone, text) so the provider can be swapped later.
 */
export const sendMessage = async (phone, text) => {
  const sanitized = sanitizePhone(phone);
  if (!sanitized) {
    throw new Error('Invalid phone number for WhatsApp message');
  }

  const jid = `${sanitized}@c.us`;

  if (!client || status !== 'connected') {
    throw new Error('WhatsApp client is not connected. Please connect from the WhatsApp Connect admin page.');
  }

  try {
    console.log(`📤 Sending WhatsApp message to ${jid}...`);
    const sentMsg = await client.sendMessage(jid, text);
    console.log(`✅ WhatsApp message sent successfully: ${sentMsg.id._serialized}`);
    return {
      success: true,
      messageId: sentMsg.id._serialized,
      timestamp: sentMsg.timestamp,
    };
  } catch (err) {
    console.error(`❌ Failed to send WhatsApp message to ${jid}:`, err.message);
    throw err;
  }
};

export default {
  initWhatsApp,
  getWhatsAppStatus,
  generatePairingCode,
  logoutWhatsApp,
  reconnectWhatsApp,
  sendMessage,
};
