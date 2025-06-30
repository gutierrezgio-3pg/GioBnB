import express from 'express';
import { requireAuth, requireRole } from './middleware.js';
import pool from './db.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// All routes require host role
router.use(requireAuth, requireRole('host'));

// Multer setup for uploads/
const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({ storage, limits: { files: 3 } });

// Create a new listing
router.post('/listings', async (req, res) => {
  const { name, description, location, price_per_night } = req.body;
  if (!name || !description || !location || !price_per_night) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO listings (host_id, name, description, location, price_per_night) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, name, description, location, price_per_night]
    );
    res.status(201).json({ listing: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create listing.' });
  }
});

// View own listings
router.get('/listings', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM listings WHERE host_id = $1',
      [req.user.id]
    );
    res.json({ listings: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch listings.' });
  }
});

// View booking requests for own listings
router.get('/bookings', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, l.name AS listing_name FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       WHERE l.host_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json({ bookings: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch booking requests.' });
  }
});

// Approve a booking request
router.post('/bookings/:id/approve', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE bookings SET status = 'approved'
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found or not pending.' });
    }
    res.json({ booking: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve booking.' });
  }
});

// Decline a booking request
router.post('/bookings/:id/decline', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE bookings SET status = 'declined'
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Booking not found or not pending.' });
    }
    res.json({ booking: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to decline booking.' });
  }
});

// View availability for a listing
router.get('/listings/:id/availability', async (req, res) => {
  const listingId = req.params.id;
  try {
    // Check ownership
    const listingRes = await pool.query('SELECT * FROM listings WHERE id = $1 AND host_id = $2', [listingId, req.user.id]);
    if (listingRes.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized for this listing.' });
    }
    const availRes = await pool.query('SELECT * FROM availability WHERE listing_id = $1 ORDER BY date', [listingId]);
    res.json({ availability: availRes.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch availability.' });
  }
});

// Set availability for a listing (block/unblock dates)
router.post('/listings/:id/availability', async (req, res) => {
  const listingId = req.params.id;
  const { date, is_available } = req.body;
  if (!date || typeof is_available !== 'boolean') {
    return res.status(400).json({ error: 'date and is_available are required.' });
  }
  try {
    // Check ownership
    const listingRes = await pool.query('SELECT * FROM listings WHERE id = $1 AND host_id = $2', [listingId, req.user.id]);
    if (listingRes.rows.length === 0) {
      return res.status(403).json({ error: 'Not authorized for this listing.' });
    }
    // Upsert availability
    const result = await pool.query(
      `INSERT INTO availability (listing_id, date, is_available)
       VALUES ($1, $2, $3)
       ON CONFLICT (listing_id, date) DO UPDATE SET is_available = $3
       RETURNING *`,
      [listingId, date, is_available]
    );
    res.status(201).json({ availability: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to set availability.' });
  }
});

export default router; 