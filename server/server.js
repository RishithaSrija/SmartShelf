const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const storeRoutes = require('./routes/storeRoutes');
const productRoutes = require('./routes/productRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const pricingRoutes = require('./routes/pricingRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminJobRoutes = require('./routes/adminJobRoutes');
const flashSaleRoutes = require('./routes/flashSaleRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const mlRoutes = require('./routes/mlRoutes');

const { startExpiryJob } = require('./jobs/expiryJob');
const { startReservationJob } = require('./jobs/reservationJob');

// Load environment variables
dotenv.config();

const app = express();

const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173'
];

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin/jobs', adminJobRoutes);
app.use('/api/flash-sales', flashSaleRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ml', mlRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SmartShelf API is running'
  });
});

const PORT = process.env.PORT || 5000;

// Start Server, Connect to Database & Initialize Scheduler
const startServer = async () => {
  try {
    await connectDB();

    // Start Expiry and Reservation Schedulers only after DB connection succeeds
    startExpiryJob();
    startReservationJob();

    app.listen(PORT, () => {
      console.log(`[SmartShelf API] Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('[SmartShelf API] Server startup error:', error.message);
    process.exit(1);
  }
};

startServer();
