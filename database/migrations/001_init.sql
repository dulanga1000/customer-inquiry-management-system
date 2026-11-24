CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         CITEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT UNIQUE NOT NULL,
  family_id   UUID NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inquiries (
  id            SERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL CHECK (char_length(customer_name) BETWEEN 2 AND 100),
  contact       TEXT NOT NULL,
  subject       TEXT NOT NULL CHECK (char_length(subject) BETWEEN 3 AND 150),
  description   TEXT NOT NULL CHECK (char_length(description) BETWEEN 10 AND 2000),
  status        TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved')),
  created_by    INT NOT NULL REFERENCES users(id),
  assigned_to   INT REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS status_history (
  id          SERIAL PRIMARY KEY,
  inquiry_id  INT NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  to_status   TEXT NOT NULL,
  changed_by  INT NOT NULL REFERENCES users(id),
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user   ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens (family_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status      ON inquiries (status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_by  ON inquiries (created_by);
CREATE INDEX IF NOT EXISTS idx_inquiries_assigned    ON inquiries (assigned_to);
CREATE INDEX IF NOT EXISTS idx_inquiries_updated     ON inquiries (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_inquiry       ON status_history (inquiry_id);
