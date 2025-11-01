require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const connectDB = require('./src/config/db');

const authRoutes = require('./src/routes/auth.routes');
const clientRoutes = require('./src/routes/client.routes');
const availabilityRoutes = require('./src/routes/availability.routes');
const appointmentRoutes = require('./src/routes/appointment.routes');
const paymentRoutes = require('./src/routes/payment.routes');

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

connectDB();

app.get('/', (_, res) => res.json({ ok: true, service: 'Fisio Clinic API' }));

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/payments', paymentRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Fisio Clinic API running on http://localhost:${PORT}`));
