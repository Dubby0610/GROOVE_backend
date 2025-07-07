import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';
// import { ensureTables } from './ensureTables.js';
import app from './app.js';

dotenv.config();

const MIGRATIONS_DIR = path.join(process.cwd(), 'Backend', 'migrations');

async function runMigrations() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL || "https://lyqvnzjsizpxvopqgkej.supabase.co",
    ssl: {
      rejectUnauthorized: false
    }
  });
  await client.connect();

  // Ensure migrations table exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      run_on TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // Get applied migrations
  const { rows: applied } = await client.query('SELECT name FROM _migrations');
  const appliedNames = new Set(applied.map(r => r.name));

  // Run new migrations
  const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    if (!appliedNames.has(file)) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
      console.log(`Applied migration: ${file}`);
    }
  }

  await client.end();
}

export default runMigrations;

// ensureTables().then(() => {
//   const PORT = process.env.PORT || 4000;
//   app.listen(PORT, () => {
//     console.log(`Server running on port ${PORT}`);
//   });
// }); 