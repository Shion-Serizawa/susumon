-- Create pgcrypto extension if not exists
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create uuid_v7 function
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

-- AlterTable
ALTER TABLE "learning_log_entries" ALTER COLUMN "id" SET DEFAULT uuid_v7();

-- AlterTable
ALTER TABLE "meta_notes" ALTER COLUMN "id" SET DEFAULT uuid_v7();

-- AlterTable
ALTER TABLE "themes" ALTER COLUMN "id" SET DEFAULT uuid_v7();
