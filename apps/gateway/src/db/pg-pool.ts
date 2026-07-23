import { Pool } from 'pg';

// Single shared pool for the gateway process. Neon requires SSL and works
// best with its POOLED connection string (the one with `-pooler` in the
// hostname) for app traffic like this — reserve the direct connection
// string for migrations/LISTEN-NOTIFY only (see apps/search-sync).
export const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : undefined,
  max: 10, // keep modest — Neon's pooled endpoint still caps total connections per plan
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pgPool.on('error', (err) => {
  // A dropped idle connection shouldn't crash the process — log and let
  // the pool recycle it.
  console.error('Unexpected Postgres pool error', err);
});
