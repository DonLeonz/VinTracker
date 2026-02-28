import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import vinRoutes from './routes/vinRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Routes
app.use('/api/vins', vinRoutes);

// Health check with database connection status
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const { default: pool } = await import('./db/config.js');
    await pool.query('SELECT 1');

    res.json({
      status: 'OK',
      message: 'VIN Tracker API is running',
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      message: 'VIN Tracker API is running but database is disconnected',
      database: 'disconnected',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
});
