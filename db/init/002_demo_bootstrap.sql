-- This file runs only when PostgreSQL initializes an empty data volume.
-- The Node seed service completes the pending entry in its data transaction.
-- Existing volumes have no pending entry and must not be seeded automatically.
CREATE TABLE portal_bootstrap_seeds (
  seed_key TEXT PRIMARY KEY,
  completed_at TIMESTAMPTZ
);

INSERT INTO portal_bootstrap_seeds (seed_key) VALUES ('nhan-demo-v1');
