CREATE TABLE IF NOT EXISTS claims (
  id UUID PRIMARY KEY,
  claim_number TEXT UNIQUE NOT NULL,
  policy_number TEXT,
  carrier TEXT,
  peril TEXT,
  insured_name TEXT,
  insured_phone TEXT,
  insured_email TEXT,
  insured_language TEXT,
  loss_address TEXT,
  loss_lat DOUBLE PRECISION,
  loss_lng DOUBLE PRECISION,
  sla_due TIMESTAMPTZ,
  adjuster_id UUID NOT NULL,
  stage TEXT NOT NULL DEFAULT 'Intake',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY,
  claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
  start_ts TIMESTAMPTZ NOT NULL,
  end_ts TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  channel TEXT,
  message_id TEXT,
  notes TEXT,
  idempotency_key TEXT UNIQUE,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY,
  claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  direction TEXT NOT NULL,
  provider_id TEXT,
  template_key TEXT,
  body_preview TEXT,
  language TEXT,
  consent_state TEXT,
  user_id UUID,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ DEFAULT now(),
  user_id TEXT,
  device_id TEXT,
  claim_number TEXT,
  action TEXT,
  channel TEXT,
  payload_hash TEXT,
  result TEXT
);

CREATE TABLE IF NOT EXISTS consents (
  id UUID PRIMARY KEY,
  claim_id UUID,
  phone TEXT,
  email TEXT,
  sms_opt_in BOOLEAN,
  email_opt_in BOOLEAN,
  last_command TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comm_claim_ts ON communications (claim_id, timestamp DESC);
