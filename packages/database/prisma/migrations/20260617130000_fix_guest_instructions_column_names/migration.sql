-- Fix column names when the initial migration used snake_case identifiers.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'guest_instructions'
  ) THEN
    ALTER TABLE "properties" RENAME COLUMN "guest_instructions" TO "guestInstructions";
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'guest_instructions_sent_at'
  ) THEN
    ALTER TABLE "bookings" RENAME COLUMN "guest_instructions_sent_at" TO "guestInstructionsSentAt";
  END IF;
END $$;
