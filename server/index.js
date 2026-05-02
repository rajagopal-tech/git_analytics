require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const analyzeRoutes = require('./routes/analyze');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gitAnalytics';

// Startup diagnostics — printed before anything else
console.log('=== ENV CHECK ===');
console.log('MONGO_URI:', process.env.MONGO_URI ? process.env.MONGO_URI.slice(0, 30) + '...' : 'NOT SET');
console.log('PORT:', PORT);
console.log('CLIENT_URL:', process.env.CLIENT_URL || 'NOT SET');
console.log('=================');

if (!process.env.MONGO_URI) {
  console.error('FATAL: MONGO_URI is not set. Add it in Railway Variables tab.');
  process.exit(1);
}

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'https://gitanalyticsgithub.netlify.app',
  ...(process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',').map(o => o.trim())
    : [])
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api', analyzeRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.path} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// Connect to MongoDB then start server
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(`✅ MongoDB connected: ${MONGO_URI}`);
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📡 API available at http://localhost:${PORT}/api`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
