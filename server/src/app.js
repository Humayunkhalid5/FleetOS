require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const companyRoutes = require('./routes/companyRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const trackingRoutes = require('./routes/trackingRoutes');
const chatRoutes = require('./routes/chatRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.send('FleetOS server is running');
});

app.use('/api', authRoutes);
app.use('/api', companyRoutes);
app.use('/api', bookingRoutes);
app.use('/api', reviewRoutes);
app.use('/api', trackingRoutes);
app.use('/api', chatRoutes);
app.use('/api', assignmentRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

module.exports = app;

