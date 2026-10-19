import http from 'http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initCronJobs } from './cron/overdueCron.js';
import Customer from './models/Customer.js';
import seedData from './seed.js';

// Global error handlers for resilience
process.on('unhandledRejection', (reason, promise) => {
  console.warn('⚠️ [Process] Unhandled Rejection:', reason?.message || reason);
});

process.on('uncaughtException', (err) => {
  console.error('❌ [Process] Uncaught Exception:', err?.message || err);
});

// Route imports
import authRoutes from './routes/authRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import loanRoutes from './routes/loanRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import whatsappRoutes from './routes/whatsappRoutes.js';
import investmentRoutes from './routes/investmentRoutes.js';

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

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: '*',
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
  res.status(200).json({
    status: 'online',
    app: 'FinTrack API',
    whatsapp: getWhatsAppStatus().status,
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/investments', investmentRoutes);

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

    // Check if database needs initial seeding
    const customerCount = await Customer.countDocuments();
    if (customerCount === 0) {
      console.log('ℹ️ Database is empty. Running automatic initial seed...');
      await seedData(false);
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
      initWhatsApp(io, defaultNumber).catch((err) => {
        console.warn('WhatsApp background initialization note:', err.message);
      });
    });
  } catch (error) {
    console.error('❌ Failed to start FinTrack server:', error.message);
    process.exit(1);
  }
};

startServer();
