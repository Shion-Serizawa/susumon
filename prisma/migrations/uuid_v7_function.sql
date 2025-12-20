-- UUIDv7 implementation for PostgreSQL
-- Based on RFC 9562: https://www.rfc-editor.org/rfc/rfc9562.html
--
-- UUIDv7 format (128 bits / 16 bytes):
-- - 48 bits: Unix timestamp in milliseconds
-- - 4 bits: Version (0111 = 7)
-- - 12 bits: Random data
-- - 2 bits: Variant (10)
-- - 62 bits: Random data

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

-- Add comment
COMMENT ON FUNCTION uuid_v7() IS 'Generate UUIDv7 (RFC 9562) with millisecond timestamp precision';
