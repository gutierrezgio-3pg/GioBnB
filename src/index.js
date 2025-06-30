import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db.js';
import authRouter from './auth.js';
import hostRouter from './host.js';
import guestRouter from './guest.js';
import adminRouter from './admin.js';
import path from 'path';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/host', hostRouter);
app.use('/api/guest', guestRouter);
app.use('/api/admin', adminRouter);

app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
}); 