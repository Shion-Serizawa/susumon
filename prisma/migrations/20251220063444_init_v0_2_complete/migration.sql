-- Enable pgcrypto extension for gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create uuid_v7 function (RFC 9562 compliant)
CREATE OR REPLACE FUNCTION uuid_v7()
RETURNS uuid
AS $$
DECLARE
  unix_ts_ms bytea;
  uuid_bytes bytea;
BEGIN
  -- Get current Unix timestamp in milliseconds (48 bits / 6 bytes)
  unix_ts_ms := substring(int8send((extract(epoch from clock_timestamp()) * 1000)::bigint) from 3 for 6);

  -- Construct UUIDv7 bytes (16 bytes total):
  uuid_bytes :=
    -- 48 bits (6 bytes): timestamp
    unix_ts_ms ||
    -- 16 bits (2 bytes): version (4 bits = 7) + random (12 bits)
    set_byte(
      gen_random_bytes(2),
      0,
      (get_byte(gen_random_bytes(1), 0) & 15) | 112  -- 0111xxxx (version 7)
    ) ||
    -- 64 bits (8 bytes): variant (2 bits = 10) + random (62 bits)
    set_byte(
      gen_random_bytes(8),
      0,
      (get_byte(gen_random_bytes(1), 0) & 63) | 128  -- 10xxxxxx (variant 2)
    );

  RETURN encode(uuid_bytes, 'hex')::uuid;
END;
$$ LANGUAGE plpgsql VOLATILE;

COMMENT ON FUNCTION uuid_v7() IS 'Generate UUIDv7 (RFC 9562) with millisecond timestamp precision';

-- CreateEnum
CREATE TYPE "ResourceState" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');

-- CreateTable
CREATE TABLE "themes" (
    "id" UUID NOT NULL DEFAULT uuid_v7(),
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "goal" TEXT NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "state" "ResourceState" NOT NULL DEFAULT 'ACTIVE',
    "state_changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_log_entries" (
    "id" UUID NOT NULL DEFAULT uuid_v7(),
    "user_id" UUID NOT NULL,
    "theme_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "summary" TEXT NOT NULL,
    "details" TEXT,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "state" "ResourceState" NOT NULL DEFAULT 'ACTIVE',
    "state_changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "learning_log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_notes" (
    "id" UUID NOT NULL DEFAULT uuid_v7(),
    "user_id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "related_log_id" UUID,
    "note_date" DATE NOT NULL,
    "state" "ResourceState" NOT NULL DEFAULT 'ACTIVE',
    "state_changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "meta_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meta_note_themes" (
    "meta_note_id" UUID NOT NULL,
    "theme_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meta_note_themes_pkey" PRIMARY KEY ("meta_note_id","theme_id")
);

-- CreateIndex
CREATE INDEX "idx_themes_user_completed" ON "themes"("user_id", "is_completed");

-- CreateIndex
CREATE INDEX "idx_themes_user_state" ON "themes"("user_id", "state");

-- CreateIndex
CREATE INDEX "idx_logs_user_date" ON "learning_log_entries"("user_id", "date");

-- CreateIndex
CREATE INDEX "idx_logs_user_theme_date" ON "learning_log_entries"("user_id", "theme_id", "date");

-- CreateIndex
CREATE INDEX "idx_logs_user_state" ON "learning_log_entries"("user_id", "state");

-- CreateIndex
CREATE INDEX "gin_logs_tags" ON "learning_log_entries" USING GIN ("tags");

-- CreateIndex
CREATE UNIQUE INDEX "learning_log_entries_user_id_theme_id_date_key" ON "learning_log_entries"("user_id", "theme_id", "date");

-- CreateIndex
CREATE INDEX "idx_notes_user_date" ON "meta_notes"("user_id", "note_date");

-- CreateIndex
CREATE INDEX "idx_notes_user_category_date" ON "meta_notes"("user_id", "category", "note_date");

-- CreateIndex
CREATE INDEX "idx_notes_user_state" ON "meta_notes"("user_id", "state");

-- CreateIndex
CREATE INDEX "idx_meta_note_themes_theme_id" ON "meta_note_themes"("theme_id");

-- AddForeignKey
ALTER TABLE "learning_log_entries" ADD CONSTRAINT "learning_log_entries_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "themes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_notes" ADD CONSTRAINT "meta_notes_related_log_id_fkey" FOREIGN KEY ("related_log_id") REFERENCES "learning_log_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_note_themes" ADD CONSTRAINT "meta_note_themes_meta_note_id_fkey" FOREIGN KEY ("meta_note_id") REFERENCES "meta_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meta_note_themes" ADD CONSTRAINT "meta_note_themes_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "themes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add CHECK constraint for category
ALTER TABLE "meta_notes" ADD CONSTRAINT "chk_meta_category" CHECK (category IN ('INSIGHT', 'QUESTION', 'EMOTION'));
