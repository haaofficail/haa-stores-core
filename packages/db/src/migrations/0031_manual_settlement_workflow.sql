ALTER TABLE payout_requests
  ALTER COLUMN status SET DEFAULT 'requested',
  ADD COLUMN IF NOT EXISTS requested_by_user_id integer REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS reviewed_by_user_id integer REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_by_user_id integer REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS transferred_by_user_id integer REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS verified_by_user_id integer REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS rejected_by_user_id integer REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS public_notes text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamp,
  ADD COLUMN IF NOT EXISTS approved_at timestamp,
  ADD COLUMN IF NOT EXISTS transferred_at timestamp,
  ADD COLUMN IF NOT EXISTS verified_at timestamp;

CREATE TABLE IF NOT EXISTS payout_transfer_proofs (
  id serial PRIMARY KEY,
  payout_request_id integer NOT NULL REFERENCES payout_requests(id),
  bank_reference varchar(120) NOT NULL,
  bank_name varchar(100) NOT NULL,
  amount decimal(14, 2) NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'SAR',
  transferred_at timestamp NOT NULL,
  transferred_by_user_id integer NOT NULL REFERENCES users(id),
  beneficiary_name varchar(255) NOT NULL,
  beneficiary_iban_masked varchar(40) NOT NULL,
  proof_file_key varchar(500),
  notes text,
  verification_status varchar(30) NOT NULL DEFAULT 'pending',
  verified_by_user_id integer REFERENCES users(id),
  verified_at timestamp,
  rejection_reason text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payout_events (
  id serial PRIMARY KEY,
  payout_request_id integer NOT NULL REFERENCES payout_requests(id),
  store_id integer NOT NULL REFERENCES stores(id),
  actor_user_id integer REFERENCES users(id),
  actor_role varchar(80),
  event_type varchar(80) NOT NULL,
  from_status varchar(30),
  to_status varchar(30),
  amount decimal(14, 2),
  reason text,
  metadata jsonb,
  ip_address varchar(50),
  user_agent text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payout_transfer_proofs_payout_idx ON payout_transfer_proofs(payout_request_id);
CREATE INDEX IF NOT EXISTS payout_events_payout_created_at_idx ON payout_events(payout_request_id, created_at);
CREATE INDEX IF NOT EXISTS payout_events_store_created_at_idx ON payout_events(store_id, created_at);
