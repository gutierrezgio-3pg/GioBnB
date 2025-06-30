import pool from './db.js';

async function seedDb() {
  try {
    // Insert sample users
    const users = [
      ['Alice Host', 'alice@host.com', '$2b$10$hosthash', 'host'],
      ['Bob Guest', 'bob@guest.com', '$2b$10$guesthash', 'guest'],
      ['Admin', 'admin@giobnb.com', '$2b$10$adminhash', 'admin'],
    ];
    for (const [name, email, password_hash, role] of users) {
      await pool.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING',
        [name, email, password_hash, role]
      );
    }

    // Insert a sample listing for Alice
    const hostRes = await pool.query('SELECT id FROM users WHERE email = $1', ['alice@host.com']);
    const hostId = hostRes.rows[0].id;
    const listingRes = await pool.query(
      'INSERT INTO listings (host_id, name, description, location, price_per_night) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [hostId, 'Cozy Apartment', 'A nice place to stay', 'New York', 120.00]
    );
    const listingId = listingRes.rows[0].id;

    // Insert a photo for the listing
    await pool.query(
      'INSERT INTO listing_photos (listing_id, url, alt_text) VALUES ($1, $2, $3)',
      [listingId, '/uploads/sample1.jpg', 'Living room']
    );

    // Insert availability for the listing
    await pool.query(
      'INSERT INTO availability (listing_id, date, is_available) VALUES ($1, $2, $3)',
      [listingId, '2024-07-01', true]
    );
    await pool.query(
      'INSERT INTO availability (listing_id, date, is_available) VALUES ($1, $2, $3)',
      [listingId, '2024-07-02', true]
    );

    // Insert a booking by Bob
    const guestRes = await pool.query('SELECT id FROM users WHERE email = $1', ['bob@guest.com']);
    const guestId = guestRes.rows[0].id;
    await pool.query(
      'INSERT INTO bookings (listing_id, guest_id, start_date, end_date, status) VALUES ($1, $2, $3, $4, $5)',
      [listingId, guestId, '2024-07-01', '2024-07-02', 'pending']
    );

    console.log('Database seeded with sample data.');
  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    await pool.end();
  }
}

seedDb(); 