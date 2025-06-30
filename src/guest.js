import express from 'express';
import { requireAuth, requireRole } from './middleware.js';
import pool from './db.js';

const router = express.Router();

// All routes require guest role
router.use(requireAuth, requireRole('guest'));

// Search listings by location
router.get('/listings', async (req, res) => {
  const { location } = req.query;
  try {
    const result = await pool.query(
      'SELECT * FROM listings WHERE location ILIKE $1',
      [`%${location || ''}%`]
    );
    res.json({ listings: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to search listings.' });
  }
});

// View listing details (with photos and availability)
router.get('/listings/:id', async (req, res) => {
  try {
    const listingRes = await pool.query('SELECT * FROM listings WHERE id = $1', [req.params.id]);
    if (listingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found.' });
    }
    const photosRes = await pool.query('SELECT * FROM listing_photos WHERE listing_id = $1', [req.params.id]);
    const availRes = await pool.query('SELECT * FROM availability WHERE listing_id = $1', [req.params.id]);
    res.json({
      listing: listingRes.rows[0],
      photos: photosRes.rows,
      availability: availRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch listing details.' });
  }
});

// Request to book
router.post('/bookings', async (req, res) => {
  const { listing_id, start_date, end_date } = req.body;
  if (!listing_id || !start_date || !end_date) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO bookings (listing_id, guest_id, start_date, end_date, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [listing_id, req.user.id, start_date, end_date, 'pending']
    );
    res.status(201).json({ booking: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to request booking.' });
  }
});

// View own booking requests
router.get('/bookings', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, l.name AS listing_name FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       WHERE b.guest_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json({ bookings: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookings.' });
  }
});

export default router; 