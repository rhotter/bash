-- Registration system foundation (PRD §2.3)
-- Idempotent: safe to run multiple times.
-- Apply once before deploying registration code.

BEGIN;

-- ─── Auth: NextAuth Drizzle adapter shape ───────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  name text,
  email text NOT NULL UNIQUE,
  email_verified timestamp with time zone,
  image text,
  password_hash text,
  player_id integer REFERENCES players(id),
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  provider text NOT NULL,
  provider_account_id text NOT NULL,
  refresh_token text,
  access_token text,
  expires_at integer,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  PRIMARY KEY (provider, provider_account_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  session_token text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires timestamp with time zone NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier text NOT NULL,
  token text NOT NULL,
  expires timestamp with time zone NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- ─── Registration periods ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS registration_periods (
  id text PRIMARY KEY,
  season_id text NOT NULL REFERENCES seasons(id),
  status text NOT NULL DEFAULT 'draft',
  date_open timestamp with time zone,
  date_close timestamp with time zone,
  base_fee integer NOT NULL DEFAULT 0,
  max_players integer,
  age_minimum integer,
  age_as_of_date text,
  earlybird_deadline timestamp with time zone,
  earlybird_discount integer DEFAULT 0,
  late_fee_date timestamp with time zone,
  late_fee_amount integer DEFAULT 0,
  requires_emergency_info boolean NOT NULL DEFAULT true,
  requires_jersey_size boolean NOT NULL DEFAULT false,
  confirmation_email_body text,
  admin_notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- ─── Custom questions ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS registration_questions (
  id serial PRIMARY KEY,
  period_id text NOT NULL REFERENCES registration_periods(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'text',
  options jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_registration_questions_period ON registration_questions(period_id);

-- ─── Legal notices ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS legal_notices (
  id serial PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL,
  ack_type text NOT NULL DEFAULT 'basic',
  version integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS registration_period_notices (
  period_id text NOT NULL REFERENCES registration_periods(id) ON DELETE CASCADE,
  notice_id integer NOT NULL REFERENCES legal_notices(id),
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (period_id, notice_id)
);

-- ─── Registrations (no is_rookie — derived) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS registrations (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id),
  period_id text NOT NULL REFERENCES registration_periods(id),
  status text NOT NULL DEFAULT 'draft',
  registration_type text NOT NULL DEFAULT 'individual',
  team_slug text REFERENCES teams(slug),
  phone text,
  address text,
  birthdate text,
  gender text,
  tshirt_size text,
  emergency_name text,
  emergency_phone text,
  health_plan text,
  health_plan_id text,
  doctor_name text,
  doctor_phone text,
  medical_notes text,
  years_played integer,
  skill_level text,
  positions text,
  last_league text,
  last_team text,
  misc_notes text,
  amount_paid integer,
  discount_code_id integer,
  stripe_session_id text,
  paid_at timestamp with time zone,
  manual_payment boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_registrations_user ON registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_registrations_period ON registrations(period_id);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'registrations_user_id_period_id_unique'
  ) THEN
    ALTER TABLE registrations
      ADD CONSTRAINT registrations_user_id_period_id_unique UNIQUE (user_id, period_id);
  END IF;
END $$;

-- ─── Custom answers ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS registration_answers (
  registration_id text NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  question_id integer NOT NULL REFERENCES registration_questions(id),
  answer text,
  PRIMARY KEY (registration_id, question_id)
);

-- ─── Notice acknowledgements ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notice_acknowledgements (
  id serial PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id),
  notice_id integer NOT NULL REFERENCES legal_notices(id),
  notice_version integer NOT NULL,
  registration_id text REFERENCES registrations(id),
  acknowledged_at timestamp with time zone DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notice_ack_user ON notice_acknowledgements(user_id);

-- ─── Discount codes ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS discount_codes (
  id serial PRIMARY KEY,
  code text NOT NULL UNIQUE,
  reason text,
  amount_off integer NOT NULL,
  limitation text NOT NULL DEFAULT 'unlimited',
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS registration_period_discounts (
  period_id text NOT NULL REFERENCES registration_periods(id) ON DELETE CASCADE,
  discount_id integer NOT NULL REFERENCES discount_codes(id),
  PRIMARY KEY (period_id, discount_id)
);

-- ─── Extras ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS extras (
  id serial PRIMARY KEY,
  name text NOT NULL,
  description text,
  price integer NOT NULL DEFAULT 0,
  detail_type text,
  detail_label text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS registration_period_extras (
  period_id text NOT NULL REFERENCES registration_periods(id) ON DELETE CASCADE,
  extra_id integer NOT NULL REFERENCES extras(id),
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (period_id, extra_id)
);

CREATE TABLE IF NOT EXISTS registration_extras (
  registration_id text NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  extra_id integer NOT NULL REFERENCES extras(id),
  detail text,
  PRIMARY KEY (registration_id, extra_id)
);

COMMIT;
