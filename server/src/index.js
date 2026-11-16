import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

import http from 'http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initCronJobs } from './cron/overdueCron.js';

// Global error handlers for resilience
process.on('unhandledRejection', (reason, promise) => {
  console.warn('⚠️ [Process] Unhandled Rejection:', reason?.message || reason);
});

process.on('uncaughtException', (err) => {
  console.error('❌ [Process] Uncaught Exception:', err?.message || err);
});

// Route imports
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import loanRoutes from './routes/loanRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import whatsappRoutes from './routes/whatsappRoutes.js';
import investmentRoutes from './routes/investmentRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import dailyClosingRoutes from './routes/dailyClosingRoutes.js';
import syncRoutes from './routes/syncRoutes.js';

// WhatsApp Service import
import { initWhatsApp, getWhatsAppStatus } from './services/whatsapp.service.js';

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Setup Socket.IO
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  // Send initial WhatsApp status immediately upon connection
  socket.emit('whatsapp:status', getWhatsAppStatus());

  socket.on('disconnect', () => {
    // Client disconnected
  });
});

// Security Middleware (allowing WebSocket connections)
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// Cross-Origin Resource Sharing (allow vk-banker.web.app and localhost)
const allowedOrigins = [
  'https://vk-banker.web.app',
  'https://vk-bankers.web.app',
  'https://vkbanker.web.app',
  'https://campas-care.web.app',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
        /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Fallback allow to avoid unexpected device blocks
    },
    credentials: true,
  })
);

// Rate Limiting (1000 requests per 15 minutes)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
});
app.use('/api', limiter);

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    ok: true,
    db: isConnected ? 'connected' : 'disconnected',
    status: isConnected ? 'online' : 'degraded',
    app: "VK Banker's & Finance API",
    whatsapp: getWhatsAppStatus().status,
    timestamp: new Date().toISOString(),
  });
});

// Root Route - Welcome Dashboard (Prevents blank screen when visiting Render service root)
app.get('/', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  const acceptsHtml = req.headers.accept && req.headers.accept.includes('text/html');

  if (!acceptsHtml) {
    return res.status(200).json({
      name: "VK Banker's & Finance Backend API",
      status: 'online',
      db: isConnected ? 'connected' : 'disconnected',
      health: '/api/health',
      frontend: 'https://vk-banker.web.app',
      timestamp: new Date().toISOString(),
    });
  }

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VK Banker's & Finance - Backend Server</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: radial-gradient(circle at top left, #0c4a6e 0%, #082f49 50%, #030712 100%);
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(56, 189, 248, 0.25);
      border-radius: 28px;
      padding: 40px;
      max-width: 560px;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(2, 132, 199, 0.25);
      text-align: center;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 16px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
      margin-bottom: 24px;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 12px #10b981;
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }
    h1 {
      font-size: 26px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
    }
    p.tamil {
      font-size: 14px;
      color: #38bdf8;
      font-weight: 600;
      margin-bottom: 20px;
    }
    p.desc {
      font-size: 13.5px;
      color: #94a3b8;
      line-height: 1.6;
      margin-bottom: 32px;
    }
    .status-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 32px;
      text-align: left;
    }
    .status-item {
      background: rgba(30, 41, 59, 0.7);
      border: 1px solid rgba(56, 189, 248, 0.15);
      border-radius: 16px;
      padding: 14px;
    }
    .status-label {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 4px;
    }
    .status-val {
      font-size: 13px;
      font-weight: 700;
      color: #e2e8f0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px 24px;
      border-radius: 16px;
      background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
      color: #ffffff;
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
      box-shadow: 0 10px 20px -5px rgba(2, 132, 199, 0.4);
      transition: all 0.2s ease;
    }
    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 14px 25px -5px rgba(2, 132, 199, 0.5);
    }
    .btn-secondary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 24px;
      border-radius: 16px;
      background: rgba(30, 41, 59, 0.8);
      color: #38bdf8;
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      border: 1px solid rgba(56, 189, 248, 0.2);
      transition: all 0.2s ease;
    }
    .btn-secondary:hover {
      background: rgba(30, 41, 59, 1);
      border-color: rgba(56, 189, 248, 0.4);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">
      <span class="dot"></span>
      RENDER WEB SERVICE ONLINE
    </div>
    <h1>VK BANKER'S & FINANCE</h1>
    <p class="tamil">தவணை நிதி மேலாண்மை - Cloud API Gateway</p>
    <p class="desc">
      The backend service and MongoDB Atlas connection are operating smoothly.
      To access the microfinance management application, please proceed to the official web client.
    </p>
    <div class="status-grid">
      <div class="status-item">
        <div class="status-label">Database</div>
        <div class="status-val">
          <span style="color: ${isConnected ? '#34d399' : '#f87171'}">●</span>
          ${isConnected ? 'MongoDB Atlas' : 'Disconnected'}
        </div>
      </div>
      <div class="status-item">
        <div class="status-label">API Status</div>
        <div class="status-val">
          <span style="color: #34d399">●</span>
          Healthy (v3.5.1)
        </div>
      </div>
    </div>
    <div class="actions">
      <a href="https://vk-banker.web.app" class="btn-primary" target="_blank" rel="noopener">
        Open FinTrack Web Application ➔
      </a>
      <a href="/api/health" class="btn-secondary">
        View JSON Health Check (/api/health)
      </a>
    </div>
  </div>
</body>
</html>`);
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dailyClosings', dailyClosingRoutes);
app.use('/api/daily-closings', dailyClosingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/expenses', expenseRoutes);

// Fallback for unknown routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API Route not found: ${req.originalUrl}`,
  });
});

// Centralized Error Handling
app.use(errorHandler);

// Start Server, Database, and WhatsApp Service
const startServer = async () => {
  try {
    await connectDB();

    // Ensure default settings exist if clean database
    const settingsCount = await (await import('./models/Settings.js')).default.countDocuments();
    if (settingsCount === 0) {
      const Settings = (await import('./models/Settings.js')).default;
      await Settings.create({
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
      console.log('🏢 Initialized default business settings (clean database, zero dump data).');
    }

    // Start background cron jobs
    initCronJobs();

    // Start HTTP & WebSocket Server
    httpServer.listen(PORT, () => {
      console.log(`🚀 FinTrack Server with Socket.io running on port http://localhost:${PORT}`);
      console.log(`🌐 API Health available at http://localhost:${PORT}/api/health`);

      // Initialize WhatsApp client with Socket.io instance
      const defaultNumber = process.env.WHATSAPP_NUMBER || '919842112345';
      console.log(`📱 FinTrack WhatsApp service configured for default number: +${defaultNumber}`);
      if (process.env.ENABLE_WHATSAPP === 'true') initWhatsApp(io, defaultNumber).catch((err) => {
        console.warn('WhatsApp background initialization note:', err.message);
      });
    });
  } catch (error) {
    console.error('❌ Failed to start FinTrack server:', error.message);
    process.exit(1);
  }
};

startServer();
