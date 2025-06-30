import fs from 'fs';
import path from 'path';
import pool from './db.js';

async function initDb() {
  try {
    const schemaPath = path.resolve(process.cwd(), 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    await pool.query(schema);
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    await pool.end();
  }
}

initDb(); 