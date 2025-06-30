import express from 'express';
import { requireAuth, requireRole } from './middleware.js';
import pool from './db.js';

const router = express.Router();

// All routes require admin role
router.use(requireAuth, requireRole('admin'));

// View all users
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
    res.json({ users: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// View all listings (with host info)
router.get('/listings', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.*, u.name AS host_name, u.email AS host_email
       FROM listings l
       JOIN users u ON l.host_id = u.id
       ORDER BY l.created_at DESC`
    );
    res.json({ listings: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch listings.' });
  }
});

export default router; 