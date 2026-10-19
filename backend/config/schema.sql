-- =========================================================
-- Campus App - Neon (Postgres) Schema
-- Run this once against your Neon database (see config/initDb.js)
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

-- ---------- USERS ----------
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password      TEXT NOT NULL,
  university_id TEXT NOT NULL UNIQUE,
  is_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
  trust_score   INTEGER NOT NULL DEFAULT 100,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Migration for existing databases that already had a users table without this column:
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
-- Referral program: who invited this user (nullable, self-referencing)
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);
-- Profile picture, stored as a base64 data URL (same pattern already used
-- for product/roommate images elsewhere in this app).
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;

-- ---------- OTP CODES (email verification) ----------
CREATE TABLE IF NOT EXISTS otp_codes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash    TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  attempts     INTEGER NOT NULL DEFAULT 0,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_otp_user ON otp_codes(user_id);

-- ---------- PRODUCTS ----------
CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  price       NUMERIC NOT NULL,
  category    TEXT NOT NULL,
  condition   TEXT NOT NULL,
  images      JSONB NOT NULL DEFAULT '[]'::jsonb,
  location    TEXT NOT NULL,
  contact     TEXT NOT NULL,
  is_sold     BOOLEAN NOT NULL DEFAULT FALSE,
  seller      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- LOST ITEMS ----------
CREATE TABLE IF NOT EXISTS lost_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  category          TEXT NOT NULL CHECK (category IN ('Lost','Found')),
  location          TEXT NOT NULL,
  date              TIMESTAMPTZ NOT NULL,
  image             TEXT,
  contact           TEXT NOT NULL,
  security_question TEXT,
  is_resolved       BOOLEAN NOT NULL DEFAULT FALSE,
  "user"            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- SKILLS ----------
CREATE TABLE IF NOT EXISTS skills (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user"      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  category    TEXT NOT NULL,
  location    TEXT NOT NULL,
  contact     TEXT NOT NULL,
  reviews     JSONB NOT NULL DEFAULT '[]'::jsonb,
  rating      NUMERIC NOT NULL DEFAULT 0,
  num_reviews INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- ROOMMATES ----------
CREATE TABLE IF NOT EXISTS roommates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user"      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('Need Room','Have Room')),
  location    TEXT NOT NULL,
  budget      NUMERIC NOT NULL,
  gender      TEXT NOT NULL DEFAULT 'Any Gender' CHECK (gender IN ('Any Gender','Male','Female')),
  contact     TEXT NOT NULL,
  description TEXT NOT NULL,
  tags        JSONB NOT NULL DEFAULT '[]'::jsonb,
  images      JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_closed   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- RIDES ----------
CREATE TABLE IF NOT EXISTS rides (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL DEFAULT 'offer' CHECK (type IN ('offer','request')),
  origin       TEXT NOT NULL,
  destination  TEXT NOT NULL,
  date         TIMESTAMPTZ NOT NULL,
  time         TEXT NOT NULL,
  seats        INTEGER NOT NULL,
  price        NUMERIC NOT NULL,
  vehicle      TEXT NOT NULL,
  description  TEXT,
  contact      TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  origin_lat       NUMERIC,
  origin_lng       NUMERIC,
  destination_lat  NUMERIC,
  destination_lng  NUMERIC,
  distance_km      NUMERIC,
  duration_mins    INTEGER,
  arrival_time     TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Migration for existing databases that already had a rides table:
ALTER TABLE rides ADD COLUMN IF NOT EXISTS origin_lat      NUMERIC;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS origin_lng      NUMERIC;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS destination_lat NUMERIC;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS destination_lng NUMERIC;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS distance_km     NUMERIC;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS duration_mins   INTEGER;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS arrival_time    TIMESTAMPTZ;

-- ---------- NOTIFICATIONS ----------
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user"       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  message      TEXT NOT NULL,
  reference_id UUID,
  read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- CHATS ----------
CREATE TABLE IF NOT EXISTS chats (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_name      TEXT,
  is_group_chat  BOOLEAN NOT NULL DEFAULT FALSE,
  latest_message UUID,
  group_admin    UUID REFERENCES users(id) ON DELETE SET NULL,
  context_type   TEXT,   -- 'product' | 'ride' | 'skill' | 'roommate' | null
  context_id     UUID,   -- id of the listing this chat is about
  context_title  TEXT,   -- snapshot of the listing's title, shown in the chat UI
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Migration for existing databases that already had a chats table:
ALTER TABLE chats ADD COLUMN IF NOT EXISTS context_type TEXT;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS context_id UUID;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS context_title TEXT;

-- join table for the many-to-many users<->chats relation
CREATE TABLE IF NOT EXISTS chat_users (
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (chat_id, user_id)
);

-- ---------- MESSAGES ----------
CREATE TABLE IF NOT EXISTS messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender     UUID REFERENCES users(id) ON DELETE SET NULL,
  content    TEXT,
  chat       UUID REFERENCES chats(id) ON DELETE CASCADE,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Migration for existing databases that already had a messages table:
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
-- Message type ('text' | 'location'), edit/delete support, and shared-location coords.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS location_lat NUMERIC;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS location_lng NUMERIC;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

-- Note: chats.latest_message holds a messages.id but is intentionally NOT a
-- foreign key. chats and messages reference each other circularly, and the
-- app (Chat model) maintains latest_message manually, so a DB-level FK is
-- unnecessary and would complicate single-statement initialization.

-- ---------- Migrations for existing databases ----------
-- CREATE TABLE IF NOT EXISTS above won't add columns to tables that already
-- exist, so add the status columns here. These are safe to run repeatedly.
ALTER TABLE lost_items ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE roommates  ADD COLUMN IF NOT EXISTS is_closed   BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE skills     ADD COLUMN IF NOT EXISTS is_active   BOOLEAN NOT NULL DEFAULT TRUE;

-- ---------- USER REVIEWS (profile reviews left by other users) ----------
CREATE TABLE IF NOT EXISTS user_reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (reviewer, target_user)
);
CREATE INDEX IF NOT EXISTS idx_user_reviews_target ON user_reviews(target_user);

-- ---------- RIDE BOOKINGS ----------
CREATE TABLE IF NOT EXISTS ride_bookings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride        UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  "user"      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seats       INTEGER NOT NULL DEFAULT 1,
  status      TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ride, "user")
);
CREATE INDEX IF NOT EXISTS idx_ride_bookings_ride ON ride_bookings(ride);
CREATE INDEX IF NOT EXISTS idx_ride_bookings_user ON ride_bookings("user");

-- ---------- Helpful indexes ----------
CREATE INDEX IF NOT EXISTS idx_products_seller    ON products(seller);
CREATE INDEX IF NOT EXISTS idx_rides_driver       ON rides(driver);
CREATE INDEX IF NOT EXISTS idx_skills_user        ON skills("user");
CREATE INDEX IF NOT EXISTS idx_roommates_user     ON roommates("user");
CREATE INDEX IF NOT EXISTS idx_lostitems_user     ON lost_items("user");
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications("user");
CREATE INDEX IF NOT EXISTS idx_messages_chat      ON messages(chat);
CREATE INDEX IF NOT EXISTS idx_chat_users_user    ON chat_users(user_id);
