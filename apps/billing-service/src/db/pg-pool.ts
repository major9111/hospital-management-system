import { Pool } from 'pg';

// Same instance as the core schema for this scaffold (tables live under
// the `billing` schema), but kept as its own module so pointing this at a
// genuinely separate PCI-scoped database later is a one-line change.
// Neon requires SSL — use the POOLED connection string here.
export const billingPgPool = new Pool({
  connectionString: process.env.BILLING_DATABASE_URL ?? process.env.DATABASE_URL,
  ssl: (process.env.BILLING_DATABASE_URL ?? process.env.DATABASE_URL)?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : undefined,
  max: 10,
});
